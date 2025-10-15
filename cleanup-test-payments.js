const mysql = require('mysql2/promise');

// Database configuration
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '12345678',
    database: 'lsa_spa_management'
};

async function clearOldPayments() {
    try {
        const connection = await mysql.createConnection(dbConfig);

        console.log('🧹 Clearing old payment data for testing...\n');

        // Using spa_id 50 (anuradiii) based on the debug output
        const testSpaId = 50;

        console.log(`🎯 Clearing payments for spa_id: ${testSpaId}`);

        // Delete payments for this spa
        const [deleteResult] = await connection.execute(`
            DELETE FROM payments WHERE spa_id = ?
        `, [testSpaId]);

        console.log(`❌ Deleted ${deleteResult.affectedRows} payment records`);

        // Reset spa payment status
        await connection.execute(`
            UPDATE spas SET 
                payment_status = 'pending',
                next_payment_date = NULL,
                annual_fee_paid = false
            WHERE id = ?
        `, [testSpaId]);

        console.log('✅ Reset spa payment status');

        // Verify the cleanup
        const [payments] = await connection.execute(`
            SELECT * FROM payments WHERE spa_id = ?
        `, [testSpaId]);

        const [spa] = await connection.execute(`
            SELECT id, name, payment_status, next_payment_date FROM spas WHERE id = ?
        `, [testSpaId]);

        console.log('\n📊 After cleanup:');
        console.log('Payments for this spa:', payments.length);
        console.log('Spa status:', spa[0]);

        await connection.end();

        console.log('\n🎉 Cleanup complete! Now you can test the initial free plan selection.');

    } catch (error) {
        console.error('❌ Cleanup error:', error.message);
    }
}

clearOldPayments();