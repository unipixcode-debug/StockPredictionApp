const fs = require('fs');
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'erdem',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'prediction_db',
  password: process.env.DB_PASS || 'prediction123',
  port: 5432,
});

async function seed() {
  try {
    const data = JSON.parse(fs.readFileSync('fallback_sources.json', 'utf8'));
    console.log(`Found ${data.length} sources to seed.`);
    
    let inserted = 0;
    for (const source of data) {
      const res = await pool.query(
        'INSERT INTO news_sources (name, url, category, reliability_score, is_active) VALUES ($1, $2, $3, $4, true) ON CONFLICT (url) DO NOTHING',
        [source.name, source.url, source.category || 'Genel', source.reliability_score || 85]
      );
      if (res.rowCount > 0) inserted++;
    }
    console.log(`Seeding complete. Inserted ${inserted} new sources.`);
  } catch (err) {
    console.error('Error seeding sources:', err);
  } finally {
    await pool.end();
  }
}

seed();
