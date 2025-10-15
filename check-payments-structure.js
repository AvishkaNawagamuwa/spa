const db = require('./backend/config/database');

async function checkPaymentsTableStructure() {
    try {
        console.log('🔍 Checking payments table structure...');

        // Check payments table structure
        const [paymentsColumns] = await db.execute('DESCRIBE payments');
        console.log('\n📋 PAYMENTS TABLE COLUMNS:');
        console.log('Column Name | Type | Null | Key | Default | Extra');
        console.log('------------|------|------|-----|---------|-------');
        paymentsColumns.forEach(col => {
            console.log(`${col.Field} | ${col.Type} | ${col.Null} | ${col.Key || 'None'} | ${col.Default || 'None'} | ${col.Extra || 'None'}`);
        });

        // Check if there are any payments with slip_path
        const [samplePayments] = await db.execute('SELECT * FROM payments LIMIT 3');
        console.log('\n💳 SAMPLE PAYMENT RECORDS:');
        if (samplePayments.length > 0) {
            samplePayments.forEach((payment, index) => {
                console.log(`\n--- Payment ${index + 1} ---`);
                console.log(`ID: ${payment.id}`);
                console.log(`SPA ID: ${payment.spa_id}`);
                console.log(`Amount: ${payment.amount}`);
                console.log(`Payment Type: ${payment.payment_type}`);
                console.log(`Payment Method: ${payment.payment_method}`);
                console.log(`Payment Status: ${payment.status}`);
                console.log(`Slip Path: ${payment.slip_path}`);
                console.log(`Slip Name: ${payment.slip_name}`);
                console.log(`Payment Date: ${payment.payment_date}`);
                console.log(`Reference: ${payment.reference_number}`);
            });
        } else {
            console.log('No payment records found.');
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

checkPaymentsTableStructure();