const db = require('./backend/config/database');

async function checkImageColumn() {
    try {
        console.log('🔍 Checking therapist image columns...\n');

        // Check all columns with 'image' in the name
        const [columns] = await db.execute(`
            SHOW COLUMNS FROM therapists WHERE Field LIKE '%image%'
        `);

        console.log('Found image columns:');
        columns.forEach(col => {
            console.log(`  - ${col.Field} (${col.Type})`);
        });

        // Check if there's actual data
        console.log('\n📊 Sample therapist data:');
        const [therapists] = await db.execute(`
            SELECT id, first_name, last_name, name, therapist_image
            FROM therapists
            LIMIT 5
        `);

        therapists.forEach(t => {
            console.log(`  ID ${t.id}: ${t.first_name || t.name || 'N/A'} ${t.last_name || ''}`);
            console.log(`    therapist_image: ${t.therapist_image || 'NULL'}`);
        });

        await db.end();

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

checkImageColumn();
