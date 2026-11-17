"""Assemble the static IDE site for GitHub Pages.

    python ide/build_site.py _site

Copies ide/ (minus this script), the weft package sources and the pinned
lark wheel, and bundles the example programs into examples.json. Writes
manifest.json listing what the worker must load. Run from the repository
root; needs pip and network access to PyPI.
"""

import json
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
IDE = ROOT / "ide"
PACKAGE = ROOT / "weft"
EXAMPLES = ROOT / "examples"

# Files the browser needs from the package (Python sources, grammar, runtime).
PACKAGE_SUFFIXES = {".py", ".lark", ".js"}

# Pure-Python dependencies shipped as wheels so the IDE needs no PyPI at runtime.
WHEELS = ["lark==1.3.1"]


def build(out: Path) -> None:
    if out.exists():
        shutil.rmtree(out)
    out.mkdir(parents=True)

    for item in IDE.iterdir():
        if item.name == Path(__file__).name or item.name.startswith("."):
            continue
        if item.is_file():
            shutil.copy2(item, out / item.name)

    package_files = sorted(
        p.relative_to(PACKAGE).as_posix()
        for p in PACKAGE.rglob("*")
        if p.is_file() and p.suffix in PACKAGE_SUFFIXES and "__pycache__" not in p.parts
    )
    for rel in package_files:
        dest = out / "weft" / rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(PACKAGE / rel, dest)

    wheel_dir = out / "wheels"
    subprocess.run(
        [sys.executable, "-m", "pip", "download", "--quiet", "--no-deps",
         "--only-binary=:all:", "--dest", str(wheel_dir), *WHEELS],
        check=True,
    )
    wheels = sorted(f"wheels/{w.name}" for w in wheel_dir.glob("*.whl"))
    manifest = {"package_files": package_files, "wheels": wheels}
    (out / "manifest.json").write_text(json.dumps(manifest, indent=1))

    examples = {
        p.relative_to(EXAMPLES).as_posix(): p.read_text(encoding="utf-8")
        for p in sorted(EXAMPLES.rglob("*.weft"))
    }
    (out / "examples.json").write_text(json.dumps(examples, indent=1, ensure_ascii=False))

    # Pages would otherwise run Jekyll and hide files starting with "_".
    (out / ".nojekyll").write_text("")
    print(f"built {out}: {len(package_files)} package files, {len(wheels)} wheels, {len(examples)} examples")


if __name__ == "__main__":
    build(Path(sys.argv[1] if len(sys.argv) > 1 else "_site").resolve())
