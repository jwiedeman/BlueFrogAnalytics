import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

export function getGitDates(filePath) {
  try {
    const gitRoot = execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim();
    const relative = path.relative(gitRoot, filePath).replace(/\\/g, '/');
    const log = execSync(`git log --follow --format=%aI -- "${relative}"`, { cwd: gitRoot, encoding: 'utf8' })
      .trim()
      .split('\n')
      .filter(Boolean);
    if (!log.length) return null;
    return {
      created: new Date(log[log.length - 1]),
      modified: new Date(log[0]),
    };
  } catch (e) {
    return null;
  }
}

export function applyGitDates(post) {
  try {
    const filePath = fileURLToPath(new URL(`../${post.id}`, import.meta.url));
    const dates = getGitDates(filePath);
    if (dates) {
      post.data.pubDate = dates.created;
      post.data.originalPubDate = dates.created;
      post.data.updatedDate = dates.modified;
    }
  } catch {
    // ignore errors
  }
  return post;
}
