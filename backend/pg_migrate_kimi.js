const { Client } = require('pg');
require('dotenv').config({ path: './.env' });

async function runSQL() {
    const client = new Client({
        user: process.env.DB_USER || 'erdem',
        password: process.env.DB_PASS || 'password',
        host: process.env.DB_HOST || '127.0.0.1',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'prediction_db',
    });

    try {
        await client.connect();
        console.log('Connected directly to PostgreSQL.');
        
        const res = await client.query(`ALTER TYPE "enum_AIProviders_type" ADD VALUE IF NOT EXISTS 'KIMI';`);
        console.log('Successfully updated ENUM type with KIMI.', res.command);
        
    } catch (e) {
        console.error('Error executing query:', e.message);
    } finally {
        await client.end();
        console.log('Connection closed.');
    }
}

runSQL();
