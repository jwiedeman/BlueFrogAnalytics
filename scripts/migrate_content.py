import os
import shutil
from pathlib import Path

SOURCE_DOCS = Path('website/src/content/docs')
DEST_DOCS = Path('frontend/src/pages/docs')

for src in SOURCE_DOCS.rglob('*.md'):
    rel = src.relative_to(SOURCE_DOCS)
    dest = DEST_DOCS / str(rel).lower()
    dest = dest.with_suffix('.mdx')
    dest.parent.mkdir(parents=True, exist_ok=True)
    if not dest.exists():
        shutil.copy2(src, dest)

SOURCE_BLOG = Path('website/src/content/blog')
DEST_BLOG = Path('frontend/src/content/blog')
DEST_BLOG.mkdir(parents=True, exist_ok=True)

for src in SOURCE_BLOG.glob('*.mdx'):
    dest = DEST_BLOG / src.name
    if not dest.exists():
        shutil.copy2(src, dest)
