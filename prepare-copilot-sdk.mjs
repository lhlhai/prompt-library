import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const sourceSkills = path.join(root, 'skills');
const outputSkills = path.join(root, '.copilot-sdk', 'skills');
const skillFiles = (await fs.readdir(sourceSkills))
  .filter((name) => name.endsWith('.md'))
  .sort();

if (skillFiles.length === 0) {
  throw new Error(`No Markdown skills found in ${sourceSkills}`);
}

await fs.rm(outputSkills, { recursive: true, force: true });
for (const filename of skillFiles) {
  const sourcePath = path.join(sourceSkills, filename);
  const skillName = path.basename(filename, '.md');
  const targetDirectory = path.join(outputSkills, skillName);
  const content = await fs.readFile(sourcePath, 'utf8');
  const declaredName = content.match(/^name:\s*([\w-]+)\s*$/m)?.[1];
  if (declaredName !== skillName) {
    throw new Error(`${filename}: frontmatter name '${declaredName ?? '(missing)'}' must match '${skillName}'`);
  }
  await fs.mkdir(targetDirectory, { recursive: true });
  await fs.writeFile(path.join(targetDirectory, 'SKILL.md'), content);
}

console.log(`Prepared ${skillFiles.length} Copilot SDK skills in .copilot-sdk/skills/`);
