const mysql = require('mysql2/promise');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '12345678',
    database: 'lsa_spa_management'
};

async function checkSpaPaymentStatus() {
    let connection;

    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ Connected to database');

        // Check the current spa that's trying to make payment (spa_id 71 based on our previous tests)
        const [spaStatus] = await connection.execute(`
            SELECT 
                id, name, status, next_payment_date,
                CASE 
                    WHEN next_payment_date IS NULL THEN 'No payment date set - should allow payment'
                    WHEN CURDATE() >= next_payment_date THEN 'Payment allowed'
                    ELSE CONCAT('Payment blocked until ', DATE_FORMAT(next_payment_date, '%d/%m/%Y'))
                END as payment_availability,
                DATEDIFF(next_payment_date, CURDATE()) as days_until_payment
            FROM spas 
            WHERE id = 71
        `);

        console.log('\n📊 Current SPA Payment Status:');
        console.table(spaStatus);

        // Also check recent payments
        const [recentPayments] = await connection.execute(`
            SELECT 
                id, payment_plan, payment_status, amount, created_at
            FROM payments 
            WHERE spa_id = 71 
            ORDER BY created_at DESC 
            LIMIT 3
        `);

        console.log('\n📊 Recent Payments:');
        console.table(recentPayments);

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

checkSpaPaymentStatus();