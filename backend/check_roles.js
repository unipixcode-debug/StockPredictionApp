const { User } = require('./models');
User.findAll({ attributes: ['email', 'role'] })
    .then(users => {
        console.log('--- USER ROLES ---');
        users.forEach(u => console.log(`${u.email}: ${u.role}`));
        console.log('--- END ---');
        process.exit(0);
    })
    .catch(e => {
        console.error(e);
        process.exit(1);
    });
