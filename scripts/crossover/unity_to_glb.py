#!/usr/bin/env python3
"""Export one Unity character prefab (skinned meshes, textures, one idle clip) to a GLB.

Works on both corpora measured so far:
  * MSF: legacy AnimationClips (keyframe + packed-quaternion rotation curves, string paths)
  * SWGOH: Mecanim generic clips (streamed/dense/constant clip data, CRC32 path hashes)

Unity is left-handed; glTF is right-handed. We mirror X: positions (-x,y,z), quaternions
(x,-y,-z,w), matrices S*M*S, and triangle winding reversed. UV v is flipped (1-v) because
UnityPy's Texture2D.image is already top-down.

Usage: unity_to_glb.py --bundle a.bundle [--bundle b.bundle] --out x.glb [--root NAME] [--clip NAME]
Writes x.glb and x.json (a report of what was chosen and what was skipped).
"""
import argparse, io, itertools, json, math, os, re, struct, sys, zlib
import numpy as np
import UnityPy
from UnityPy.helpers.MeshHelper import MeshHandler
from UnityPy.helpers.PackedBitVector import unpack_ints, unpack_floats

EXCLUDE_MAT = re.compile(r'(vfx|shadow|_fx|fx_|glow|trail|web|smoke|flare|bolt|spark|holo|ghost|stealth|outline)', re.I)
EXCLUDE_GO = re.compile(r'(^vfx|shadow|^fx|^WEB|lod[1-9])', re.I)

# ---------------------------------------------------------------- math helpers

def mirror_t(v):
    return [-float(v[0]), float(v[1]), float(v[2])]

def mirror_q(q):
    x, y, z, w = q
    n = math.sqrt(x * x + y * y + z * z + w * w) or 1.0
    return [x / n, -y / n, -z / n, w / n]

S = np.diag([-1.0, 1.0, 1.0, 1.0])

def mat_from_unity(m):
    return np.array([[m.e00, m.e01, m.e02, m.e03], [m.e10, m.e11, m.e12, m.e13],
                     [m.e20, m.e21, m.e22, m.e23], [m.e30, m.e31, m.e32, m.e33]], dtype=np.float64)

def euler_zxy_to_quat(ex, ey, ez):
    """Unity euler (degrees) applies Z, then X, then Y: q = qy * qx * qz."""
    def axis(ax, deg):
        h = math.radians(deg) / 2
        s, c = math.sin(h), math.cos(h)
        return {'x': (s, 0, 0, c), 'y': (0, s, 0, c), 'z': (0, 0, s, c)}[ax]
    def mul(a, b):
        ax, ay, az, aw = a; bx, by, bz, bw = b
        return (aw * bx + ax * bw + ay * bz - az * by, aw * by - ax * bz + ay * bw + az * bx,
                aw * bz + ax * by - ay * bx + az * bw, aw * bw - ax * bx - ay * by - az * bz)
    return mul(mul(axis('y', ey), axis('x', ex)), axis('z', ez))

# ---------------------------------------------------------------- curve evaluation

def hermite(t, t0, v0, m0, t1, v1, m1):
    dt = t1 - t0
    if dt <= 0:
        return v0
    if not (np.all(np.isfinite(m0)) and np.all(np.isfinite(m1))):
        return v0
    s = (t - t0) / dt
    s2, s3 = s * s, s * s * s
    return (2 * s3 - 3 * s2 + 1) * v0 + (s3 - 2 * s2 + s) * m0 * dt + (-2 * s3 + 3 * s2) * v1 + (s3 - s2) * m1 * dt

class KeyCurve:
    """times[n], values[n,k], ins[n,k], outs[n,k]; hermite between keys, clamped outside."""
    def __init__(self, times, values, ins, outs):
        self.t = np.asarray(times, dtype=np.float64)
        self.v = np.asarray(values, dtype=np.float64)
        self.i = np.asarray(ins, dtype=np.float64)
        self.o = np.asarray(outs, dtype=np.float64)

    def end(self):
        return float(self.t[-1]) if len(self.t) else 0.0

    def __call__(self, t):
        n = len(self.t)
        if n == 1 or t <= self.t[0]:
            return self.v[0]
        if t >= self.t[-1]:
            return self.v[-1]
        j = int(np.searchsorted(self.t, t, side='right')) - 1
        return hermite(t, self.t[j], self.v[j], self.o[j], self.t[j + 1], self.v[j + 1], self.i[j + 1])

def vec(v, n):
    if n == 4:
        return [v.x, v.y, v.z, v.w]
    if n == 3:
        return [v.x, v.y, v.z]
    return [v]

def keycurve_from_unity(curve, n):
    keys = curve.m_Curve
    return KeyCurve([k.time for k in keys], [vec(k.value, n) for k in keys],
                    [vec(k.inSlope, n) for k in keys], [vec(k.outSlope, n) for k in keys])

def unpack_quats(packed):
    data, n = packed.m_Data, packed.m_NumItems
    out = []
    index_pos, bit_pos = 0, 0
    def read(bits_wanted):
        nonlocal index_pos, bit_pos
        x, bits = 0, 0
        while bits < bits_wanted:
            x |= (data[index_pos] >> bit_pos) << bits
            num = min(bits_wanted - bits, 8 - bit_pos)
            bit_pos += num
            bits += num
            if bit_pos == 8:
                index_pos += 1
                bit_pos = 0
        return x & ((1 << bits_wanted) - 1)
    for _ in range(n):
        flags = read(3)
        q = [0.0, 0.0, 0.0, 0.0]
        total = 0.0
        largest = flags & 3
        for j in range(4):
            if j != largest:
                size = 9 if ((largest + 1) % 4) == j else 10
                x = read(size)
                q[j] = x / (0.5 * ((1 << size) - 1)) - 1
                total += q[j] * q[j]
        q[largest] = math.sqrt(max(0.0, 1 - total))
        if flags & 4:
            q[largest] = -q[largest]
        out.append(q)
    return out

def compressed_rotation_curve(c):
    raw = unpack_ints(c.m_Times)
    times = [x * 0.01 for x in itertools.accumulate(raw)]
    quats = unpack_quats(c.m_Values)
    slopes = unpack_floats(c.m_Slopes) if c.m_Slopes.m_NumItems else []
    n = len(times)
    if len(slopes) == 4 * n:
        sl = np.array(slopes).reshape(n, 4)
        ins, outs = sl, sl
    elif len(slopes) == 8 * n:
        sl = np.array(slopes).reshape(n, 8)
        ins, outs = sl[:, :4], sl[:, 4:]
    else:
        ins = outs = np.zeros((n, 4))
    return KeyCurve(times, quats, ins, outs)

def fix_quat_continuity(samples):
    for i in range(1, len(samples)):
        if np.dot(samples[i], samples[i - 1]) < 0:
            samples[i] = -samples[i]
    return samples

# ---------------------------------------------------------------- Mecanim clip data

class MuscleClipData:
    def __init__(self, clip):
        mc = clip.m_MuscleClip
        cd = mc.m_Clip.data
        self.stop = float(mc.m_StopTime)
        self.start = float(mc.m_StartTime)
        # streamed
        sc = cd.m_StreamedClip
        self.stream_count = int(sc.curveCount)
        raw = struct.pack(f'<{len(sc.data)}I', *sc.data)
        pos, frames = 0, []
        while pos + 8 <= len(raw):
            t, nk = struct.unpack_from('<fi', raw, pos)
            pos += 8
            keys = []
            for _ in range(nk):
                idx, c0, c1, c2, c3 = struct.unpack_from('<i4f', raw, pos)
                pos += 20
                keys.append((idx, (c0, c1, c2, c3)))
            frames.append((t, keys))
        self.streamed = {}
        for t, keys in frames:
            for idx, co in keys:
                self.streamed.setdefault(idx, []).append((t, co))
        # dense
        dc = cd.m_DenseClip
        self.dense_count = int(dc.m_CurveCount)
        self.dense_frames = int(dc.m_FrameCount)
        self.dense_rate = float(dc.m_SampleRate) or 30.0
        self.dense_begin = float(dc.m_BeginTime)
        self.dense = np.array(dc.m_SampleArray, dtype=np.float64).reshape(self.dense_frames, self.dense_count) if self.dense_count else None
        self.constant = list(cd.m_ConstantClip.data)

    def value(self, index, t):
        if index < self.stream_count:
            keys = self.streamed.get(index)
            if not keys:
                return 0.0
            chosen = None
            for kt, co in keys:
                if kt <= t or chosen is None:
                    chosen = (kt, co)
                else:
                    break
            kt, co = chosen
            if kt < -1e30 or kt > 1e30:
                return co[3]
            dt = t - kt
            return co[0] * dt ** 3 + co[1] * dt ** 2 + co[2] * dt + co[3]
        index -= self.stream_count
        if index < self.dense_count:
            f = (t - self.dense_begin) * self.dense_rate
            f0 = int(math.floor(max(0, min(self.dense_frames - 1, f))))
            f1 = min(self.dense_frames - 1, f0 + 1)
            a = max(0.0, min(1.0, f - f0))
            return self.dense[f0, index] * (1 - a) + self.dense[f1, index] * a
        index -= self.dense_count
        return self.constant[index]

def binding_size(b):
    if b.typeID == 4:
        return {1: 3, 2: 4, 3: 3, 4: 3}.get(b.attribute, 1)
    return 1

# ---------------------------------------------------------------- scene graph

class Node:
    def __init__(self, tr, go, parent, path):
        self.tr, self.go, self.parent, self.path = tr, go, parent, path
        self.children = []
        self.index = None

def build_tree(root_go):
    nodes = []
    by_tr = {}
    def trof(go):
        return next(c.component.read() for c in go.m_Component if c.component.type.name in ('Transform', 'RectTransform'))
    def walk(go, parent, path, active):
        tr = trof(go)
        n = Node(tr, go, parent, path)
        n.active = active and bool(go.m_IsActive)
        n.index = len(nodes)
        nodes.append(n)
        by_tr[tr.object_reader.path_id] = n
        if parent:
            parent.children.append(n)
        for ch in tr.m_Children:
            cgo = ch.read().m_GameObject.read()
            walk(cgo, n, (path + '/' if path else '') + cgo.m_Name, n.active)
    walk(root_go, None, '', True)
    return nodes, by_tr

def components(go, name):
    return [c.component for c in go.m_Component if c.component.type.name == name]

def material_texture(mat, report):
    props = dict(mat.m_SavedProperties.m_TexEnvs)
    for key in ('_MainTex', '_BaseMap', '_BaseColorMap', '_Diffuse', '_Albedo'):
        te = props.get(key)
        if te and te.m_Texture.m_PathID:
            try:
                tex = te.m_Texture.read()
                return tex, key
            except Exception as e:
                report['warnings'].append(f'{mat.m_Name}.{key} unreadable: {e}')
    return None, None

def extra_textures(mat):
    out = {}
    for key, te in mat.m_SavedProperties.m_TexEnvs:
        if te.m_Texture.m_PathID and te.m_Texture.m_FileID == 0 and key in ('_Mask', '_MatCap', '_MatCapB', '_BumpMap', '_SMAOMap'):
            try:
                out[key] = te.m_Texture.read()
            except Exception:
                pass
    return out

def renderer_list(nodes, report):
    out = []
    for n in nodes:
        for kind in ('SkinnedMeshRenderer', 'MeshRenderer'):
            for c in components(n.go, kind):
                r = c.read()
                mats = []
                for m in r.m_Materials:
                    try:
                        mats.append(m.read() if m.m_PathID else None)
                    except Exception:
                        mats.append(None)
                names = [m.m_Name if m else '?' for m in mats]
                why = None
                if not n.active:
                    why = 'inactive'
                elif not r.m_Enabled:
                    why = 'disabled'
                elif EXCLUDE_GO.search(n.go.m_Name):
                    why = 'excluded object name'
                elif any(EXCLUDE_MAT.search(x) for x in names):
                    why = 'excluded material'
                if kind == 'SkinnedMeshRenderer':
                    mesh_ptr = r.m_Mesh
                else:
                    mf = components(n.go, 'MeshFilter')
                    mesh_ptr = mf[0].read().m_Mesh if mf else None
                mesh = None
                if not why:
                    try:
                        mesh = mesh_ptr.read() if mesh_ptr and mesh_ptr.m_PathID else None
                    except Exception as e:
                        why = f'mesh unreadable {e}'
                    if mesh is None and not why:
                        why = 'no mesh'
                if not why and not any(m and material_texture(m, {'warnings': []})[0] for m in mats):
                    why = 'no base texture'
                report['renderers'].append({'node': n.path, 'kind': kind, 'materials': names, 'used': not why, 'skip': why})
                if not why:
                    out.append((n, kind, r, mesh, mats))
    return out

def vertex_count(renderers):
    total = 0
    for _, _, _, mesh, _ in renderers:
        try:
            total += mesh.m_VertexData.m_VertexCount
        except Exception:
            pass
    return total


# ---------------------------------------------------------------- clips: reading, binding, choosing

MUSCLE_BINDINGS_FOR_HUMANOID = 20
IDLE_PATTERNS = [r'homescreen_idle', r'shell_?idle', r'combat_?idle', r'idle_combat', r'(^|_)idle(_|$)', r'idle']
IDLE_REJECT = re.compile(r'(injured|death|hit|attack|fidget|intro|ultimate|special|stun|victory|surrender|hurt|^cin_|sitting|lean|counter|cantina)', re.I)
EXCLUDE_ROOT = re.compile(r'^(Prop_|VFX_|WEB|FX_|Vehicle)', re.I)

def clip_kind(clip):
    if clip.m_Legacy:
        return 'legacy'
    muscles = sum(1 for b in clip.m_ClipBindingConstant.genericBindings if b.typeID == 95 and b.customType == 8)
    return 'humanoid' if muscles > MUSCLE_BINDINGS_FOR_HUMANOID else 'generic'

def avatar_paths(envs):
    tos = {}
    for env in envs:
        for o in env.objects:
            if o.type.name == 'Avatar':
                for h, p in o.read_typetree()['m_TOS']:
                    tos.setdefault(h, p)
    return tos

def read_curves(clip, envs):
    """(duration, [(key, channel, fn)]). key is a path string (legacy) or ('hash', crc, avatarPathOrNone)."""
    curves, duration = [], 0.0
    if clip.m_Legacy:
        groups = [(clip.m_CompressedRotationCurves, 'r', lambda c: (c.m_Path, compressed_rotation_curve(c))),
                  (clip.m_RotationCurves, 'r', lambda c: (c.path, keycurve_from_unity(c.curve, 4))),
                  (clip.m_EulerCurves, 'e', lambda c: (c.path, keycurve_from_unity(c.curve, 3))),
                  (clip.m_PositionCurves, 't', lambda c: (c.path, keycurve_from_unity(c.curve, 3))),
                  (clip.m_ScaleCurves, 's', lambda c: (c.path, keycurve_from_unity(c.curve, 3)))]
        for items, ch, make in groups:
            for c in items:
                path, kc = make(c)
                duration = max(duration, kc.end())
                curves.append((path, ch, kc))
        return duration, curves
    md = MuscleClipData(clip)
    tos = avatar_paths(envs)
    offset = 0
    for b in clip.m_ClipBindingConstant.genericBindings:
        size = binding_size(b)
        if b.typeID == 4 and b.attribute in (1, 2, 3, 4):
            fn = (lambda t, base=offset, size=size, md=md: np.array([md.value(base + k, t + md.start) for k in range(size)]))
            curves.append((('hash', b.path, tos.get(b.path)), {1: 't', 2: 'r', 3: 's', 4: 'e'}[b.attribute], fn))
        offset += size
    return md.stop - md.start, curves

def norm_path(p):
    return re.sub(r'_dyn(?=/|$)', '', p)

def leaf_key(p):
    return re.sub(r'_dyn$', '', p.split('/')[-1].split(':')[-1]).lower()

def make_resolver(nodes, by_leaf_name=False):
    """Resolve a curve key to a node. Prefabs insert wrappers (SWGOH 'Scaler', MSF 'ST_Ent_*') and
    rename bones ('_dyn'), so every suffix of every node path is indexed raw, hashed and normalised."""
    hashes, suffixes, leaves = {}, {}, {}
    for n in nodes:
        parts = n.path.split('/') if n.path else []
        for k in range(len(parts)):
            sub = '/'.join(parts[k:])
            hashes.setdefault(zlib.crc32(sub.encode()), n)
            suffixes.setdefault(norm_path(sub), n)
        if parts:
            leaves.setdefault(leaf_key(n.path), n)
    def resolve(key):
        path = key
        if isinstance(key, tuple):
            n = hashes.get(key[1])
            if n:
                return n
            path = key[2]
            if not path:
                return None
        n = suffixes.get(norm_path(path))
        if n:
            return n
        return leaves.get(leaf_key(path)) if by_leaf_name else None
    return resolve

def clip_candidates(envs, source):
    out = []
    for env in envs:
        for o in env.objects:
            if o.type.name == 'AnimationClip':
                out.append((o.peek_name(), o, env, source))
    return out

def loops(clip):
    return clip.m_WrapMode == 2 if clip.m_Legacy else bool(clip.m_MuscleClip.m_LoopTime)

def idle_matches(cands, name_filter=None):
    """(clip, env, src) for idle-named clips: pattern order first, then looping clips before one-shots."""
    for pat in IDLE_PATTERNS:
        hits = []
        for n, o, env, src in sorted(cands, key=lambda x: x[0]):
            if (name_filter and not name_filter(n)) or not re.search(pat, n, re.I) or IDLE_REJECT.search(n):
                continue
            hits.append((o.read(), env, src))
        hits.sort(key=lambda h: not loops(h[0]))
        yield from hits

def pick_idle(cands, name_filter=None):
    for clip, env, src in idle_matches(cands, name_filter):
        if clip_kind(clip) != 'humanoid':
            yield clip, env, src

def choose_clip(char_env, anim_envs, donors, want, token, archetypes, weapon, report):
    """Order: --clip; the character's own non-humanoid idle; a shared idle named for the character;
    the archetype's shared shell idle; a donor clip for the character's weapon class (retargeted by
    bone name). Returns (clip, env, mode) or (None, None, reason)."""
    own = clip_candidates([char_env], 'own')
    shared = clip_candidates(anim_envs, 'shared')
    report['clipsAvailable'] = sorted(n for n, *_ in own)
    if want:
        for n, o, env, src in own + shared:
            if n == want:
                return o.read(), env, src
        raise SystemExit(f'Clip {want} not found')
    humanoid = []
    seen = set()
    for clip, env, src in idle_matches(own):
        if clip.m_Name in seen:
            continue
        seen.add(clip.m_Name)
        if clip_kind(clip) == 'humanoid':
            humanoid.append(clip.m_Name)
            continue
        return clip, env, 'own'
    if humanoid:
        report['humanoidIdles'] = sorted(set(humanoid))
    squash = lambda s: re.sub(r'[^a-z0-9]', '', s.lower())
    if token and shared:
        for clip, env, src in pick_idle(shared, lambda n: token in squash(n)):
            return clip, env, 'shared'
    if shared:
        for arche in archetypes + ['malemed']:
            for clip, env, src in pick_idle(shared, lambda n, a=arche: squash(n) in ('anim' + a + 'shellidle', 'anim' + a + 'idle')):
                report['archetypeUsed'] = arche
                return clip, env, 'shared'
    if humanoid and not weapon:
        m = re.match(r'hmn_([a-z]+)_', humanoid[0])
        weapon = m.group(1) if m else None
    for cls, (denv, dclip) in donors:
        if cls in (weapon, '*'):
            for n, o, env, src in clip_candidates([denv], 'donor'):
                if n == dclip:
                    report['donor'] = {'class': cls, 'weapon': weapon, 'clip': dclip}
                    return o.read(), denv, 'donor'
    return None, None, ('humanoid idle only (muscle retargeting not implemented) and no donor' if humanoid else 'no idle clip')

def choose_root(env, want, report, curves, by_name):
    candidates = []
    for o in env.objects:
        if o.type.name != 'Transform':
            continue
        tr = o.read()
        if tr.m_Father and tr.m_Father.m_PathID:
            continue
        go = tr.m_GameObject.read()
        if want and go.m_Name != want:
            continue
        if not want and EXCLUDE_ROOT.search(go.m_Name):
            continue
        candidates.append(go)
    scored = []
    for go in candidates:
        try:
            nodes, _ = build_tree(go)
            rl = renderer_list(nodes, {'renderers': [], 'warnings': []})
            if not [x for x in rl if x[1] == 'SkinnedMeshRenderer']:
                continue
            resolve = make_resolver(nodes, by_name)
            bound = len({resolve(k).index for k, _, _ in curves if resolve(k)}) if curves else 0
            scored.append((bound, vertex_count(rl), -len(nodes), go.m_Name, go))
        except Exception as e:
            report['warnings'].append(f'root {go.m_Name}: {e}')
    if not scored:
        raise SystemExit('No prefab root with a textured, active SkinnedMeshRenderer was found')
    scored.sort(key=lambda s: s[:3], reverse=True)
    report['rootCandidates'] = [{'name': s[3], 'boundBones': s[0], 'vertices': s[1], 'transforms': -s[2]} for s in scored[:8]]
    return scored[0][4]

def rest_pose(env):
    """Donor rest pose (local rotation, local position) by bone leaf name, from the donor bundle's transforms."""
    rest = {}
    for o in env.objects:
        if o.type.name == 'Transform':
            tr = o.read()
            try:
                name = tr.m_GameObject.read().m_Name
            except Exception:
                continue
            q, p = tr.m_LocalRotation, tr.m_LocalPosition
            rest.setdefault(leaf_key(name), ((q.x, q.y, q.z, q.w), (p.x, p.y, p.z)))
    return rest

def qmul(a, b):
    ax, ay, az, aw = a
    bx, by, bz, bw = b
    return np.array((aw * bx + ax * bw + ay * bz - az * by, aw * by - ax * bz + ay * bw + az * bx,
                     aw * bz + ax * by - ay * bx + az * bw, aw * bw - ax * bx - ay * by - az * bz))

def qinv(q):
    return np.array((-q[0], -q[1], -q[2], q[3]))

# ---------------------------------------------------------------- GLB writer

class GLB:
    def __init__(self):
        self.bin = bytearray()
        self.j = {'asset': {'version': '2.0', 'generator': 'everkai unity_to_glb.py'}, 'scene': 0, 'scenes': [{'nodes': []}],
                  'nodes': [], 'meshes': [], 'materials': [], 'textures': [], 'images': [], 'samplers': [],
                  'accessors': [], 'bufferViews': [], 'buffers': [], 'skins': [], 'animations': []}

    def view(self, data, target=None):
        while len(self.bin) % 4:
            self.bin.append(0)
        v = {'buffer': 0, 'byteOffset': len(self.bin), 'byteLength': len(data)}
        if target:
            v['target'] = target
        self.bin.extend(data)
        self.j['bufferViews'].append(v)
        return len(self.j['bufferViews']) - 1

    def accessor(self, arr, atype, ctype=5126, target=None, minmax=False, normalized=False):
        arr = np.ascontiguousarray(arr)
        vi = self.view(arr.tobytes(), target)
        a = {'bufferView': vi, 'componentType': ctype, 'count': int(arr.shape[0]), 'type': atype}
        if normalized:
            a['normalized'] = True
        if minmax:
            flat = arr.reshape(arr.shape[0], -1)
            a['min'] = [float(x) for x in flat.min(axis=0)]
            a['max'] = [float(x) for x in flat.max(axis=0)]
        self.j['accessors'].append(a)
        return len(self.j['accessors']) - 1

    def image(self, pil, name):
        buf = io.BytesIO()
        pil.save(buf, format='PNG', optimize=True)
        vi = self.view(buf.getvalue())
        self.j['images'].append({'bufferView': vi, 'mimeType': 'image/png', 'name': name})
        if not self.j['samplers']:
            self.j['samplers'].append({'magFilter': 9729, 'minFilter': 9987, 'wrapS': 10497, 'wrapT': 10497})
        self.j['textures'].append({'source': len(self.j['images']) - 1, 'sampler': 0, 'name': name})
        return len(self.j['textures']) - 1

    def write(self, path):
        self.j['buffers'] = [{'byteLength': len(self.bin)}]
        for k in [k for k, v in self.j.items() if v == []]:
            del self.j[k]
        js = json.dumps(self.j, separators=(',', ':')).encode()
        while len(js) % 4:
            js += b' '
        while len(self.bin) % 4:
            self.bin.append(0)
        total = 12 + 8 + len(js) + 8 + len(self.bin)
        with open(path, 'wb') as f:
            f.write(struct.pack('<III', 0x46546C67, 2, total))
            f.write(struct.pack('<II', len(js), 0x4E4F534A))
            f.write(js)
            f.write(struct.pack('<II', len(self.bin), 0x004E4942))
            f.write(self.bin)
        return total

# ---------------------------------------------------------------- main export

def as_array(lst, width):
    rows = []
    for v in lst:
        v = list(v) if isinstance(v, (list, tuple)) else [v]
        rows.append((v + [0.0] * width)[:width])
    return np.array(rows, dtype=np.float64)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--bundle', action='append', required=True)
    ap.add_argument('--out', required=True)
    ap.add_argument('--root')
    ap.add_argument('--clip')
    ap.add_argument('--anim-bundle', action='append', default=[], help='shared clip bundles searched after the character bundle')
    ap.add_argument('--donor', action='append', default=[], help='CLASS=bundle:clip; a generic clip retargeted by bone name when the own idle is humanoid')
    ap.add_argument('--weapon', help='weapon class for --donor (default: from the humanoid idle name, e.g. hmn_sbr_ -> sbr)')
    ap.add_argument('--token', help='name token for shared clips (default: from the bundle file name)')
    ap.add_argument('--fps', type=float, default=30.0)
    ap.add_argument('--max-texture', type=int, default=1024)
    a = ap.parse_args()
    report = {'bundles': a.bundle, 'renderers': [], 'warnings': []}
    env = UnityPy.load(*a.bundle)
    anim_envs = [UnityPy.load(b) for b in a.anim_bundle]
    donors = []
    for spec in a.donor:
        cls, rest = spec.split('=', 1)
        path, clipname = rest.rsplit(':', 1)
        donors.append((cls, (UnityPy.load(path), clipname)))
    token = a.token or re.sub(r'^(characters_|char_)|(_pre)?\.(asset)?bundle$', '', os.path.basename(a.bundle[0])).replace('_', '').lower()
    containers = [k for o in env.objects if o.type.name == 'AssetBundle' for k, _ in o.read().m_Container]
    archetypes = sorted({m.group(1) + m.group(2) for c in containers for m in [re.search(r'/cd_(male|fem)(big|med|small)', c)] if m})
    clip, clip_env, mode = choose_clip(env, anim_envs, donors, a.clip, token, archetypes, a.weapon, report)
    if clip is None:
        report['clip'] = None
        report['clipFailure'] = mode
        with open(re.sub(r'\.glb$', '', a.out) + '.json', 'w') as f:
            json.dump(report, f, indent=1)
        raise SystemExit(f'no usable idle clip: {mode}; own clips: {report.get("clipsAvailable")}')
    by_name = mode == 'donor'
    duration, curves = read_curves(clip, [clip_env, env])
    root_go = choose_root(env, a.root, report, curves, by_name)
    report['root'] = root_go.m_Name
    nodes, by_tr = build_tree(root_go)
    report['transforms'] = len(nodes)
    report['renderers'] = []
    rl = renderer_list(nodes, report)
    g = GLB()

    # nodes
    for n in nodes:
        p, q, s = n.tr.m_LocalPosition, n.tr.m_LocalRotation, n.tr.m_LocalScale
        node = {'name': n.go.m_Name, 'translation': mirror_t((p.x, p.y, p.z)), 'rotation': mirror_q((q.x, q.y, q.z, q.w)),
                'scale': [float(s.x), float(s.y), float(s.z)]}
        if n.children:
            node['children'] = [c.index for c in n.children]
        g.j['nodes'].append(node)
    g.j['scenes'][0]['nodes'].append(0)

    tex_cache = {}
    def texture_index(tex, name):
        key = tex.object_reader.path_id
        if key not in tex_cache:
            img = tex.image
            if max(img.size) > a.max_texture:
                img = img.resize((min(img.size[0], a.max_texture), min(img.size[1], a.max_texture)))
            tex_cache[key] = (g.image(img, tex.m_Name), img.mode, img.size)
        return tex_cache[key]

    mat_cache = {}
    def material_index(mat):
        key = mat.object_reader.path_id
        if key in mat_cache:
            return mat_cache[key]
        tex, slot = material_texture(mat, report)
        m = {'name': mat.m_Name, 'pbrMetallicRoughness': {'metallicFactor': 0.0, 'roughnessFactor': 0.8}, 'extras': {}}
        if tex:
            ti, mode, size = texture_index(tex, tex.m_Name)
            m['pbrMetallicRoughness']['baseColorTexture'] = {'index': ti}
            m['extras']['baseTexture'] = {'name': tex.m_Name, 'slot': slot, 'size': list(size), 'mode': mode}
        for key2, t2 in extra_textures(mat).items():
            ti, mode, size = texture_index(t2, t2.m_Name)
            m['extras'][key2] = {'index': ti, 'name': t2.m_Name, 'size': list(size)}
        floats = dict(mat.m_SavedProperties.m_Floats)
        colors = {k: [c.r, c.g, c.b, c.a] for k, c in mat.m_SavedProperties.m_Colors}
        m['extras']['floats'] = {k: v for k, v in floats.items() if k in ('_Brightness', '_BrightnessB', '_MatCapMode', '_MatCapBlend', '_RimPower', '_IllumAmt', '_Cull', '_CullMode', '_Cutoff', '_AlphaTest', '_Mode', '_Surface', '_BumpScale', '_GreenChannel')}
        m['extras']['colors'] = {k: v for k, v in colors.items() if k in ('_Color', '_BaseColor', '_RimColor', '_Tint', '_TintB', '_SpecColor', '_EmissionColor')}
        cull = floats.get('_Cull', floats.get('_CullMode', 2))
        if cull == 0:
            m['doubleSided'] = True
        mat_cache[key] = len(g.j['materials'])
        g.j['materials'].append(m)
        return mat_cache[key]

    stats = {'meshes': [], 'vertices': 0, 'triangles': 0, 'joints': 0}
    for n, kind, r, mesh, mats in rl:
        h = MeshHandler(mesh)
        h.process()
        vc = h.m_VertexCount
        pos = as_array(h.m_Vertices, 3)
        pos[:, 0] *= -1
        prims = []
        attrs = {'POSITION': g.accessor(pos.astype(np.float32), 'VEC3', target=34962, minmax=True)}
        if h.m_Normals:
            nrm = as_array(h.m_Normals, 3)
            nrm[:, 0] *= -1
            ln = np.linalg.norm(nrm, axis=1, keepdims=True)
            ln[ln == 0] = 1
            attrs['NORMAL'] = g.accessor((nrm / ln).astype(np.float32), 'VEC3', target=34962)
        if h.m_UV0:
            uv = as_array(h.m_UV0, 2)
            uv[:, 1] = 1 - uv[:, 1]
            attrs['TEXCOORD_0'] = g.accessor(uv.astype(np.float32), 'VEC2', target=34962)
        skinned = kind == 'SkinnedMeshRenderer' and len(r.m_Bones) > 0 and h.m_BoneIndices
        if skinned:
            idx = np.zeros((vc, 4), dtype=np.uint16)
            wts = np.zeros((vc, 4), dtype=np.float32)
            for i, bi in enumerate(h.m_BoneIndices):
                bi = list(bi) if isinstance(bi, (list, tuple)) else [bi]
                bw = list(h.m_BoneWeights[i]) if h.m_BoneWeights else [1.0] + [0.0] * (len(bi) - 1)
                if not h.m_BoneWeights and len(bi) > 1:
                    bw = [1.0] + [0.0] * (len(bi) - 1)
                for k in range(min(4, len(bi))):
                    idx[i, k] = bi[k]
                    wts[i, k] = bw[k] if k < len(bw) else 0.0
            sums = wts.sum(axis=1, keepdims=True)
            sums[sums == 0] = 1
            wts = wts / sums
            wts[:, 0] += 1 - wts.sum(axis=1)
            attrs['JOINTS_0'] = g.accessor(idx, 'VEC4', ctype=5123, target=34962)
            attrs['WEIGHTS_0'] = g.accessor(wts, 'VEC4', target=34962)
        tris = h.get_triangles()
        tri_total = 0
        for si, sub in enumerate(tris):
            if not sub:
                continue
            arr = np.array([(t[0], t[2], t[1]) for t in sub], dtype=np.uint32).reshape(-1)
            ctype = 5123 if vc < 65536 else 5125
            arr = arr.astype(np.uint16 if ctype == 5123 else np.uint32)
            ia = g.accessor(arr.reshape(-1, 1), 'SCALAR', ctype=ctype, target=34963)
            mat = mats[min(si, len(mats) - 1)] if mats else None
            prim = {'attributes': dict(attrs), 'indices': ia, 'mode': 4}
            if mat:
                prim['material'] = material_index(mat)
            prims.append(prim)
            tri_total += len(sub)
        g.j['meshes'].append({'name': mesh.m_Name, 'primitives': prims})
        mesh_index = len(g.j['meshes']) - 1
        stats['meshes'].append({'name': mesh.m_Name, 'node': n.path, 'vertices': vc, 'triangles': tri_total, 'skinned': bool(skinned), 'bones': len(r.m_Bones) if kind == 'SkinnedMeshRenderer' else 0})
        stats['vertices'] += vc
        stats['triangles'] += tri_total
        if skinned:
            joints = []
            for b in r.m_Bones:
                jn = by_tr.get(b.m_PathID)
                if jn is None:
                    raise SystemExit(f'{mesh.m_Name}: bone {b.m_PathID} outside the chosen root')
                joints.append(jn.index)
            ibm = []
            for bp in mesh.m_BindPose:
                M = S @ mat_from_unity(bp) @ S
                ibm.append(M.T.reshape(-1))
            ibm = np.array(ibm, dtype=np.float32)
            skin = {'joints': joints, 'inverseBindMatrices': g.accessor(ibm, 'MAT4'), 'skeleton': 0, 'name': mesh.m_Name}
            g.j['skins'].append(skin)
            stats['joints'] = max(stats['joints'], len(joints))
            g.j['nodes'].append({'name': n.go.m_Name + '_skinned', 'mesh': mesh_index, 'skin': len(g.j['skins']) - 1})
            g.j['scenes'][0]['nodes'].append(len(g.j['nodes']) - 1)
        else:
            g.j['nodes'][n.index]['mesh'] = mesh_index
    report['stats'] = stats

    # animation
    report['clip'] = {'name': clip.m_Name, 'kind': clip_kind(clip), 'source': mode, 'wrapMode': clip.m_WrapMode, 'duration': duration}
    resolve = make_resolver(nodes, by_name)
    tracks, unresolved = {}, set()
    for key, ch, fn in curves:
        n = resolve(key)
        if n is None:
            unresolved.add((key[2] or key[1]) if isinstance(key, tuple) else key)
        else:
            tracks.setdefault(n.index, {})[ch] = fn
    if by_name:
        # Donor clip: the donor's motion relative to ITS rest pose, applied on top of this rig's rest
        # pose, matched by bone name. Rotations for every bone; translation only for the top-most
        # animated bone (the hips), scaled by the ratio of the two rigs' rest offsets.
        drest = rest_pose(clip_env)
        top = None
        for ni in sorted(tracks, key=lambda i: nodes[i].path.count('/')):
            if 't' in tracks[ni]:
                top = ni
                break
        for ni, tr in list(tracks.items()):
            n = nodes[ni]
            d = drest.get(leaf_key(n.path))
            if d is None:
                del tracks[ni]
                continue
            tq, tp = n.tr.m_LocalRotation, n.tr.m_LocalPosition
            trest, tpos, dq, dpos = np.array((tq.x, tq.y, tq.z, tq.w)), np.array((tp.x, tp.y, tp.z)), np.array(d[0]), np.array(d[1])
            out = {}
            if 'r' in tr:
                out['r'] = (lambda t, f=tr['r'], dq=dq, trest=trest: qmul(trest, qmul(qinv(dq), f(t))))
            if 't' in tr and ni == top:
                ratio = float(np.linalg.norm(tpos) / np.linalg.norm(dpos)) if np.linalg.norm(dpos) > 1e-6 else 1.0
                out['t'] = (lambda t, f=tr['t'], tpos=tpos, dpos=dpos, ratio=ratio: tpos + (f(t) - dpos) * ratio)
            tracks[ni] = out
        report['clip']['retarget'] = 'donor rotations by bone name'
    report['clip']['animatedNodes'] = len(tracks)
    report['clip']['unresolvedPaths'] = sorted(str(u) for u in unresolved)[:20]
    report['clip']['unresolvedCount'] = len(unresolved)
    frames = max(2, int(round(duration * a.fps)) + 1)
    times = np.linspace(0, duration, frames).astype(np.float32)
    tacc = g.accessor(times.reshape(-1, 1), 'SCALAR', minmax=True)
    samplers, channels = [], []
    for ni, tr in sorted(tracks.items()):
        if 't' in tr:
            vals = np.array([mirror_t(tr['t'](float(t))) for t in times], dtype=np.float32)
            samplers.append({'input': tacc, 'output': g.accessor(vals, 'VEC3'), 'interpolation': 'LINEAR'})
            channels.append({'sampler': len(samplers) - 1, 'target': {'node': ni, 'path': 'translation'}})
        if 'r' in tr or 'e' in tr:
            raw = [tr['r'](float(t)) for t in times] if 'r' in tr else [euler_zxy_to_quat(*tr['e'](float(t))) for t in times]
            vals = fix_quat_continuity(np.array([mirror_q(q) for q in raw], dtype=np.float64)).astype(np.float32)
            samplers.append({'input': tacc, 'output': g.accessor(vals, 'VEC4'), 'interpolation': 'LINEAR'})
            channels.append({'sampler': len(samplers) - 1, 'target': {'node': ni, 'path': 'rotation'}})
        if 's' in tr:
            vals = np.array([list(tr['s'](float(t))) for t in times], dtype=np.float32)
            samplers.append({'input': tacc, 'output': g.accessor(vals, 'VEC3'), 'interpolation': 'LINEAR'})
            channels.append({'sampler': len(samplers) - 1, 'target': {'node': ni, 'path': 'scale'}})
    if channels:
        g.j['animations'].append({'name': clip.m_Name, 'samplers': samplers, 'channels': channels})
    size = g.write(a.out)
    report['glbBytes'] = size
    with open(re.sub(r'\.glb$', '', a.out) + '.json', 'w') as f:
        json.dump(report, f, indent=1)
    print(json.dumps({k: report[k] for k in ('root', 'stats', 'clip', 'glbBytes') if k in report}, indent=1))
    if report['warnings']:
        print('warnings:', report['warnings'][:10])

if __name__ == '__main__':
    main()
