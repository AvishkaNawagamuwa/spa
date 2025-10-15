// Check the current spas table structure
const mysql = require('mysql2/promise');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '12345678',
    database: 'lsa_spa_management'
};

async function checkTableStructure() {
    let connection;

    try {
        console.log('🔍 Checking spas table structure...\n');

        // Connect to database
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ Database connected successfully\n');

        // Describe spas table
        const [rows] = await connection.execute('DESCRIBE spas');
        console.log('📊 Current spas table structure:');
        console.log('Field\t\t\tType\t\t\tNull\tKey\tDefault\tExtra');
        console.log('═'.repeat(80));

        rows.forEach(row => {
            console.log(`${row.Field.padEnd(20)}\t${row.Type.padEnd(20)}\t${row.Null}\t${row.Key}\t${row.Default}\t${row.Extra}`);
        });

        console.log('\n📋 Checking if rejection_reason column exists...');
        const hasRejectionReason = rows.some(row => row.Field === 'rejection_reason');

        if (hasRejectionReason) {
            console.log('✅ rejection_reason column exists');
        } else {
            console.log('❌ rejection_reason column does NOT exist');
            console.log('💡 Need to add rejection_reason column to spas table');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Stack trace:', error.stack);
    } finally {
        if (connection) {
            await connection.end();
            console.log('🔌 Database connection closed');
        }
    }
}

checkTableStructure();