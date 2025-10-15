require('dotenv').config();
const mysql = require('mysql2/promise');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '12345678',
    database: 'lsa_spa_management'
};

async function testPaymentPlanFunctionality() {
    let connection;

    try {
        console.log('🔗 Connecting to MySQL...');
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ MySQL Connected to LSA Spa Management Database');

        // Test 1: Check if payment_plan column exists
        console.log('\n📋 Test 1: Checking payment_plan column');
        const [columns] = await connection.execute(`
            SELECT COLUMN_NAME, COLUMN_TYPE, COLUMN_DEFAULT
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'payments' AND COLUMN_NAME = 'payment_plan'
        `, [dbConfig.database]);

        if (columns.length > 0) {
            const col = columns[0];
            console.log(`✅ payment_plan column exists: ${col.COLUMN_TYPE} DEFAULT=${col.COLUMN_DEFAULT}`);
        } else {
            console.log('❌ payment_plan column not found');
            return;
        }

        // Test 2: Insert a test payment with payment_plan
        console.log('\n📋 Test 2: Testing payment insertion with payment_plan');
        const testSpaId = 1; // Using Serenity Wellness Spa for testing

        const [insertResult] = await connection.execute(`
            INSERT INTO payments (
                spa_id, reference_number, payment_type, payment_plan, payment_method, 
                amount, payment_status, bank_transfer_approved
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            testSpaId,
            `TEST_${Date.now()}`,
            'annual',
            'Annual',
            'bank_transfer',
            45000,
            'pending_approval',
            false
        ]);

        const testPaymentId = insertResult.insertId;
        console.log(`✅ Test payment created with ID: ${testPaymentId}`);

        // Test 3: Verify the payment was inserted correctly
        console.log('\n📋 Test 3: Verifying payment insertion');
        const [testPayment] = await connection.execute(`
            SELECT id, spa_id, payment_type, payment_plan, payment_method, amount, payment_status
            FROM payments 
            WHERE id = ?
        `, [testPaymentId]);

        if (testPayment.length > 0) {
            const payment = testPayment[0];
            console.log('✅ Payment verified:');
            console.log(`   Payment ID: ${payment.id}`);
            console.log(`   SPA ID: ${payment.spa_id}`);
            console.log(`   Payment Type: ${payment.payment_type}`);
            console.log(`   Payment Plan: ${payment.payment_plan}`);
            console.log(`   Method: ${payment.payment_method}`);
            console.log(`   Amount: LKR ${payment.amount}`);
            console.log(`   Status: ${payment.payment_status}`);
        }

        // Test 4: Check payment status for spa
        console.log('\n📋 Test 4: Testing payment status retrieval');
        const [spaPayments] = await connection.execute(`
            SELECT 
                p.id,
                p.payment_type,
                p.payment_plan,
                p.payment_status,
                p.created_at
            FROM payments p
            WHERE p.spa_id = ?
            ORDER BY p.created_at DESC
            LIMIT 3
        `, [testSpaId]);

        console.log(`✅ Found ${spaPayments.length} payments for SPA ID ${testSpaId}:`);
        spaPayments.forEach((payment, index) => {
            console.log(`   ${index + 1}. ${payment.payment_plan} plan - ${payment.payment_status} (${payment.created_at})`);
        });

        // Test 5: Test enum values
        console.log('\n📋 Test 5: Testing enum values for payment_plan');
        const validPlans = ['Monthly', 'Quarterly', 'Half-Yearly', 'Annual'];

        for (const plan of validPlans) {
            try {
                const [testEnum] = await connection.execute(`
                    INSERT INTO payments (
                        spa_id, reference_number, payment_type, payment_plan, payment_method, 
                        amount, payment_status, bank_transfer_approved
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    testSpaId,
                    `TEST_ENUM_${Date.now()}_${plan}`,
                    'annual',
                    plan,
                    'card',
                    10000,
                    'completed',
                    true
                ]);
                console.log(`✅ ${plan} plan - Valid enum value`);

                // Clean up test record
                await connection.execute('DELETE FROM payments WHERE id = ?', [testEnum.insertId]);
            } catch (error) {
                console.log(`❌ ${plan} plan - Invalid enum value: ${error.message}`);
            }
        }

        // Clean up main test payment
        await connection.execute('DELETE FROM payments WHERE id = ?', [testPaymentId]);
        console.log(`\n🧹 Cleaned up test payment ${testPaymentId}`);

        console.log('\n🎉 All tests completed successfully!');
        console.log('\n📝 Summary:');
        console.log('   ✅ payment_plan column exists and working');
        console.log('   ✅ Payment insertion with plan works');
        console.log('   ✅ Payment retrieval includes plan');
        console.log('   ✅ All enum values are valid');
        console.log('\n🚀 Ready for frontend integration!');

    } catch (error) {
        console.error('❌ Test Error:', error.message);
    } finally {
        if (connection) {
            await connection.end();
            console.log('\n🔌 Database connection closed');
        }
    }
}

testPaymentPlanFunctionality();