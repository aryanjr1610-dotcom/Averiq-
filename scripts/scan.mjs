import fs from 'node:fs';
import path from 'node:path';

function walk(d) {
  let r = [];
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) r.push(...walk(p));
    else if (/\.(ts|tsx)$/.test(f)) r.push(p);
  }
  return r;
}

const files = walk('./src');
const bUses = new Set();
const sUses = new Set();

for (const f of files) {
  const txt = fs.readFileSync(f, 'utf8');
  if (txt.includes('@/components/ui/Button')) {
    const m = txt.matchAll(/import\s*\{([^}]+)\}\s*from\s*['"]@\/components\/ui\/Button['"]/g);
    for (const match of m) {
      match[1].split(',').forEach(x => bUses.add(x.trim()));
    }
  }
  if (txt.includes('@/components/ui/Surface')) {
    const m = txt.matchAll(/import\s*\{([^}]+)\}\s*from\s*['"]@\/components\/ui\/Surface['"]/g);
    for (const match of m) {
      match[1].split(',').forEach(x => sUses.add(x.trim()));
    }
  }
}

console.log('Button imports:', [...bUses]);
console.log('Surface imports:', [...sUses]);
