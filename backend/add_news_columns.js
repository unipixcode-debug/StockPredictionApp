const sequelize = require('./config/database');
async function addCols() {
    try {
        await sequelize.query('ALTER TABLE "NewsSummaries" ADD COLUMN IF NOT EXISTS "titleTR" TEXT;');
        await sequelize.query('ALTER TABLE "NewsSummaries" ADD COLUMN IF NOT EXISTS "titleEN" TEXT;');
        await sequelize.query('ALTER TABLE "NewsSummaries" ADD COLUMN IF NOT EXISTS "snippetTR" TEXT;');
        await sequelize.query('ALTER TABLE "NewsSummaries" ADD COLUMN IF NOT EXISTS "snippetEN" TEXT;');
        console.log("Migration executed successfully.");
    } catch (e) {
        console.error("Migration Error:", e.message);
    }
    process.exit();
}
addCols();
