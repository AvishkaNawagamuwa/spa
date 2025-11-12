const db = require('./backend/config/database');

async function checkColumns() {
    try {
        const [columns] = await db.execute(`
            SHOW COLUMNS FROM spas
        `);

        console.log('\n=== SPAS TABLE COLUMNS ===\n');
        columns.forEach(col => {
            console.log(`Column: ${col.Field} | Type: ${col.Type}`);
        });

        // Also check first verified spa data
        const [spas] = await db.execute(`
            SELECT * FROM spas WHERE status = 'verified' LIMIT 1
        `);

        if (spas.length > 0) {
            console.log('\n=== FIRST VERIFIED SPA DATA ===\n');
            console.log(JSON.stringify(spas[0], null, 2));
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkColumns();
