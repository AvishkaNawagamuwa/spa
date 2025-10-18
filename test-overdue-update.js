const mysql = require('mysql2/promise');
const PaymentStatusChecker = require('./backend/services/paymentStatusChecker');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '12345678',
    database: 'lsa_spa_management'
};

async function testOverdueStatusUpdate() {
    let connection;

    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ Connected to database');

        // Step 1: Create an overdue payment scenario
        console.log('\n📋 Step 1: Creating overdue payment scenario');
        const testSpaId = 71;
        const overdueDate = new Date();
        overdueDate.setDate(overdueDate.getDate() - 7); // 7 days ago (more than 5 days)

        // Set spa to verified status with overdue payment date
        await connection.execute(`
            UPDATE spas 
            SET status = 'verified', next_payment_date = ?
            WHERE id = ?
        `, [overdueDate.toISOString().split('T')[0], testSpaId]);

        console.log(`📅 Set SPA ID ${testSpaId} to 'verified' with overdue date: ${overdueDate.toLocaleDateString('en-GB')}`);

        // Step 2: Check current status
        const [beforeCheck] = await connection.execute(`
            SELECT id, name, status, next_payment_date,
                   DATEDIFF(CURDATE(), next_payment_date) as days_overdue
            FROM spas WHERE id = ?
        `, [testSpaId]);

        console.log('\n📊 Status BEFORE auto-update:');
        console.table(beforeCheck);

        // Step 3: Run the payment status checker
        console.log('\n🔄 Step 3: Running payment status checker...');
        await PaymentStatusChecker.runManualCheck();

        // Step 4: Check status after update
        const [afterCheck] = await connection.execute(`
            SELECT id, name, status, next_payment_date,
                   DATEDIFF(CURDATE(), next_payment_date) as days_overdue
            FROM spas WHERE id = ?
        `, [testSpaId]);

        console.log('\n📊 Status AFTER auto-update:');
        console.table(afterCheck);

        // Step 5: Verify the change
        if (afterCheck[0].status === 'unverified') {
            console.log('✅ SUCCESS: SPA status correctly updated to "unverified"');
        } else {
            console.log('❌ FAILED: SPA status was not updated');
        }

        // Step 6: Reset for normal operation
        console.log('\n🔄 Step 6: Resetting SPA to normal status...');
        const futureDate = new Date();
        futureDate.setFullYear(futureDate.getFullYear() + 1); // 1 year from now

        await connection.execute(`
            UPDATE spas 
            SET status = 'verified', next_payment_date = ?
            WHERE id = ?
        `, [futureDate.toISOString().split('T')[0], testSpaId]);

        console.log(`✅ Reset SPA ID ${testSpaId} to verified status with future payment date`);

    } catch (error) {
        console.error('❌ Test error:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

testOverdueStatusUpdate();