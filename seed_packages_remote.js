const { GlobalSetting } = require('./models');

async function seed() {
    const packages = [
        { key: 'pkg_starter_tokens', value: '100', description: 'Starter Paketi Token Miktarı' },
        { key: 'pkg_starter_price', value: '₺49.99', description: 'Starter Paketi Fiyatı' },
        { key: 'pkg_pro_tokens', value: '500', description: 'Pro Paketi Token Miktarı' },
        { key: 'pkg_pro_price', value: '₺199.99', description: 'Pro Paketi Fiyatı' },
        { key: 'pkg_whale_tokens', value: '2000', description: 'Whale Paketi Token Miktarı' },
        { key: 'pkg_whale_price', value: '₺699.99', description: 'Whale Paketi Fiyatı' }
    ];

    for (const pkg of packages) {
        await GlobalSetting.upsert(pkg);
    }
    console.log('SEED_SUCCESS');
}

seed().catch(err => {
    console.error('SEED_ERROR:', err);
    process.exit(1);
});
