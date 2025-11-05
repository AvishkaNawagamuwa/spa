const db = require('./backend/config/database');

async function checkBankSlipData() {
    try {
        // Get sample payments with bank transfer
        const [payments] = await db.execute(`
      SELECT 
        p.id, 
        p.payment_method, 
        p.bank_slip_path,
        p.payment_status,
        s.reference_number as spa_ref,
        s.name as spa_name
      FROM payments p
      JOIN spas s ON p.spa_id = s.id
      WHERE p.payment_method = 'bank_transfer' 
      ORDER BY p.created_at DESC
      LIMIT 5
    `);

        console.log('\n💳 Recent bank transfer payments:');
        console.log('='.repeat(80));

        if (payments.length === 0) {
            console.log('❌ No bank transfer payments found');
        } else {
            payments.forEach(payment => {
                console.log(`\nPayment ID: ${payment.id}`);
                console.log(`SPA: ${payment.spa_name} (${payment.spa_ref})`);
                console.log(`Status: ${payment.payment_status}`);
                console.log(`bank_slip_path: ${payment.bank_slip_path || '❌ NULL (This is the problem!)'}`);
                console.log('-'.repeat(80));
            });
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

checkBankSlipData();
