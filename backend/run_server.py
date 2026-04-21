from __future__ import annotations

import sys
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent
DEPS_DIR = BASE_DIR / ".deps"

if DEPS_DIR.exists():
    deps_path = str(DEPS_DIR)
    if deps_path not in sys.path:
        sys.path.insert(0, deps_path)

ROOT_DIR = BASE_DIR.parent
root_path = str(ROOT_DIR)
if root_path not in sys.path:
    sys.path.insert(0, root_path)

import uvicorn


if __name__ == "__main__":
    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=False)
