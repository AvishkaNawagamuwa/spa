const db = require('./backend/config/database');

async function checkPaymentColumns() {
    try {
        // Get table structure
        const [columns] = await db.execute('DESCRIBE payments');
        console.log('\n📋 Payments table columns:');
        columns.forEach(col => {
            console.log(`   - ${col.Field} (${col.Type})`);
        });

        // Get a sample payment with bank transfer
        const [payments] = await db.execute(`
      SELECT id, payment_method, bank_slip_path, transfer_slip_path 
      FROM payments 
      WHERE payment_method = 'bank_transfer' 
      LIMIT 3
    `);

        console.log('\n💳 Sample bank transfer payments:');
        payments.forEach(payment => {
            console.log(`   Payment ID: ${payment.id}`);
            console.log(`   Method: ${payment.payment_method}`);
            console.log(`   bank_slip_path: ${payment.bank_slip_path || 'NULL'}`);
            console.log(`   transfer_slip_path: ${payment.transfer_slip_path || 'NULL'}`);
            console.log('   ---');
        });

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

checkPaymentColumns();
