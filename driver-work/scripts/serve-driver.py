#!/usr/bin/env python3
"""Local stable-origin preview. Uses only Python's standard library; loopback only."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from functools import partial
import argparse
p=argparse.ArgumentParser();p.add_argument('--port',type=int,default=8765);a=p.parse_args()
root=Path(__file__).resolve().parents[1]/'public'/'driver-foundation'
print(f'Open http://127.0.0.1:{a.port}/ (keep this origin for autosave).',flush=True)
ThreadingHTTPServer(('127.0.0.1',a.port),partial(SimpleHTTPRequestHandler,directory=str(root))).serve_forever()
