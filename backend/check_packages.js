const sequelize = require('./config/database');
const { QueryTypes } = require('sequelize');

async function check() {
  try {
    const results = await sequelize.query(
      'SELECT value FROM "GlobalSettings" WHERE key = \'token_packages\'',
      { type: QueryTypes.SELECT }
    );
    console.log('📦 Current Packages Data:');
    console.log(JSON.stringify(results[0]?.value, null, 2));
    process.exit(0);
  } catch (err) {
    console.error('❌ Check failed:', err.message);
    process.exit(1);
  }
}

check();
