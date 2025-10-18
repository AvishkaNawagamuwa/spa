const mysql = require('mysql2/promise');

async function fixSPA72PaymentDateYesterday() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '12345678',
        database: 'lsa_spa_management'
    });

    try {
        console.log('🔧 Setting SPA ID 72 payment date to yesterday...\n');

        // Set next_payment_date to yesterday to ensure payments are allowed
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0]; // YYYY-MM-DD format

        await connection.execute(
            'UPDATE spas SET next_payment_date = ? WHERE id = ?',
            [yesterdayStr, 72]
        );

        console.log(`✅ Updated SPA 72 next_payment_date to ${yesterdayStr}`);
        console.log('✅ Payments should now be allowed for SPA 72');

        // Check the result
        const [spa] = await connection.execute(
            'SELECT id, next_payment_date FROM spas WHERE id = ?',
            [72]
        );

        if (spa.length > 0) {
            console.log(`📊 Current SPA 72 next_payment_date: ${spa[0].next_payment_date}`);
        }

        console.log('\n🎉 SPA 72 is now ready for payments!');

    } catch (error) {
        console.error('❌ Database error:', error.message);
    } finally {
        await connection.end();
    }
}

fixSPA72PaymentDateYesterday();