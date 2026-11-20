import {readFileSync,existsSync} from 'node:fs';import {resolve} from 'node:path';import assert from 'node:assert/strict';
const root=resolve(import.meta.dirname,'..');
const routes=['','rooms','availability','booking','reservations','account','experiences'];
for(const r of routes){const f=resolve(root,'src/app',r,'page.tsx');assert.ok(existsSync(f),`Missing UI route: ${f}`)}
const css=readFileSync(resolve(root,'src/app/globals.css'),'utf8');
for(const token of ['--surface:','--ink:','--forest:','--gold:','--font-display:','--motion-ease:','[data-theme=','@theme inline','prefers-reduced-motion'])assert.ok(css.includes(token),`Missing design token: ${token}`);
const data=readFileSync(resolve(root,'src/lib/data.ts'),'utf8');
const block=data.slice(data.indexOf('export const rooms'),data.indexOf('export const services'));
const imageIds=[...block.matchAll(/photo\('(photo-[^']+)'\)/g)].map(m=>m[1]);
assert.equal(imageIds.length,9,'Expected 9 distinct room-gallery photographs');assert.equal(new Set(imageIds).size,9,'Duplicate room photo found across room galleries');
console.log('UI checks passed: 7 routes; semantic theme tokens; 9 unique room photos.');
