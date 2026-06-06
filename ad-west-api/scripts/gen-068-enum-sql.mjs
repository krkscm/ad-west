import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const content = fs.readFileSync(
  path.join(__dirname, '../src/modules/enum-values/enum-types.constants.ts'),
  'utf8',
);

const types = {};
for (const m of content.matchAll(/^\s+(\w+): '([^']+)'/gm)) {
  if (m[1] !== 'ENUM_TYPES') types[m[1]] = m[2];
}

const seedBlock = content.match(/export const PLATFORM_ENUM_SEEDS[\s\S]*?= \[([\s\S]*?)\];/)[1];
const lineRe = /\{ enumType: ENUM_TYPES\.(\w+), value: '((?:\\'|[^'])*)', label: '((?:\\'|[^'])*)', sortOrder: (\d+), active: true, parentValue: (null|'[^']*') \}/g;

const rows = [];
let m;
while ((m = lineRe.exec(seedBlock))) {
  const enumType = types[m[1]];
  const label = m[3].replace(/'/g, "''");
  const pv = m[5] === 'null' ? 'NULL' : `'${m[5].slice(1, -1)}'`;
  const id = `ev-${enumType.slice(0, 12)}-${m[2].replace(/[^a-z0-9]+/gi, '-').slice(0, 20)}`;
  rows.push(
    `  ('${id}', '${enumType}', '${m[2]}', '${label}', ${m[4]}, true, ${pv}, to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))`,
  );
}

const out = `-- Auto-generated inserts (${rows.length} rows) — run: node scripts/gen-068-enum-sql.mjs
INSERT INTO adwest.enum_values (id, enum_type, value, label, sort_order, active, parent_value, created_at, updated_at)
VALUES
${rows.join(',\n')}
ON CONFLICT (enum_type, value) DO UPDATE SET
  label = EXCLUDED.label,
  sort_order = EXCLUDED.sort_order,
  parent_value = EXCLUDED.parent_value,
  active = true,
  updated_at = EXCLUDED.updated_at;
`;

fs.writeFileSync(path.join(__dirname, '../../ad-docs/database-script/_068_enum_inserts.sql'), out);
console.log(`Wrote ${rows.length} rows`);
