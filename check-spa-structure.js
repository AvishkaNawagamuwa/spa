const db = require('./backend/config/database');

async function checkSpaTableStructure() {
    try {
        console.log('🔍 Checking SPA table structure...');

        // Check table structure
        const [columns] = await db.execute(`
            DESCRIBE lsa_spa_management.spas
        `);

        console.log('📊 SPA table columns:');
        columns.forEach(col => {
            console.log(`- ${col.Field} (${col.Type})`);
        });

        // Also check a sample record to see the actual data
        const [sample] = await db.execute(`
            SELECT * FROM lsa_spa_management.spas LIMIT 1
        `);

        if (sample.length > 0) {
            console.log('\n📋 Sample record columns:');
            Object.keys(sample[0]).forEach(key => {
                console.log(`- ${key}: ${sample[0][key]}`);
            });
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        process.exit();
    }
}

checkSpaTableStructure();