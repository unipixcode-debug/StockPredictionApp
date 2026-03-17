
const sequelize = require('./config/database');
const User = require('./models/User');
const Prediction = require('./models/Prediction');

async function check() {
    try {
        await sequelize.authenticate();
        const userCount = await User.count();
        const predCount = await Prediction.count();
        console.log(`--- DIAGNOSTIC ---`);
        console.log(`User Count: ${userCount}`);
        console.log(`Prediction Count: ${predCount}`);
        
        const latestUsers = await User.findAll({ limit: 5, order: [['createdAt', 'DESC']] });
        console.log('--- LATEST USERS ---');
        latestUsers.forEach(u => console.log(`${u.id} | ${u.email} | ${u.googleId}`));
        
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
check();
