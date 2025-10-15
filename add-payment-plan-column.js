require('dotenv').config();
const mysql = require('mysql2/promise');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '12345678',
    database: 'lsa_spa_management'
};

async function addPaymentPlanColumn() {
    let connection;

    try {
        console.log('🔗 Connecting to MySQL...');
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ MySQL Connected to LSA Spa Management Database');

        // Check if payment_plan column already exists
        const [columns] = await connection.execute(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'payments' AND COLUMN_NAME = 'payment_plan'
        `, [dbConfig.database]);

        if (columns.length > 0) {
            console.log('✅ payment_plan column already exists');
            return;
        }

        // Add payment_plan column
        await connection.execute(`
            ALTER TABLE payments 
            ADD COLUMN payment_plan ENUM('Monthly', 'Quarterly', 'Half-Yearly', 'Annual') 
            NOT NULL DEFAULT 'Annual' 
            AFTER payment_type
        `);

        console.log('✅ Successfully added payment_plan column to payments table');

        // Update existing records to have a default plan based on payment_type
        await connection.execute(`
            UPDATE payments 
            SET payment_plan = CASE 
                WHEN payment_type = 'monthly' THEN 'Monthly'
                WHEN payment_type = 'annual' THEN 'Annual'
                ELSE 'Annual'
            END
        `);

        console.log('✅ Updated existing payment records with default payment plans');

        // Verify the column was added
        const [newColumns] = await connection.execute(`
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_TYPE
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'payments' AND COLUMN_NAME = 'payment_plan'
        `, [dbConfig.database]);

        if (newColumns.length > 0) {
            const col = newColumns[0];
            console.log(`✅ Column added successfully: ${col.COLUMN_NAME}: ${col.COLUMN_TYPE} (${col.IS_NULLABLE}) DEFAULT=${col.COLUMN_DEFAULT}`);
        }

    } catch (error) {
        console.error('❌ Database Error:', error.message);
    } finally {
        if (connection) {
            await connection.end();
            console.log('\n🔌 Database connection closed');
        }
    }
}

addPaymentPlanColumn();