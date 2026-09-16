#!/usr/bin/env python3
"""Extract the English translation TextAsset from the original's plain UnityFS bundle.

docs/event-catalog.md section 1 records the recipe: the APK entry

  assets/Android/config/logic/en/translate_v1_c9fd6a1e92f261ca0fa68d0f79049483.mmc

is a 32-byte `MOMCMX` zero-padded prefix followed by a plain `UnityFS` bundle (format 8,
LZ4HC blocks, flags 0x243 = block-info padding, **no** encryption header). It was opened
before with UnityPy 1.25.3 and FALLBACK_UNITY_VERSION=2022.3.0f1. This script does the same
job without UnityPy, because that venv lives under ~/Desktop where reads stall in the agent
sandbox -- it parses the documented container directly.

Nothing here decrypts anything. The bundle carries compression type 3 and no encryption
flag; if a future build did carry one, the type check below refuses rather than guessing.
The proof this produced the right bytes is the SHA-256 assertion, which matches the digest
docs/event-catalog.md and lib/business-data.json already published.

Usage:
  unzip -p ~/Desktop/Isekai/UnityDataAssetPack.apk \
    assets/Android/config/logic/en/translate_v1_c9fd6a1e92f261ca0fa68d0f79049483.mmc > translate.mmc
  python3 scripts/read-unityfs-textasset.py --mmc translate.mmc --out translate.json
"""
from __future__ import annotations

import argparse
import collections
import hashlib
import io
import json
import struct
import sys

EXPECT_SHA256 = "c884ee22dfd491ce0c700109f955465b34ef518f6e73d4132993e9d01f4d35bc"
EXPECT_RECORDS = 239580
PREFIX = 32  # the MOMCMX zero-padded header in front of the UnityFS bundle


def lz4_block_decompress(src: bytes, out_size: int) -> bytes:
    """Plain LZ4 block format (LZ4HC compresses to the same block format)."""
    dst = bytearray(out_size)
    d = i = 0
    n = len(src)
    while i < n:
        token = src[i]
        i += 1
        lit = token >> 4
        if lit == 15:
            while True:
                b = src[i]
                i += 1
                lit += b
                if b != 255:
                    break
        if lit:
            dst[d:d + lit] = src[i:i + lit]
            d += lit
            i += lit
        if i >= n:
            break
        off = src[i] | (src[i + 1] << 8)
        i += 2
        ml = token & 0x0F
        if ml == 15:
            while True:
                b = src[i]
                i += 1
                ml += b
                if b != 255:
                    break
        ml += 4
        s = d - off
        if off >= ml:
            dst[d:d + ml] = dst[s:s + ml]
            d += ml
        else:  # overlapping match: must copy byte by byte
            for k in range(ml):
                dst[d] = dst[s + k]
                d += 1
    if d != out_size:
        raise ValueError(f"lz4 produced {d} bytes, expected {out_size}")
    return bytes(dst)


def cstring(f: io.BytesIO) -> str:
    out = bytearray()
    while True:
        c = f.read(1)
        if not c or c == b"\0":
            return out.decode("utf-8", "replace")
        out += c


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--mmc", required=True, help="the .mmc taken from the APK with unzip -p")
    ap.add_argument("--out", required=True, help="where to write the TextAsset JSON")
    ap.add_argument("--expect-sha256", default=EXPECT_SHA256)
    args = ap.parse_args()

    raw = open(args.mmc, "rb").read()
    if raw[PREFIX:PREFIX + 7] != b"UnityFS":
        sys.exit(f"{args.mmc}: no UnityFS bundle at offset {PREFIX}")
    data = raw[PREFIX:]

    f = io.BytesIO(data)
    sig = cstring(f)
    version = struct.unpack(">I", f.read(4))[0]
    unity_version = cstring(f)
    unity_revision = cstring(f)
    size, ci_size, ui_size, flags = struct.unpack(">qIII", f.read(20))
    comp = flags & 0x3F
    print(f"{sig} v{version} unity={unity_version} rev={unity_revision} size={size} "
          f"flags=0x{flags:x} compression={comp}")
    if comp not in (0, 2, 3):
        sys.exit(f"compression type {comp} is not the plain LZ4 this bundle documents; "
                 f"refusing to guess at a protected container")
    if flags & 0x200:  # block info is 16-byte aligned
        f.seek((f.tell() + 15) & ~15)
    blob = data[-ci_size:] if flags & 0x80 else f.read(ci_size)
    info = blob if comp == 0 else lz4_block_decompress(blob, ui_size)

    g = io.BytesIO(info)
    g.read(16)
    (block_count,) = struct.unpack(">I", g.read(4))
    blocks = [struct.unpack(">IIH", g.read(10)) for _ in range(block_count)]
    (node_count,) = struct.unpack(">I", g.read(4))
    nodes = []
    for _ in range(node_count):
        off, sz, fl = struct.unpack(">qqI", g.read(20))
        nodes.append((off, sz, fl, cstring(g)))
    print(f"  blocks={block_count} nodes={node_count} "
          f"blockFlags={dict(collections.Counter(b[2] for b in blocks))}")
    if flags & 0x200:  # the same alignment applies to the block payload
        f.seek((f.tell() + 15) & ~15)

    out = bytearray()
    for un, cn, bf in blocks:
        chunk = f.read(cn)
        out += chunk if (bf & 0x3F) == 0 else lz4_block_decompress(chunk, un)
    payload = bytes(out)
    if len(payload) != sum(b[0] for b in blocks):
        sys.exit("block payload length mismatch")

    idx = payload.find(b'{"translate"')
    if idx < 0:
        sys.exit("translate JSON not found in the decompressed bundle")
    (length,) = struct.unpack("<I", payload[idx - 4:idx])  # TextAsset m_Script is length-prefixed
    script = payload[idx:idx + length]
    digest = hashlib.sha256(script).hexdigest()
    print(f"  m_Script {length} bytes sha256={digest}")
    if digest != args.expect_sha256:
        sys.exit(f"SHA-256 mismatch (expected {args.expect_sha256}); stopping")
    records = json.loads(script.decode("utf-8"))["translate"]
    print(f"  records={len(records)} (expected {EXPECT_RECORDS})")
    if len(records) != EXPECT_RECORDS:
        sys.exit("record count mismatch; stopping")
    open(args.out, "wb").write(script)
    print(f"wrote {args.out}")


if __name__ == "__main__":
    main()
