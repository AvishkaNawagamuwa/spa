const db = require('./backend/config/database');

async function checkRejectedPayments() {
    try {
        console.log('🔍 Checking for rejected payments...');

        const [rejected] = await db.execute(
            'SELECT * FROM payments WHERE payment_status = ?',
            ['rejected']
        );

        console.log(`\n📊 Found ${rejected.length} rejected payments:`);

        if (rejected.length > 0) {
            rejected.forEach((payment, index) => {
                console.log(`\n--- Rejected Payment ${index + 1} ---`);
                console.log(`ID: ${payment.id}`);
                console.log(`SPA ID: ${payment.spa_id}`);
                console.log(`Payment Type: ${payment.payment_type}`);
                console.log(`Payment Method: ${payment.payment_method}`);
                console.log(`Payment Plan: ${payment.payment_plan}`);
                console.log(`Amount: ${payment.amount}`);
                console.log(`Rejection Reason: ${payment.rejection_reason || 'No reason provided'}`);
                console.log(`Bank Slip Path: ${payment.bank_slip_path || 'Not provided'}`);
                console.log(`Created: ${payment.created_at}`);
                console.log(`Updated: ${payment.updated_at}`);
            });
        } else {
            console.log('No rejected payments found.');
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

checkRejectedPayments();