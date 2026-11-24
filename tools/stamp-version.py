#!/usr/bin/env python3
"""Cache-busting for GitHub Pages (which lets browsers keep files for 10 minutes).

Stamps index.html so every local script and stylesheet is requested with ?v=<hash of its
contents>. Nested ES-module imports (e.g. bridge.js -> onboarding/copy.js) are covered by an
import map, so a changed file is always fetched fresh and unchanged files stay cached.

Run from this folder before publishing:  python3 tools/stamp-version.py
"""
import hashlib, json, pathlib, re

root = pathlib.Path(__file__).resolve().parent.parent
index = root / 'index.html'
html = index.read_text()

def stamp(path):
    return hashlib.sha1((root / path).read_bytes()).hexdigest()[:8]

modules = sorted(p.relative_to(root).as_posix() for p in root.rglob('*.js')
                 if not {'tests', 'tools', '.git'} & set(p.relative_to(root).parts))
imports = {'three': f'./vendor/three.module.js?v={stamp("vendor/three.module.js")}'}
imports.update({f'./{m}': f'./{m}?v={stamp(m)}' for m in modules})
importmap = '<script type="importmap">' + json.dumps({'imports': imports}, separators=(',', ':')) + '</script>'
html, n = re.subn(r'<script type="importmap">.*?</script>', importmap, html, count=1, flags=re.S)
assert n == 1, 'import map not found in index.html'

def restamp(match):
    path = match.group(2)
    return f'{match.group(1)}{path}?v={stamp(path)}"'
html = re.sub(r'((?:href|src)="\./)([\w./-]+\.(?:css|js))(?:\?v=[\w-]*)?"', restamp, html)
index.write_text(html)
print(f'Stamped {len(imports)} modules and the page’s scripts/stylesheets.')
