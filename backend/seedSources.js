require('dotenv').config();
const fs = require('fs');
const sequelize = require('./config/database');
const DataSource = require('./models/DataSource');

async function seed() {
  try {
    await sequelize.authenticate();
    await DataSource.sync();
    
    const data = JSON.parse(fs.readFileSync('fallback_sources.json', 'utf8'));
    console.log(`Found ${data.length} sources to seed.`);
    
    let inserted = 0;
    for (const source of data) {
      const [record, created] = await DataSource.findOrCreate({
        where: { url: source.url },
        defaults: {
          name: source.name,
          type: source.type || 'NEWS_RSS',
          isActive: true
        }
      });
      if (created) inserted++;
    }
    console.log(`Seeding complete. Inserted ${inserted} new sources into DataSources.`);
  } catch (err) {
    console.error('Error seeding sources:', err);
  } finally {
    process.exit(0);
  }
}

seed();
