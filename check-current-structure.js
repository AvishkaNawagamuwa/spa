const mysql = require('mysql2/promise');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '12345678',
    database: 'lsa_spa_management'
};

async function checkDatabaseStructure() {
    let connection;

    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ Connected to database');

        // Check payments table structure
        console.log('\n📊 PAYMENTS TABLE STRUCTURE:');
        const [paymentsColumns] = await connection.execute("DESCRIBE payments");
        console.table(paymentsColumns);

        // Check spas table structure (relevant columns)
        console.log('\n📊 SPAS TABLE STRUCTURE (Payment Related Columns):');
        const [spasColumns] = await connection.execute(`
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = 'lsa_spa_management' 
            AND TABLE_NAME = 'spas' 
            AND COLUMN_NAME IN ('status', 'payment_status', 'next_payment_date', 'annual_fee_paid')
        `);
        console.table(spasColumns);

        // Check current payment data
        console.log('\n📊 CURRENT PAYMENT DATA:');
        const [payments] = await connection.execute(`
            SELECT 
                p.id, p.spa_id, p.payment_plan, p.payment_status, p.payment_method, 
                p.amount, p.created_at, s.name as spa_name, s.status as spa_status,
                s.next_payment_date
            FROM payments p
            LEFT JOIN spas s ON p.spa_id = s.id
            ORDER BY p.created_at DESC
            LIMIT 5
        `);
        console.table(payments);

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

checkDatabaseStructure();