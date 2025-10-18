const mysql = require('mysql2/promise');

async function checkSPA72Status() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'lsa_spa_management'
    });

    try {
        console.log('🔍 Checking current status for SPA ID 72...\n');

        // Check SPA details
        const [spa] = await connection.execute(
            'SELECT id, name, email, status, next_payment_date, payment_blocked FROM spas WHERE id = ?',
            [72]
        );

        if (spa.length > 0) {
            const spaData = spa[0];
            console.log('📊 SPA 72 Current Status:');
            console.log(`   ID: ${spaData.id}`);
            console.log(`   Name: ${spaData.name}`);
            console.log(`   Email: ${spaData.email}`);
            console.log(`   Status: ${spaData.status}`);
            console.log(`   Next Payment Date: ${spaData.next_payment_date}`);
            console.log(`   Payment Blocked: ${spaData.payment_blocked}`);
            console.log('');

            // Check recent payments
            const [payments] = await connection.execute(
                `SELECT id, plan_id, amount, payment_method, status, created_at, next_payment_date 
                 FROM payments WHERE spa_id = ? ORDER BY created_at DESC LIMIT 3`,
                [72]
            );

            console.log('💰 Recent Payments for SPA 72:');
            payments.forEach((payment, index) => {
                console.log(`   ${index + 1}. ID: ${payment.id}, Plan: ${payment.plan_id}, Amount: ${payment.amount}`);
                console.log(`      Status: ${payment.status}, Method: ${payment.payment_method}`);
                console.log(`      Created: ${payment.created_at}, Next Payment: ${payment.next_payment_date}`);
                console.log('');
            });

        } else {
            console.log('❌ SPA with ID 72 not found!');
        }

    } catch (error) {
        console.error('❌ Database error:', error.message);
    } finally {
        await connection.end();
    }
}

checkSPA72Status();