const db = require('./backend/config/database');

async function checkSpa87() {
    try {
        const [spa] = await db.execute(`
            SELECT 
                id, name, 
                spa_br_number, email, owner_email,
                phone, spa_tel,
                address, address_line1, address_line2
            FROM spas 
            WHERE id = 87
        `);

        if (spa.length > 0) {
            console.log('\n=== SPA ID 87 DATA ===\n');
            console.log(JSON.stringify(spa[0], null, 2));
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkSpa87();
