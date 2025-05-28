import fs from 'fs';
import path from 'path';
import {unified} from 'unified';
import remarkParse from 'remark-parse';
import {visit} from 'unist-util-visit';
import GithubSlugger from 'github-slugger';
import {findAndReplace} from 'mdast-util-find-and-replace';
import {toString} from 'mdast-util-to-string';

const glossaryPath = path.resolve('src/content/docs/Introduction/Terminology-Glossary.md');
let termMap = {};

function loadGlossary() {
  if (termMap.__loaded) return termMap;
  const content = fs.readFileSync(glossaryPath, 'utf8');
  const tree = unified().use(remarkParse).parse(content);
  const slugger = new GithubSlugger();
  termMap = {};
  const children = tree.children;
  for (let i = 0; i < children.length; i++) {
    const node = children[i];
    if (node.type === 'heading' && node.depth === 3) {
      const text = toString(node).trim();
      if (text) {
        const slug = slugger.slug(text);
        let def = '';
        for (let j = i + 1; j < children.length; j++) {
          const next = children[j];
          if (next.type === 'heading' && next.depth === 3) break;
          if (next.type === 'paragraph') {
            def = toString(next).trim();
            break;
          }
        }
        termMap[text] = { slug, def };
      }
    }
  }
  termMap.__loaded = true;
  return termMap;
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export default function remarkGlossaryLinks() {
  const terms = loadGlossary();
  const replacements = [];

  for (const [term, info] of Object.entries(terms)) {
    if (term === '__loaded') continue;
    const { slug, def } = info;
    const safeDef = def.replace(/"/g, '&quot;');
    const patterns = new Set([term]);
    const base = term.replace(/\s*\([^)]*\)/, '').trim();
    if (base && base !== term) patterns.add(base);
    const synMatch = term.match(/\(([^)]+)\)/);
    if (synMatch) {
      synMatch[1]
        // Split on slashes or the word "or" but keep comma-separated
        // phrases intact so common words aren't matched individually.
        .split(/[\/]|\bor\b/i)
        .map(s => s.trim())
        .filter(Boolean)
        .forEach(s => patterns.add(s));
    }

    for (const pat of patterns) {
      replacements.push([
        new RegExp(`(?<!\\w)${escapeRegExp(pat)}(?!\\w)`, 'gi'),
        (match) => ({
          type: 'link',
          url: `/introduction/terminology-glossary#${slug}`,
          data: {
            hProperties: {
              class: 'glossary-term',
              'data-bs-toggle': 'popover',
              'data-bs-content': safeDef,
            },
          },
          children: [{ type: 'text', value: match }],
        }),
      ]);
    }
  }
  return (tree, file) => {
    const filePath = file?.path
      ? file.path.split(path.sep).join(path.posix.sep)
      : '';

    // Skip main site pages located under content/pages
    if (filePath && filePath.includes(path.posix.join('content', 'pages'))) {
      return;
    }

    // Process docs and blog posts only
    const isDoc = filePath.includes(path.posix.join('content', 'docs'));
    const isBlog = filePath.includes(path.posix.join('content', 'blog'));
    if (filePath && !isDoc && !isBlog) {
      return;
    }

    findAndReplace(tree, replacements, {
      ignore: ['link', 'heading', 'code', 'inlineCode'],
    });
  };
}
