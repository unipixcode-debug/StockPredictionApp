const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
    process.env.DB_NAME || 'prediction_db',
    process.env.DB_USER || 'postgres',
    process.env.DB_PASS || 'password',
    {
        host: process.env.DB_HOST || 'localhost',
        dialect: 'postgres',
        logging: false, // Set to console.log to see SQL queries
    }
);

// Test the connection
sequelize.authenticate()
    .then(() => console.log('PostgreSQL (Sequelize) veritabanına başarıyla bağlanıldı.'))
    .catch(err => console.error('Veritabanı bağlantı hatası:', err));

module.exports = sequelize;
