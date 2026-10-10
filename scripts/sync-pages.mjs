import {readFile, writeFile, readdir, stat, cp, rm, mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

// GitHub Pages publishes main's root. Keep source and generated files in one repo.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'dist');
const manifestPath = path.join(root, '.pages-files.json');
async function walk(dir, relative = '') {
  const files = [];
  for (const entry of await readdir(dir, {withFileTypes:true})) {
    if (entry.name === '.DS_Store') continue;
    const name = path.posix.join(relative, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path.join(dir, entry.name), name));
    else if (entry.isFile()) files.push(name);
    else throw new Error(`Unsupported output entry: ${name}`);
  }
  return files;
}
const files = (await walk(output)).sort();
if (!files.includes('index.html') || !(await stat(path.join(output, 'index.html'))).size) {
  throw new Error('Build the website before preparing a release.');
}
let previous = [];
try { previous = JSON.parse(await readFile(manifestPath, 'utf8')); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
const sourceNames = new Set(['src', 'public', 'scripts', 'docs', '.git', '.github', 'node_modules', 'dist', 'README.md', 'package.json', 'package-lock.json', '.gitignore', '.pages-files.json', 'CNAME']);
for (const file of [...previous, ...files]) {
  if (typeof file !== 'string' || path.posix.normalize(file) !== file || file.startsWith('/') || file.split('/').includes('..') || sourceNames.has(file.split('/')[0]) || file.split('/').includes('.DS_Store')) {
    throw new Error(`Refusing to sync outside generated website files: ${file}`);
  }
}
const current = new Set(files);
for (const file of previous) if (!current.has(file)) await rm(path.join(root, file), {force:true});
for (const file of files) {
  await mkdir(path.dirname(path.join(root, file)), {recursive:true});
  await cp(path.join(output, file), path.join(root, file));
}
await writeFile(manifestPath, JSON.stringify(files, null, 2) + '\n');
console.log(`Prepared ${files.length} published files in ${root}. Commit source and these files together, then push main.`);
