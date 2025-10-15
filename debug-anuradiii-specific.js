const db = require('./backend/config/database');

async function debugAnuradiiiPayment() {
    try {
        console.log('🔍 Debugging anuradiii payment issue...');

        // Find anuradiii SPA (ID 50)
        const [spa] = await db.execute(`
            SELECT * FROM lsa_spa_management.spas WHERE id = 50
        `);

        if (spa.length === 0) {
            console.log('❌ SPA ID 50 (anuradiii) not found');
            return;
        }

        console.log('📊 anuradiii SPA details:');
        console.log('- ID:', spa[0].id);
        console.log('- Status:', spa[0].status);

        // Check all payments for SPA ID 50
        const [payments] = await db.execute(`
            SELECT * FROM payments WHERE spa_id = 50 ORDER BY created_at DESC
        `);

        console.log(`\n💰 Found ${payments.length} payments for anuradiii (SPA ID 50):`);

        payments.forEach((payment, index) => {
            console.log(`\n--- Payment ${index + 1} ---`);
            console.log('ID:', payment.id);
            console.log('SPA ID:', payment.spa_id);
            console.log('Amount:', payment.amount);
            console.log('Status:', payment.payment_status);
            console.log('Method:', payment.payment_method);
            console.log('Plan:', payment.payment_plan);
            console.log('Type:', payment.payment_type);
            console.log('Description:', payment.description);
            console.log('Created:', payment.created_at);
            console.log('Approved:', payment.approved_at);
        });

        // Check if there are any completed payments
        const completedPayments = payments.filter(p => p.payment_status === 'completed');
        console.log(`\n✅ Completed payments: ${completedPayments.length}`);

        if (completedPayments.length > 0) {
            console.log('\n🎯 Completed payments details:');
            completedPayments.forEach((payment, index) => {
                console.log(`Completed Payment ${index + 1}:`);
                console.log('- ID:', payment.id);
                console.log('- Plan:', payment.payment_plan);
                console.log('- Type:', payment.payment_type);
                console.log('- Amount:', payment.amount);

                // Check if this would trigger the annual payment logic
                const isAnnual =
                    payment.payment_plan === 'Annual' ||
                    payment.payment_plan === 'annual' ||
                    payment.payment_type === 'Annual Fee' ||
                    payment.payment_type === 'annual_fee' ||
                    payment.description?.toLowerCase().includes('annual') ||
                    (payment.amount >= 25000 && payment.description?.toLowerCase().includes('fee'));

                console.log('- Would trigger annual logic:', isAnnual);
            });
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        process.exit();
    }
}

debugAnuradiiiPayment();