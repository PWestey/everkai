"""Unity Mecanim humanoid (muscle-space) AnimationClip -> per-bone local transforms for one Avatar.

A humanoid clip stores no bone rotations. Its Animator bindings (typeID 95, customType 8) index a
value vector laid out as
    0-6 MotionT/Q, 7-9 RootT, 10-13 RootQ, 14-41 IK goals (L/R foot, L/R hand: T xyz + Q xyzw),
    42-96 the 55 body muscles, 97-136 the 40 finger muscles, then TDoF.
The Avatar (m_Avatar.m_Human) turns muscles back into bones:
  * each human bone has 3 DoF (x = twist/roll, y, z) fed by at most 3 muscles (BONE_DOF);
  * a muscle in [-1, 1] maps to an angle through the bone's limit: m * (m < 0 ? -min : max);
  * the angles, times m_Sgn, become a 'ZYRoll' quaternion swing(y, z) * roll(x) from half-angle
    tangents, and the local rotation is PreQ * that * conj(PostQ);
  * RootT (normalised by m_Scale) and RootQ are the body's centre of mass and orientation, so the
    hips are placed last: hips = Root * inverse(body measured with hips at identity) * hips.
Everything here is in Unity space (left-handed); unity_to_glb.py mirrors to glTF afterwards.

Measured facts this relies on (SWGOH corpus, 50 humanoid avatars): every axes entry is type 1
(ZYRoll), the human skeleton's parent links equal the transform hierarchy, no avatar has hand or
TDoF data, and the body orientation computed from the reference pose reproduces m_RootX.q exactly.
The centre-of-mass formula is not public; bone origins weighted by m_HumanBoneMass land within
~1 cm of m_RootX.t, and that residual is removed as a constant body-frame offset.

Not reproduced: Unity's twist distribution (m_ArmTwist etc. move part of a limb's roll to its
parent), foot IK (off unless the controller state enables it) and arm/leg stretch.
"""
import math
import numpy as np

HUMAN_BONES = ['Hips', 'LeftUpperLeg', 'RightUpperLeg', 'LeftLowerLeg', 'RightLowerLeg', 'LeftFoot', 'RightFoot', 'Spine', 'Chest',
               'UpperChest', 'Neck', 'Head', 'LeftShoulder', 'RightShoulder', 'LeftUpperArm', 'RightUpperArm', 'LeftLowerArm',
               'RightLowerArm', 'LeftHand', 'RightHand', 'LeftToes', 'RightToes', 'LeftEye', 'RightEye', 'Jaw']
MUSCLES = ['Spine Front-Back', 'Spine Left-Right', 'Spine Twist Left-Right', 'Chest Front-Back', 'Chest Left-Right', 'Chest Twist Left-Right',
           'UpperChest Front-Back', 'UpperChest Left-Right', 'UpperChest Twist Left-Right', 'Neck Nod Down-Up', 'Neck Tilt Left-Right',
           'Neck Turn Left-Right', 'Head Nod Down-Up', 'Head Tilt Left-Right', 'Head Turn Left-Right', 'Left Eye Down-Up', 'Left Eye In-Out',
           'Right Eye Down-Up', 'Right Eye In-Out', 'Jaw Close', 'Jaw Left-Right']
for side in ('Left', 'Right'):
    MUSCLES += [f'{side} Upper Leg Front-Back', f'{side} Upper Leg In-Out', f'{side} Upper Leg Twist In-Out', f'{side} Lower Leg Stretch',
                f'{side} Lower Leg Twist In-Out', f'{side} Foot Up-Down', f'{side} Foot Twist In-Out', f'{side} Toes Up-Down']
for side in ('Left', 'Right'):
    MUSCLES += [f'{side} Shoulder Down-Up', f'{side} Shoulder Front-Back', f'{side} Arm Down-Up', f'{side} Arm Front-Back',
                f'{side} Arm Twist In-Out', f'{side} Forearm Stretch', f'{side} Forearm Twist In-Out', f'{side} Hand Down-Up', f'{side} Hand In-Out']
BODY_MUSCLES = len(MUSCLES)  # 55
ROOT_T, ROOT_Q, MUSCLE_BASE = 7, 10, 42

# (x, y, z) muscle per human bone; the limits in every avatar agree (e.g. UpperArm z = Down-Up -60..100,
# y = Front-Back -100..100, x = Twist -90..90).
BONE_DOF = {'Spine': (2, 1, 0), 'Chest': (5, 4, 3), 'UpperChest': (8, 7, 6), 'Neck': (11, 10, 9), 'Head': (14, 13, 12),
            'LeftEye': (-1, 16, 15), 'RightEye': (-1, 18, 17), 'Jaw': (-1, 20, 19)}
for k, side in enumerate(('Left', 'Right')):
    o = 8 * k
    BONE_DOF.update({f'{side}UpperLeg': (23 + o, 22 + o, 21 + o), f'{side}LowerLeg': (25 + o, -1, 24 + o), f'{side}Foot': (-1, 27 + o, 26 + o), f'{side}Toes': (-1, -1, 28 + o)})
    o = 9 * k
    BONE_DOF.update({f'{side}Shoulder': (-1, 38 + o, 37 + o), f'{side}UpperArm': (41 + o, 40 + o, 39 + o), f'{side}LowerArm': (43 + o, -1, 42 + o), f'{side}Hand': (-1, 45 + o, 44 + o)})


def Q(d):
    return np.array([d['x'], d['y'], d['z'], d['w']], dtype=np.float64)

def V(d):
    return np.array([d['x'], d['y'], d['z']], dtype=np.float64)

def qmul(a, b):
    ax, ay, az, aw = a
    bx, by, bz, bw = b
    return np.array((aw * bx + ax * bw + ay * bz - az * by, aw * by - ax * bz + ay * bw + az * bx,
                     aw * bz + ax * by - ay * bx + az * bw, aw * bw - ax * bx - ay * by - az * bz))

def qconj(q):
    return np.array((-q[0], -q[1], -q[2], q[3]))

def qnorm(q):
    return q / (np.linalg.norm(q) or 1.0)

def qrot(q, v):
    return qmul(qmul(q, np.array([v[0], v[1], v[2], 0.0])), qconj(q))[:3]

def mat_to_quat(m):
    """Rotation matrix (columns = x, y, z axes) to quaternion (x, y, z, w)."""
    t = m[0, 0] + m[1, 1] + m[2, 2]
    if t > 0:
        s = math.sqrt(t + 1.0) * 2
        return qnorm(np.array([(m[2, 1] - m[1, 2]) / s, (m[0, 2] - m[2, 0]) / s, (m[1, 0] - m[0, 1]) / s, s / 4]))
    i = int(np.argmax([m[0, 0], m[1, 1], m[2, 2]]))
    j, k = (i + 1) % 3, (i + 2) % 3
    s = math.sqrt(max(0.0, m[i, i] - m[j, j] - m[k, k] + 1.0)) * 2
    q = [0.0, 0.0, 0.0, 0.0]
    q[i] = s / 4
    q[j] = (m[j, i] + m[i, j]) / s
    q[k] = (m[k, i] + m[i, k]) / s
    q[3] = (m[k, j] - m[j, k]) / s
    return qnorm(np.array(q))


class Axes:
    def __init__(self, a):
        self.pre, self.post, self.sgn = Q(a['m_PreQ']), Q(a['m_PostQ']), V(a['m_Sgn'])
        self.min, self.max = V(a['m_Limit']['m_Min']), V(a['m_Limit']['m_Max'])
        self.length, self.type = float(a['m_Length']), int(a['m_Type'])
        if self.type != 1:
            raise ValueError(f'axes type {self.type} (only ZYRoll=1 measured)')

    def unproject(self, uvw):
        """Muscle triple -> local rotation."""
        uvw = np.asarray(uvw, dtype=np.float64)
        ang = np.where(uvw < 0, uvw * np.where(self.min < 0, -self.min, 1.0), uvw * np.where(self.max > 0, self.max, 1.0)) * self.sgn
        x, y, z = np.tan(ang / 2)
        zyroll = qnorm(np.array((x, y + x * z, z - x * y, 1.0)))
        return qnorm(qmul(qmul(self.pre, zyroll), qconj(self.post)))

    def project(self, q):
        """Local rotation -> muscle triple (inverse of unproject, used only for validation)."""
        qp = qnorm(qmul(qmul(qconj(self.pre), q), self.post))
        if qp[3] < 0:
            qp = -qp
        roll = qnorm(np.array((qp[0], 0.0, 0.0, qp[3])))
        swing = qmul(qp, qconj(roll))
        ang = 2 * np.arctan(np.array((roll[0] / roll[3], swing[1] / swing[3], swing[2] / swing[3]))) * self.sgn
        return np.where(ang < 0, ang / np.where(self.min < 0, -self.min, 1.0), ang / np.where(self.max > 0, self.max, 1.0))


class HumanoidAvatar:
    def __init__(self, tree):
        """tree: Avatar.read_typetree()."""
        self.name = tree['m_Name']
        tos = dict(tree['m_TOS'])
        h = tree['m_Avatar']['m_Human']['data']
        sk = h['m_Skeleton']['data']
        X = h['m_SkeletonPose']['data']['m_X']
        self.parent = [n['m_ParentId'] for n in sk['m_Node']]
        self.paths = [tos.get(i) for i in sk['m_ID']]
        self.pose_t = [V(x['t']) for x in X]
        self.pose_q = [Q(x['q']) for x in X]
        axes = [Axes(a) for a in sk['m_AxesArray']]
        self.axes = [axes[n['m_AxesId']] if n['m_AxesId'] >= 0 else None for n in sk['m_Node']]
        self.bone_node = {HUMAN_BONES[k]: i for k, i in enumerate(h['m_HumanBoneIndex']) if i >= 0}
        self.mass = {HUMAN_BONES[k]: float(m) for k, m in enumerate(h['m_HumanBoneMass']) if h['m_HumanBoneIndex'][k] >= 0}
        self.scale = float(h['m_Scale'])
        self.root_x = (V(h['m_RootX']['t']), Q(h['m_RootX']['q']))
        self.twist = {k: float(h[k]) for k in ('m_ArmTwist', 'm_ForeArmTwist', 'm_UpperLegTwist', 'm_LegTwist')}
        missing = [b for b in ('Hips', 'Spine', 'Head', 'LeftUpperLeg', 'RightUpperLeg', 'LeftUpperArm', 'RightUpperArm') if b not in self.bone_node]
        if missing:
            raise ValueError(f'{self.name}: not a humanoid avatar (missing {missing})')
        # Body-frame residual between this module's centre of mass and Unity's, from the reference pose.
        com, rot = self.body(self.globals(self.pose_q))
        self.com_offset = qrot(qconj(rot), self.root_x[0] - com)
        self.reference_orientation_error_deg = math.degrees(2 * math.acos(min(1.0, abs(float(np.dot(rot, self.root_x[1]))))))

    def globals(self, local_q):
        G = []
        for i, p in enumerate(self.parent):
            if p < 0:
                G.append((local_q[i], self.pose_t[i]))
            else:
                pq, pt = G[p]
                G.append((qmul(pq, local_q[i]), pt + qrot(pq, self.pose_t[i])))
        return G

    def body(self, G):
        """(centre of mass, orientation) of a global pose, before the calibration offset."""
        pos = {b: G[i][1] for b, i in self.bone_node.items()}
        total = sum(self.mass.values()) or 1.0
        com = sum(self.mass[b] * pos[b] for b in pos) / total
        legs = pos['RightUpperLeg'] - pos['LeftUpperLeg']
        arms = pos['RightUpperArm'] - pos['LeftUpperArm']
        up = (pos['LeftUpperArm'] + pos['RightUpperArm']) / 2 - (pos['LeftUpperLeg'] + pos['RightUpperLeg']) / 2
        up /= np.linalg.norm(up)
        x = legs / np.linalg.norm(legs) + arms / np.linalg.norm(arms)
        z = np.cross(x, up)
        z /= np.linalg.norm(z)
        x = np.cross(up, z)
        return com, mat_to_quat(np.stack([x, up, z], axis=1))

    def muscle_locals(self, muscles):
        """55 body muscles -> local rotation per human-skeleton node (non-muscle nodes keep the reference pose)."""
        local = list(self.pose_q)
        for bone, dof in BONE_DOF.items():
            i = self.bone_node.get(bone)
            if i is None or self.axes[i] is None:
                continue
            local[i] = self.axes[i].unproject([muscles[d] if d >= 0 else 0.0 for d in dof])
        return local

    def pose(self, values):
        """values: {attribute index: float}. Returns (local rotations per node, hips local (t, q) in animator space)."""
        muscles = [values.get(MUSCLE_BASE + k, 0.0) for k in range(BODY_MUSCLES)]
        local = self.muscle_locals(muscles)
        hips = self.bone_node['Hips']
        local[hips] = np.array((0.0, 0.0, 0.0, 1.0))
        G = self.globals(local)
        com, rot = self.body(G)
        com = com + qrot(rot, self.com_offset)
        root_t = np.array([values.get(ROOT_T + k, 0.0) for k in range(3)]) * self.scale
        root_q = qnorm(np.array([values.get(ROOT_Q + k, 1.0 if k == 3 else 0.0) for k in range(4)]))
        # hips_global = Root * inverse(Body) * hips_global_measured; the hips parent chain is the animator root.
        corr_q = qmul(root_q, qconj(rot))
        hq, ht = G[hips]
        hips_q = qnorm(qmul(corr_q, hq))
        hips_t = root_t + qrot(corr_q, ht - com)
        return local, (hips_t, hips_q)

    def check_pose(self, local, hips):
        """Sanity measurements of one converted pose (global, animator space): upright, feet low, head high."""
        G = []
        for i, p in enumerate(self.parent):
            q, t = (hips[1], hips[0]) if i == self.bone_node['Hips'] else (local[i], self.pose_t[i])
            if p < 0 or i == self.bone_node['Hips']:
                G.append((q, t))
            else:
                pq, pt = G[p]
                G.append((qmul(pq, q), pt + qrot(pq, t)))
        pos = {b: G[i][1] for b, i in self.bone_node.items()}
        return {'hipsY': float(pos['Hips'][1]), 'headY': float(pos['Head'][1]),
                'footY': float(min(pos[b][1] for b in ('LeftFoot', 'RightFoot') if b in pos)),
                'headAboveHips': float(pos['Head'][1] - pos['Hips'][1])}

    def reference_muscles(self):
        """The reference (T) pose expressed as muscles: validation only."""
        out = {}
        for bone, dof in BONE_DOF.items():
            i = self.bone_node.get(bone)
            if i is None or self.axes[i] is None:
                continue
            m = self.axes[i].project(self.pose_q[i])
            for k, d in enumerate(dof):
                if d >= 0:
                    out[MUSCLES[d]] = float(m[k])
        return out


def sample_values(md, index_of, times):
    """Evaluate a MuscleClipData (unity_to_glb.py) for the given attribute -> curve-index map at many times.
    Returns {attribute: np.array(len(times))}. Streamed curves are cubic segments keyed by start time."""
    times = np.asarray(times, dtype=np.float64) + md.start
    out = {}
    for attr, idx in index_of.items():
        if idx < md.stream_count:
            keys = md.streamed.get(idx)
            if not keys:
                out[attr] = np.zeros(len(times))
                continue
            kt = np.array([k[0] for k in keys])
            co = np.array([k[1] for k in keys])
            j = np.clip(np.searchsorted(kt, times, side='right') - 1, 0, len(kt) - 1)
            dt = times - kt[j]
            c = co[j]
            sentinel = (kt[j] < -1e30) | (kt[j] > 1e30)
            dt = np.where(sentinel, 0.0, dt)
            out[attr] = c[:, 0] * dt ** 3 + c[:, 1] * dt ** 2 + c[:, 2] * dt + c[:, 3]
        elif idx < md.stream_count + md.dense_count:
            col = md.dense[:, idx - md.stream_count]
            f = np.clip((times - md.dense_begin) * md.dense_rate, 0, md.dense_frames - 1)
            f0 = np.floor(f).astype(int)
            f1 = np.minimum(md.dense_frames - 1, f0 + 1)
            a = f - f0
            out[attr] = col[f0] * (1 - a) + col[f1] * a
        else:
            out[attr] = np.full(len(times), float(md.constant[idx - md.stream_count - md.dense_count]))
    return out
