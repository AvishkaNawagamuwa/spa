const db = require('./backend/config/database');

async function checkCompleteSpas() {
    try {
        const [spas] = await db.execute(`
            SELECT 
                id, name, spa_br_number, owner_fname, owner_lname, 
                owner_email, spa_tel, address_line1, address_line2
            FROM spas 
            WHERE status = 'verified' 
            AND spa_br_number IS NOT NULL 
            AND owner_email IS NOT NULL 
            AND spa_tel IS NOT NULL
            LIMIT 5
        `);

        console.log('\n=== VERIFIED SPAs WITH COMPLETE DATA ===\n');
        console.log(`Found ${spas.length} SPAs with complete data\n`);

        spas.forEach(spa => {
            console.log(`SPA: ${spa.name}`);
            console.log(`BR: ${spa.spa_br_number}`);
            console.log(`Owner: ${spa.owner_fname} ${spa.owner_lname}`);
            console.log(`Email: ${spa.owner_email}`);
            console.log(`Phone: ${spa.spa_tel}`);
            console.log(`Address: ${spa.address_line1}, ${spa.address_line2}`);
            console.log('---');
        });

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkCompleteSpas();
