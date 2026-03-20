const sequelize = require('./config/database');

async function migrate() {
    try {
        console.log('🚀 Starting Database Migration: Adding columns to NewsSummaries...');
        
        const [results, metadata] = await sequelize.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='NewsSummaries' AND column_name='sentimentScore') THEN
                    ALTER TABLE "NewsSummaries" ADD COLUMN "sentimentScore" INTEGER DEFAULT 50;
                END IF;

                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='NewsSummaries' AND column_name='tags') THEN
                    ALTER TABLE "NewsSummaries" ADD COLUMN "tags" TEXT;
                END IF;
            END $$;
        `);

        console.log('✅ Migration completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration FAILED:', error.message);
        process.exit(1);
    }
}

migrate();
