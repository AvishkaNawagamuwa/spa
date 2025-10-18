const mysql = require('mysql2/promise');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '12345678',
    database: 'lsa_spa_management'
};

async function testPaymentSystem() {
    let connection;

    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ Connected to database');

        // Test 1: Check current payment system structure
        console.log('\n🔍 TEST 1: Current Payment System Structure');
        const [payments] = await connection.execute(`
            SELECT 
                p.id, p.spa_id, p.payment_plan, p.payment_status, 
                p.amount, p.created_at,
                s.name as spa_name, s.status as spa_status, 
                s.next_payment_date
            FROM payments p
            LEFT JOIN spas s ON p.spa_id = s.id
            ORDER BY p.created_at DESC
            LIMIT 3
        `);
        console.table(payments);

        // Test 2: Simulate next payment date scenarios
        console.log('\n🔍 TEST 2: Testing Payment Date Scenarios');

        // Create test scenario: Set a spa with future payment date
        const testSpaId = 71; // Using existing spa
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 10); // 10 days in future

        await connection.execute(`
            UPDATE spas 
            SET next_payment_date = ?, status = 'verified'
            WHERE id = ?
        `, [futureDate.toISOString().split('T')[0], testSpaId]);

        console.log(`📅 Set SPA ID ${testSpaId} next payment date to: ${futureDate.toLocaleDateString('en-GB')}`);

        // Test 3: Check payment availability logic
        console.log('\n🔍 TEST 3: Payment Availability Logic');
        const [spaCheck] = await connection.execute(`
            SELECT 
                id, name, status, next_payment_date,
                DATEDIFF(next_payment_date, CURDATE()) as days_until_payment,
                CASE 
                    WHEN next_payment_date IS NULL THEN 'First payment allowed'
                    WHEN CURDATE() >= next_payment_date THEN 'Payment allowed'
                    ELSE 'Payment not yet available'
                END as payment_status
            FROM spas 
            WHERE id = ?
        `, [testSpaId]);

        console.table(spaCheck);

        // Test 4: Create overdue payment scenario
        console.log('\n🔍 TEST 4: Testing Overdue Payment Logic');
        const overdueDate = new Date();
        overdueDate.setDate(overdueDate.getDate() - 10); // 10 days ago

        await connection.execute(`
            UPDATE spas 
            SET next_payment_date = ?
            WHERE id = ?
        `, [overdueDate.toISOString().split('T')[0], testSpaId]);

        const [overdueCheck] = await connection.execute(`
            SELECT 
                id, name, status, next_payment_date,
                DATEDIFF(CURDATE(), next_payment_date) as days_overdue,
                CASE 
                    WHEN DATEDIFF(CURDATE(), next_payment_date) > 5 THEN 'Should be unverified'
                    ELSE 'Still within grace period'
                END as should_update_status
            FROM spas 
            WHERE id = ?
        `, [testSpaId]);

        console.table(overdueCheck);

        // Test 5: Test different payment plans
        console.log('\n🔍 TEST 5: Payment Plan Duration Calculation');
        const plans = [
            { id: 'monthly', months: 1 },
            { id: 'quarterly', months: 3 },
            { id: 'half-yearly', months: 6 },
            { id: 'annual', months: 12 }
        ];

        const currentDate = new Date();
        console.log('Current date:', currentDate.toLocaleDateString('en-GB'));

        plans.forEach(plan => {
            const nextDate = new Date(currentDate);
            nextDate.setMonth(nextDate.getMonth() + plan.months);
            console.log(`${plan.id}: Next payment due ${nextDate.toLocaleDateString('en-GB')}`);
        });

        // Test 6: Reset test data
        console.log('\n🔄 Resetting test data...');
        const normalDate = new Date();
        normalDate.setFullYear(normalDate.getFullYear() + 1); // 1 year from now

        await connection.execute(`
            UPDATE spas 
            SET next_payment_date = ?, status = 'verified'
            WHERE id = ?
        `, [normalDate.toISOString().split('T')[0], testSpaId]);

        console.log('✅ Test completed successfully');
        console.log(`📅 SPA ID ${testSpaId} reset to normal status with payment date: ${normalDate.toLocaleDateString('en-GB')}`);

    } catch (error) {
        console.error('❌ Test error:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

testPaymentSystem();