import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config({ quiet: true });
dotenv.config({ path: '.env.local', quiet: true });

const { Pool } = pg;
const databaseUrl = process.env.DATABASE_URL || '';

if (!databaseUrl || databaseUrl.includes('USER:PASSWORD@HOST.neon.tech')) {
  console.error('DATABASE_URL nije pravi Neon connection string.');
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
  await pool.query('SELECT 1');
  const { rows } = await pool.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN (
        'customers',
        'customer_addresses',
        'products',
        'orders',
        'brands',
        'categories',
        'spec_keys',
        'product_reviews',
        'newsletter_subscribers'
      )
    ORDER BY table_name
  `);
  const tables = rows.map((row) => row.table_name);
  console.log('Neon konekcija radi.');
  console.log(`Nadjene tabele: ${tables.length ? tables.join(', ') : 'nema'}`);
  if (tables.length < 9) {
    console.log('Pokreni: npm run db:migrate');
  }
} finally {
  await pool.end();
}
