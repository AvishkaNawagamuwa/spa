const mysql = require('mysql2/promise');

// Database configuration - adjust these to match your setup
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '12345678', // Your MySQL password
    database: 'lsa_spa_management'
};

async function checkPaymentsData() {
    try {
        const connection = await mysql.createConnection(dbConfig);

        console.log('🔍 Checking payments table data...\n');

        // Check all payments
        const [payments] = await connection.execute(`
            SELECT 
                p.id,
                p.spa_id,
                p.payment_status,
                p.payment_plan,
                p.payment_method,
                p.amount,
                p.created_at,
                s.name as spa_name
            FROM payments p
            LEFT JOIN spas s ON p.spa_id = s.id
            ORDER BY p.created_at DESC
        `);

        console.log('📊 All Payments:');
        console.table(payments);

        // Check spas table for next_payment_date
        const [spas] = await connection.execute(`
            SELECT 
                id,
                name,
                next_payment_date,
                payment_status as spa_payment_status
            FROM spas
        `);

        console.log('\n📊 SPAs with payment dates:');
        console.table(spas);

        await connection.end();

    } catch (error) {
        console.error('❌ Database check error:', error.message);
    }
}

checkPaymentsData();