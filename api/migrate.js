import dotenv from 'dotenv';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import pg from 'pg';

dotenv.config({ quiet: true });
dotenv.config({ path: '.env.local', quiet: true });

const { Pool } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));

const databaseUrl = process.env.DATABASE_URL || '';

if (!databaseUrl || databaseUrl.includes('USER:PASSWORD@HOST.neon.tech')) {
  console.error('DATABASE_URL nije podesen na pravi Neon connection string.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl:
    process.env.DATABASE_SSL === 'false'
      ? false
      : { rejectUnauthorized: false },
});

try {
  const sql = await readFile(join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(sql);
  console.log('Neon/Postgres schema je spremna.');
} finally {
  await pool.end();
}
