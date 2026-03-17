require('dotenv').config();
const sequelize = require('./config/database');
const GlobalSetting = require('./models/GlobalSetting');

const defaultSettings = [
  { key: 'token_pack_1', value: '7', description: '100 Token Paketi' },
  { key: 'token_pack_2', value: '3', description: '500 Token Paketi' },
  { key: 'token_pack_3', value: '1', description: '1000 Token Paketi' },
  { key: 'token_pack_4', value: '5', description: '5000 Token Paketi' },
  { key: 'welcome_bonus', value: '50', description: 'Yeni Üye Karşılama Bonusu' },
  { key: 'cost_per_prediction', value: '5', description: 'Tahmin Analiz Ücreti' },
  { key: 'monthly_newsletter_cost', value: '20', description: 'Aylık Haber Bülteni Ücreti' },
  { key: 'monthly_money_flow_cost', value: '5', description: 'Aylık Para Akışı Analizi Ücreti' },
  { key: 'monthly_auto_prediction_cost', value: '5', description: 'Aylık Otomatik Tahmin Ücreti' }
];

async function seed() {
  try {
    await sequelize.authenticate();
    await GlobalSetting.sync();
    
    console.log(`Checking ${defaultSettings.length} settings...`);
    
    for (const setting of defaultSettings) {
      const [record, created] = await GlobalSetting.findOrCreate({
        where: { key: setting.key },
        defaults: {
          value: setting.value,
          description: setting.description
        }
      });
      if (created) {
        console.log(`Created setting: ${setting.key}`);
      } else {
        console.log(`Setting already exists: ${setting.key}`);
      }
    }
    console.log('Global settings seeding complete.');
  } catch (err) {
    console.error('Error seeding settings:', err);
  } finally {
    process.exit(0);
  }
}

seed();
