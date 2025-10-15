const mysql = require('mysql2/promise');

// Database configuration
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '12345678',
    database: 'lsa_spa_management'
};

async function checkPaymentTypeColumn() {
    try {
        const connection = await mysql.createConnection(dbConfig);

        console.log('🔍 Checking payment_type column structure...\n');

        // Check the column definition
        const [columns] = await connection.execute(`
            DESCRIBE payments
        `);

        console.log('📊 Payments table structure:');
        console.table(columns);

        // Check what values are currently in payment_type
        const [values] = await connection.execute(`
            SELECT DISTINCT payment_type FROM payments WHERE payment_type IS NOT NULL
        `);

        console.log('\n📊 Current payment_type values:');
        console.table(values);

        await connection.end();

    } catch (error) {
        console.error('❌ Check error:', error.message);
    }
}

checkPaymentTypeColumn();