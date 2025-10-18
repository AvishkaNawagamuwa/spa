const mysql = require('mysql2/promise');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '12345678',
    database: 'lsa_spa_management'
};

async function resetSpa72ForTesting() {
    let connection;

    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ Connected to database');

        // Reset spa ID 72 to allow payments for testing
        const testSpaId = 72;

        console.log(`🔄 Resetting SPA ID ${testSpaId} for payment testing...`);

        // Set next payment date to today (so payments are allowed)
        await connection.execute(`
            UPDATE spas 
            SET next_payment_date = CURDATE()
            WHERE id = ?
        `, [testSpaId]);

        console.log('✅ Reset complete. SPA can now make payments.');

        // Verify the change
        const [updated] = await connection.execute(`
            SELECT 
                id, name, status, next_payment_date,
                CASE 
                    WHEN CURDATE() >= next_payment_date THEN 'Payment allowed'
                    ELSE 'Payment blocked'
                END as payment_status
            FROM spas 
            WHERE id = ?
        `, [testSpaId]);

        console.log('\n📊 Updated SPA Status:');
        console.table(updated);

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

resetSpa72ForTesting();