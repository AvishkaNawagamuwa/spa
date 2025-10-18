const mysql = require('mysql2/promise');

async function fixSPA72Payment() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '12345678',
        database: 'lsa_spa_management'
    });

    try {
        console.log('🔧 Fixing SPA ID 72 payment date...\n');

        // Reset next_payment_date to today for SPA 72
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

        await connection.execute(
            'UPDATE spas SET next_payment_date = ? WHERE id = ?',
            [today, 72]
        );

        console.log(`✅ Updated SPA 72 next_payment_date to ${today}`);

        // Check if there are any pending payments for this SPA
        const [payments] = await connection.execute(
            'SELECT COUNT(*) as count FROM payments WHERE spa_id = ? AND status = "pending"',
            [72]
        );

        console.log(`✅ Found ${payments[0].count} pending payments for SPA 72`);
        console.log('\n🎉 SPA 72 is now ready for payments!');

    } catch (error) {
        console.error('❌ Database error:', error.message);
    } finally {
        await connection.end();
    }
}

fixSPA72Payment();