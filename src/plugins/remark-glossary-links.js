import fs from 'fs';
import path from 'path';
import {unified} from 'unified';
import remarkParse from 'remark-parse';
import {visit} from 'unist-util-visit';
import GithubSlugger from 'github-slugger';
import {findAndReplace} from 'mdast-util-find-and-replace';

const glossaryPath = path.resolve('src/content/docs/Introduction/Terminology-Glossary.md');
let termMap = {};

function loadGlossary() {
  if (termMap.__loaded) return termMap;
  const content = fs.readFileSync(glossaryPath, 'utf8');
  const tree = unified().use(remarkParse).parse(content);
  const slugger = new GithubSlugger();
  termMap = {};
  visit(tree, 'heading', (node) => {
    if (node.depth === 3) {
      const text = node.children.map((c) => c.value || '').join('').trim();
      if (text) {
        const slug = slugger.slug(text);
        termMap[text] = slug;
      }
    }
  });
  termMap.__loaded = true;
  return termMap;
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export default function remarkGlossaryLinks() {
  const terms = loadGlossary();
  const replacements = Object.entries(terms).map(([term, slug]) => [
    new RegExp(`(?<!\\w)${escapeRegExp(term)}(?!\\w)`, 'gi'),

    (match) => ({
      type: 'link',
      url: `/introduction/terminology-glossary#${slug}`,
      children: [{type: 'text', value: match}],
    }),
  ]);
  return (tree, file) => {
    // Only process files within the documentation directory
    if (!file?.path || !file.path.includes(path.posix.join('content', 'docs'))) {
      return;
    }
    findAndReplace(tree, replacements, {ignore: ['link', 'heading', 'code', 'inlineCode']});
  };
}
