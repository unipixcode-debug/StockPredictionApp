const GlobalSetting = require('./models/GlobalSetting');

async function seed() {
    console.log('Starting seed process...');
    const packages = [
        { key: 'pkg_starter_tokens', value: '100', description: 'Starter Paketi Token Miktarı' },
        { key: 'pkg_starter_price', value: '₺49.99', description: 'Starter Paketi Fiyatı' },
        { key: 'pkg_pro_tokens', value: '500', description: 'Pro Paketi Token Miktarı' },
        { key: 'pkg_pro_price', value: '₺199.99', description: 'Pro Paketi Fiyatı' },
        { key: 'pkg_whale_tokens', value: '2000', description: 'Whale Paketi Token Miktarı' },
        { key: 'pkg_whale_price', value: '₺699.99', description: 'Whale Paketi Fiyatı' }
    ];

    try {
        for (const pkg of packages) {
            console.log(`Upserting ${pkg.key}...`);
            await GlobalSetting.upsert(pkg);
        }
        console.log('SEED_SUCCESS');
    } catch (err) {
        console.error('SEED_DB_ERROR:', err);
        throw err;
    }
}

seed().catch(err => {
    console.error('SEED_FATAL_ERROR:', err);
    process.exit(1);
});
