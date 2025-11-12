const mysql = require('mysql2/promise');

const config = {
    host: 'localhost',
    user: 'root',
    password: '12345678',
    database: 'lsa_spa_management'
};

async function checkAndAddDistrictColumn() {
    let connection;
    try {
        connection = await mysql.createConnection(config);
        console.log('✅ Connected to database successfully!');

        // Check if district column exists
        const [columns] = await connection.execute(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = 'lsa_spa_management' 
            AND TABLE_NAME = 'spas' 
            AND COLUMN_NAME = 'district'
        `);

        if (columns.length > 0) {
            console.log('✅ District column already exists in spas table');
        } else {
            console.log('⚠️ District column does not exist. Adding it now...');

            // Add district column after police_division
            await connection.execute(`
                ALTER TABLE spas 
                ADD COLUMN district VARCHAR(50) NULL AFTER police_division
            `);

            console.log('✅ District column added successfully!');
        }

        // Show current spas table structure
        const [spaColumns] = await connection.execute('DESCRIBE spas');
        console.log('\n📊 Current spas table structure:');
        spaColumns.forEach(col => {
            console.log(`   - ${col.Field} (${col.Type}) ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
        });

        await connection.end();
        console.log('\n✅ Database check completed successfully!');

    } catch (error) {
        console.error('❌ Error:', error.message);
        if (connection) {
            await connection.end();
        }
        process.exit(1);
    }
}

checkAndAddDistrictColumn();
