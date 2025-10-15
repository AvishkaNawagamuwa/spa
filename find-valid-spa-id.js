require('dotenv').config();
const mysql = require('mysql2/promise');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '12345678',
    database: 'lsa_spa_management'
};

async function findValidSpaId() {
    let connection;

    try {
        console.log('🔗 Connecting to MySQL...');
        connection = await mysql.createConnection(dbConfig);

        // First check the table structure
        const [columns] = await connection.execute(`
            SHOW COLUMNS FROM spas
        `);

        console.log('📋 Spas table columns:');
        columns.forEach(col => {
            console.log(`   ${col.Field}: ${col.Type}`);
        });

        const [spas] = await connection.execute(`
            SELECT id, name, owner_fname, owner_lname, email 
            FROM spas 
            ORDER BY id ASC 
            LIMIT 5
        `);

        console.log('\n📋 Available SPAs:');
        spas.forEach(spa => {
            console.log(`   ID: ${spa.id} - ${spa.name} (${spa.owner_fname} ${spa.owner_lname}) - ${spa.email}`);
        });

        return spas.length > 0 ? spas[0].id : null;

    } catch (error) {
        console.error('❌ Error:', error.message);
        return null;
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

findValidSpaId();