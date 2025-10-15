const db = require('./backend/config/database');

async function debugAnuradiiiPayments() {
    try {
        console.log('🔍 Debugging anuradiii payments...');

        // Find the SPA
        const [spa] = await db.execute(`
            SELECT id, spa_name, status, registration_no 
            FROM lsa_spa_management.spas 
            WHERE spa_name = 'anuradiii' OR registration_no = 'LSA0050'
        `);

        if (spa.length === 0) {
            console.log('❌ SPA not found');
            return;
        }

        console.log('📊 SPA Details:', spa[0]);

        // Get all payments for this SPA
        const [allPayments] = await db.execute(`
            SELECT id, amount, payment_status, payment_method, payment_plan, payment_type, 
                   description, created_at, approved_at
            FROM payments 
            WHERE spa_id = ?
            ORDER BY created_at DESC
        `, [spa[0].id]);

        console.log(`💰 Found ${allPayments.length} payments for this SPA:`);

        allPayments.forEach((payment, index) => {
            console.log(`\n--- Payment ${index + 1} ---`);
            console.log('ID:', payment.id);
            console.log('Amount:', payment.amount);
            console.log('Status:', payment.payment_status);
            console.log('Method:', payment.payment_method);
            console.log('Plan:', payment.payment_plan);
            console.log('Type:', payment.payment_type);
            console.log('Description:', payment.description);
            console.log('Created:', payment.created_at);
            console.log('Approved:', payment.approved_at);

            // Check if this would be considered an annual payment
            const isAnnual =
                payment.payment_plan === 'Annual' ||
                payment.payment_plan === 'annual' ||
                payment.payment_type === 'Annual Fee' ||
                payment.payment_type === 'annual_fee' ||
                payment.description?.toLowerCase().includes('annual') ||
                (payment.amount >= 25000 && payment.description?.toLowerCase().includes('fee'));

            console.log('Would be considered annual payment:', isAnnual);
        });

        // Check pending bank transfer payments
        const [pendingPayments] = await db.execute(`
            SELECT id, amount, payment_status, payment_method, payment_plan, payment_type, 
                   description, created_at
            FROM payments 
            WHERE spa_id = ? AND payment_method = 'bank_transfer' AND payment_status = 'pending'
            ORDER BY created_at DESC
        `, [spa[0].id]);

        if (pendingPayments.length > 0) {
            console.log('\n🔄 Pending bank transfer payments:');
            pendingPayments.forEach((payment, index) => {
                console.log(`\nPending Payment ${index + 1}:`);
                console.log('ID:', payment.id);
                console.log('Amount:', payment.amount);
                console.log('Plan:', payment.payment_plan);
                console.log('Type:', payment.payment_type);
                console.log('Description:', payment.description);
            });
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        process.exit();
    }
}

// Run the debug
debugAnuradiiiPayments();