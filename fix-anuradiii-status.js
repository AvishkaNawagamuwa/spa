const db = require('./backend/config/database');

async function fixAnuradiiiStatus() {
    try {
        console.log('🔍 Checking current status of anuradiii (LSA0050)...');

        // Check current status
        const [currentStatus] = await db.execute(`
            SELECT id, spa_name, status, updated_at, registration_no 
            FROM lsa_spa_management.spas 
            WHERE spa_name = 'anuradiii' OR registration_no = 'LSA0050'
        `);

        if (currentStatus.length === 0) {
            console.log('❌ SPA "anuradiii" not found in database');
            return;
        }

        const spa = currentStatus[0];
        console.log('📊 Current SPA details:', {
            id: spa.id,
            spa_name: spa.spa_name,
            registration_no: spa.registration_no,
            current_status: spa.status,
            last_updated: spa.updated_at
        });

        // Check if there are any approved annual payments for this SPA
        const [payments] = await db.execute(`
            SELECT id, amount, payment_status, payment_plan, payment_type, description, created_at
            FROM payments 
            WHERE spa_id = ? AND payment_status = 'completed'
            ORDER BY created_at DESC
        `, [spa.id]);

        console.log('💰 Approved payments for this SPA:', payments);

        // Check if any annual payment exists
        const annualPayment = payments.find(p =>
            p.payment_plan === 'Annual' ||
            p.payment_plan === 'annual' ||
            p.payment_type === 'Annual Fee' ||
            p.payment_type === 'annual_fee' ||
            p.description?.toLowerCase().includes('annual') ||
            (p.amount >= 25000 && p.description?.toLowerCase().includes('fee'))
        );

        if (annualPayment) {
            console.log('✅ Annual payment found:', annualPayment);

            if (spa.status !== 'verified') {
                console.log('🔄 Updating SPA status to verified...');

                await db.execute(`
                    UPDATE lsa_spa_management.spas 
                    SET status = 'verified', updated_at = NOW()
                    WHERE id = ?
                `, [spa.id]);

                // Verify the update
                const [updatedSpa] = await db.execute(`
                    SELECT status, updated_at FROM lsa_spa_management.spas WHERE id = ?
                `, [spa.id]);

                console.log('🎉 Status updated successfully!');
                console.log('📊 New status:', updatedSpa[0]);
            } else {
                console.log('ℹ️ SPA is already verified');
            }
        } else {
            console.log('❌ No annual payment found for this SPA');
            console.log('💡 You need to approve an annual payment first');
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        process.exit();
    }
}

// Run the fix
fixAnuradiiiStatus();