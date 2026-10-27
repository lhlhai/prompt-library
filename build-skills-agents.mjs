import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const outputDirectory = path.join(root, 'data');

function parseScalar(value) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try { return JSON.parse(trimmed.replaceAll("'", '"')); } catch {
      return trimmed.slice(1, -1).split(',').map((entry) => entry.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
    }
  }
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try { return JSON.parse(trimmed.replaceAll("'", '"')); } catch { return trimmed; }
  }
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
  return trimmed.replace(/^['"]|['"]$/g, '');
}

function parseMarkdown(raw, filename) {
  const normalized = raw.replaceAll('\r\n', '\n');
  const hasFrontmatter = normalized.startsWith('---\n');
  const end = hasFrontmatter ? normalized.indexOf('\n---', 4) : -1;
  const frontmatter = {};
  let content = normalized;
  if (hasFrontmatter && end > -1) {
    for (const line of normalized.slice(4, end).split('\n')) {
      const separator = line.indexOf(':');
      if (separator === -1) continue;
      frontmatter[line.slice(0, separator).trim()] = parseScalar(line.slice(separator + 1));
    }
    content = normalized.slice(end + 4).trim();
  }
  const slug = String(frontmatter.slug || filename.replace(/\.md$/i, '')).trim();
  const title = String(frontmatter.title || slug.replaceAll('-', ' ')).trim();
  const tags = Array.isArray(frontmatter.tags) ? frontmatter.tags : String(frontmatter.tags || '').split(',').map((tag) => tag.trim()).filter(Boolean);
  const skills = Array.isArray(frontmatter.skills) ? frontmatter.skills : String(frontmatter.skills || '').split(',').map((skill) => skill.trim()).filter(Boolean);
  const description = String(frontmatter.description || content.split('\n').find((line) => line.trim() && !line.startsWith('#')) || '').trim();
  return { ...frontmatter, slug, title, tags, skills, description, content, source: filename };
}

async function readCollection(collection) {
  const directory = path.join(root, collection);
  const filenames = (await fs.readdir(directory)).filter((filename) => filename.toLowerCase().endsWith('.md')).sort();
  const items = [];
  for (const filename of filenames) items.push(parseMarkdown(await fs.readFile(path.join(directory, filename), 'utf8'), filename));
  return items.sort((a, b) => String(a.title).localeCompare(String(b.title), 'en'));
}

await fs.mkdir(outputDirectory, { recursive: true });
const generatedAt = new Date().toISOString();
for (const collection of ['skills', 'agents']) {
  const items = await readCollection(collection);
  await fs.writeFile(path.join(outputDirectory, `${collection}.json`), JSON.stringify({ generatedAt, collection, items }, null, 2) + '\n');
  console.log(`Built ${collection}: ${items.length} Markdown entries`);
}
