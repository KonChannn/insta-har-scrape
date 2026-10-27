import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { richHar } from './rich-fixture';

const out = process.argv[2] || 'public/demo.har';
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(richHar));
console.log(`wrote ${out}`);
