require('dotenv').config();
const sequelize = require('./config/database');
const User = require('./models/User');

async function createAdmin() {
  try {
    await sequelize.authenticate();
    await User.sync();
    
    const [admin, created] = await User.findOrCreate({
      where: { email: 'admin@example.com' },
      defaults: {
        name: 'System Admin',
        role: 'admin',
        credits: 999999,
        tier: 'PREMIUM'
      }
    });

    if (created) {
      console.log('Created default admin user: admin@example.com');
    } else {
      console.log('Admin user already exists.');
    }

    const [dev, devCreated] = await User.findOrCreate({
      where: { email: 'developer@example.com' },
      defaults: {
        name: 'Lead Developer',
        role: 'developer',
        credits: 999999,
        tier: 'PREMIUM'
      }
    });

    if (devCreated) {
      console.log('Created default developer user: developer@example.com');
    }

  } catch (err) {
    console.error('Error creating users:', err);
  } finally {
    process.exit(0);
  }
}

createAdmin();
