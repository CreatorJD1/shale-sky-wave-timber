#!/usr/bin/env python3
"""Extract unchanged, hash-verified image payloads without running the catalog HTML."""
from __future__ import annotations
import argparse
import base64
import hashlib
import json
from pathlib import Path, PurePosixPath
import re
import sys

CATALOG_SHA256 = '2820a063a7a58a9b945063bdd664d2854e7581057b389c7410e7645ee45e2d2e'


def safe_write(path: Path, data: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists():
        if not path.is_file() or path.read_bytes() != data:
            raise ValueError('Refusing to replace different existing data: ' + str(path))
        return
    with path.open('xb') as stream:
        stream.write(data)


def main() -> int:
    root = Path(__file__).resolve().parents[1]
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--catalog', type=Path, default=root/'references/Shadowveil_Interactive_Master_Sheet.html')
    group = ap.add_mutually_exclusive_group(required=True)
    group.add_argument('--all', action='store_true', help='Extract all 190 originals')
    group.add_argument('--asset', action='append', help='Asset ID; repeat for several images')
    ap.add_argument('--output', type=Path, default=root/'work/catalog-originals')
    args = ap.parse_args()
    try:
        raw = args.catalog.read_bytes()
        if hashlib.sha256(raw).hexdigest() != CATALOG_SHA256:
            raise ValueError('Catalog differs from the source selected for this handoff')
        text = raw.decode('utf-8')
        match = re.search(r'<script\s+id="catalog-data"\s+type="application/json">(.*?)</script>', text, re.S)
        if not match:
            raise ValueError('Expected catalog-data block was not found')
        catalog = json.loads(match.group(1))
        selected = list(catalog['assets']) if args.all else list(dict.fromkeys(args.asset))
        destination = args.output.resolve()
        for protected in ['baseline', 'driver-source', 'references', 'prior-reports', 'evidence', 'tools']:
            area = (root/protected).resolve()
            if destination == area or destination.is_relative_to(area):
                raise ValueError('Choose a work output directory, not a protected input directory')
        # Validate every requested item before writing any image.
        jobs = []
        for asset_id in selected:
            asset = catalog['assets'].get(asset_id)
            if not asset:
                raise ValueError('Unknown source asset: ' + asset_id)
            rel = PurePosixPath(asset['path'])
            if rel.is_absolute() or '..' in rel.parts or '\\' in asset['path']:
                raise ValueError('Unsafe asset path')
            path = (destination/rel).resolve()
            if not path.is_relative_to(destination):
                raise ValueError('Asset path escapes output folder')
            header, encoded = asset['embedded'].split(',', 1)
            if header != 'data:' + asset['mime'] + ';base64':
                raise ValueError('Unexpected image encoding: ' + asset_id)
            binary = base64.b64decode(encoded, validate=True)
            actual = hashlib.sha256(binary).hexdigest()
            if actual != asset['sha256'] or len(binary) != asset['bytes']:
                raise ValueError('Image checksum or size mismatch: ' + asset_id)
            if path.exists() and (not path.is_file() or path.read_bytes() != binary):
                raise ValueError('Existing different file: ' + str(path))
            jobs.append((path, binary))
        for path, binary in jobs:
            safe_write(path, binary)
        print(f'Extracted/verified {len(jobs)} unchanged originals under {destination}.')
        print('No chroma keying, retouching, registration or approval was applied.')
        return 0
    except (OSError, ValueError, KeyError, TypeError, UnicodeError) as exc:
        print('Extraction failed: ' + str(exc), file=sys.stderr)
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
