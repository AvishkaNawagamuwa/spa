const mysql = require('mysql2/promise');

async function fixBlacklistedSpaStatus() {
    let connection;

    try {
        // Create database connection
        connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'spa_therapist_management'
        });

        console.log('Connected to database successfully!');

        // First, check current status of spas with blacklist_reason
        console.log('\n=== CHECKING CURRENT BLACKLISTED SPAS ===');
        const [blacklistedSpas] = await connection.execute(`
            SELECT id, name, status, blacklist_reason, blacklisted_at 
            FROM spas 
            WHERE blacklist_reason IS NOT NULL
        `);

        console.log('Current blacklisted spas:');
        blacklistedSpas.forEach(spa => {
            console.log(`ID: ${spa.id}, Name: ${spa.name}, Status: ${spa.status}, Reason: ${spa.blacklist_reason}`);
        });

        if (blacklistedSpas.length > 0) {
            // Update all blacklisted spas to have status = 'blacklisted'
            console.log('\n=== UPDATING BLACKLISTED SPAS STATUS ===');
            const [result] = await connection.execute(`
                UPDATE spas 
                SET status = 'blacklisted' 
                WHERE blacklist_reason IS NOT NULL AND status != 'blacklisted'
            `);

            console.log(`Updated ${result.affectedRows} spas to have status = 'blacklisted'`);

            // Verify the update
            console.log('\n=== VERIFICATION AFTER UPDATE ===');
            const [updatedSpas] = await connection.execute(`
                SELECT id, name, status, blacklist_reason 
                FROM spas 
                WHERE blacklist_reason IS NOT NULL
            `);

            console.log('Updated blacklisted spas:');
            updatedSpas.forEach(spa => {
                console.log(`ID: ${spa.id}, Name: ${spa.name}, Status: ${spa.status}, Reason: ${spa.blacklist_reason}`);
            });
        } else {
            console.log('No blacklisted spas found in the database.');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        if (connection) {
            await connection.end();
            console.log('\nDatabase connection closed.');
        }
    }
}

fixBlacklistedSpaStatus();