// Writes src/legal/licenses.json from the direct production dependencies.
// Run after changing dependencies: node scripts/generate-licenses.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const out = Object.keys(pkg.dependencies)
  .sort()
  .map((name) => {
    const p = JSON.parse(readFileSync(`node_modules/${name}/package.json`, 'utf8'));
    const license = typeof p.license === 'string' ? p.license : (p.license?.type ?? 'See package');
    const repo = typeof p.repository === 'string' ? p.repository : (p.repository?.url ?? p.homepage ?? '');
    return { name, version: p.version, license, url: repo.replace(/^git\+/, '').replace(/\.git$/, '') };
  });
writeFileSync('src/legal/licenses.json', JSON.stringify(out, null, 2) + '\n');
console.log(`Wrote ${out.length} packages`);
