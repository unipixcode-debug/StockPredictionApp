const { Sequelize } = require('sequelize');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const sequelize = new Sequelize(
    process.env.DB_NAME || 'prediction_db',
    process.env.DB_USER || 'erdem',
    process.env.DB_PASS || 'password',
    {
        host: process.env.DB_HOST || '127.0.0.1',
        dialect: 'postgres',
        logging: false, 
    }
);

// Test the connection
sequelize.authenticate()
    .then(() => console.log('PostgreSQL (Sequelize) veritabanına başarıyla bağlanıldı.'))
    .catch(err => console.error('Veritabanı bağlantı hatası:', err));

module.exports = sequelize;
