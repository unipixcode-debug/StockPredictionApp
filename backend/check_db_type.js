const sequelize = require('./config/database');
sequelize.query('SELECT column_name, data_type FROM information_schema.columns WHERE table_name = \'AdminLogs\' AND column_name = \'adminId\'')
    .then(([results]) => {
        console.log('--- DB COLUMN INFO ---');
        console.log(JSON.stringify(results, null, 2));
        console.log('--- END ---');
        process.exit(0);
    })
    .catch(e => {
        console.error(e);
        process.exit(1);
    });
