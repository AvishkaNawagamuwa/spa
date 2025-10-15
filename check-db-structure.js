const db = require('./backend/config/database');

async function checkDatabaseStructure() {
    try {
        console.log('🔍 Checking spas table structure...');

        // Check spas table columns
        const [spaColumns] = await db.execute('DESCRIBE spas');
        console.log('📋 Spas table columns:');
        spaColumns.forEach(col => {
            console.log(`  - ${col.Field} (${col.Type}) - ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${col.Key ? '- ' + col.Key : ''}`);
        });

        console.log('\n🔍 Checking payments table structure...');

        // Check payments table columns
        const [paymentColumns] = await db.execute('DESCRIBE payments');
        console.log('📋 Payments table columns:');
        paymentColumns.forEach(col => {
            console.log(`  - ${col.Field} (${col.Type}) - ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${col.Key ? '- ' + col.Key : ''}`);
        });

        console.log('\n✅ Database structure check complete');

    } catch (error) {
        console.error('❌ Error checking database structure:', error);
    } finally {
        process.exit(0);
    }
}

checkDatabaseStructure();