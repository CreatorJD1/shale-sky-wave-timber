#!/usr/bin/env python3
"""Read-only SHA-256 verification of the delivered handoff; no driver execution."""
from __future__ import annotations
import argparse
import hashlib
import json
from pathlib import Path, PurePosixPath
import sys


def digest(path: Path) -> str:
    h = hashlib.sha256()
    with path.open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[1])
    args = ap.parse_args()
    root = args.root.resolve()
    try:
        data = json.loads((root / 'PACKAGE_MANIFEST.json').read_text(encoding='utf-8'))
        if data.get('schema') != 'shadowveil.freebuff-handoff/1':
            raise ValueError('Unrecognized handoff manifest')
        records = data['files']
        if not isinstance(records, list):
            raise ValueError('Invalid file list')
        errors = []
        seen = set()
        for record in records:
            name = record['path']
            if not isinstance(name, str) or '\\' in name:
                raise ValueError('Invalid path in manifest')
            rel = PurePosixPath(name)
            if rel.is_absolute() or '..' in rel.parts or name in seen:
                raise ValueError('Unsafe or duplicate path: ' + name)
            seen.add(name)
            path = (root / rel).resolve()
            if not path.is_relative_to(root):
                raise ValueError('Path escapes package: ' + name)
            if not path.is_file():
                errors.append('Missing: ' + name)
            elif path.stat().st_size != record['bytes'] or digest(path) != record['sha256']:
                errors.append('Changed: ' + name)
        if errors:
            print('\n'.join(errors), file=sys.stderr)
            print('Verification failed. Do not treat changed inputs as the delivered baseline.', file=sys.stderr)
            return 1
        print(f'PASS: {len(records)} listed files match their delivered sizes and SHA-256 hashes.')
        print('This verifies package integrity only; it does not run the character driver.')
        print('The manifest is a local integrity record, not an authenticated digital signature.')
        return 0
    except (OSError, ValueError, KeyError, TypeError) as exc:
        print('Unable to verify package: ' + str(exc), file=sys.stderr)
        return 2


if __name__ == '__main__':
    raise SystemExit(main())
