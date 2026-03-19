const sequelize = require('./config/database');
const { QueryTypes } = require('sequelize');

const packages = [
  {
    id: "pkg_1",
    name: "Starter",
    tokens: 100,
    price: "₺39.99",
    popular: false,
    icon: "Sparkles",
    features: ["100 AI Analizi", "Piyasa Tahminleri", "Finansal Öngörüler"],
    orderIndex: 1
  },
  {
    id: "pkg_2",
    name: "Pro",
    tokens: 500,
    price: "₺129.99",
    popular: true,
    icon: "Zap",
    features: ["500 AI Analizi", "Piyasa Tahminleri", "Finansal Öngörüler"],
    orderIndex: 2
  },
  {
    id: "pkg_3",
    name: "Whale",
    tokens: 2000,
    price: "₺399.99",
    popular: false,
    icon: "Crown",
    features: ["2000 AI Analizi", "Piyasa Tahminleri", "Finansal Öngörüler"],
    orderIndex: 3
  }
];

async function seed() {
  try {
    const value = JSON.stringify(packages);
    // Explicitly use double quotes for PostgreSQL case-sensitive table/column names
    await sequelize.query(
      'INSERT INTO "GlobalSettings" ("key", "value", "createdAt", "updatedAt") ' +
      'VALUES (\'token_packages\', :value, NOW(), NOW()) ' +
      'ON CONFLICT ("key") DO UPDATE SET "value" = EXCLUDED."value", "updatedAt" = NOW()',
      {
        replacements: { value },
        type: QueryTypes.INSERT
      }
    );
    console.log('✅ Token packages seeded successfully');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
    process.exit(1);
  }
}

seed();
