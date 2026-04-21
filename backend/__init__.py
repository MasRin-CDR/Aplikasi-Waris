"""Backend package untuk kalkulator waris."""

from __future__ import annotations

import sys
from pathlib import Path


_PACKAGE_DIR = Path(__file__).resolve().parent
_LOCAL_DEPS = _PACKAGE_DIR / ".deps"

if _LOCAL_DEPS.exists():
  deps_path = str(_LOCAL_DEPS)
  if deps_path not in sys.path:
    sys.path.insert(0, deps_path)
