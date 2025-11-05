const db = require('./backend/config/database');

async function checkRegistrationPaymentSlip() {
    try {
        console.log('\n🔍 Checking Registration Payment Slip Data\n');
        console.log('='.repeat(80));

        // Check the specific payment with the ID from the screenshot
        const [payments] = await db.execute(`
      SELECT 
        p.id,
        p.payment_type,
        p.payment_method,
        p.slip_path,
        p.bank_slip_path,
        s.reference_number as spa_ref,
        s.name as spa_name
      FROM payments p
      JOIN spas s ON p.spa_id = s.id
      WHERE p.payment_type = 'registration'
      AND (p.slip_path LIKE '%1762304524036%' OR p.bank_slip_path LIKE '%1762304524036%')
    `);

        if (payments.length === 0) {
            console.log('❌ Payment not found with that slip ID');

            // Show recent registration payments
            const [recentPayments] = await db.execute(`
        SELECT 
          p.id,
          p.payment_type,
          p.slip_path,
          p.bank_slip_path,
          s.reference_number,
          s.name
        FROM payments p
        JOIN spas s ON p.spa_id = s.id
        WHERE p.payment_type = 'registration'
        AND (p.slip_path IS NOT NULL OR p.bank_slip_path IS NOT NULL)
        ORDER BY p.created_at DESC
        LIMIT 5
      `);

            console.log('\n📋 Recent Registration Payments:');
            recentPayments.forEach(p => {
                console.log(`\n   Payment ID: ${p.id} - ${p.name}`);
                console.log(`   slip_path: ${p.slip_path || 'NULL'}`);
                console.log(`   bank_slip_path: ${p.bank_slip_path || 'NULL'}`);
            });
        } else {
            payments.forEach(payment => {
                console.log(`\n📄 Payment Found:`);
                console.log(`   ID: ${payment.id}`);
                console.log(`   SPA: ${payment.spa_name} (${payment.spa_ref})`);
                console.log(`   Type: ${payment.payment_type}`);
                console.log(`   Method: ${payment.payment_method}`);
                console.log(`\n   slip_path: ${payment.slip_path || 'NULL'}`);
                console.log(`   bank_slip_path: ${payment.bank_slip_path || 'NULL'}`);

                const pathToUse = payment.slip_path || payment.bank_slip_path;
                if (pathToUse) {
                    console.log(`\n   ⚙️  Path Analysis:`);
                    console.log(`   - Has backslashes: ${pathToUse.includes('\\') ? '⚠️  YES' : '✅ NO'}`);
                    console.log(`   - Starts with /: ${pathToUse.startsWith('/') ? 'YES' : 'NO'}`);
                    console.log(`   - Starts with uploads: ${pathToUse.startsWith('uploads') ? 'YES' : 'NO'}`);

                    // Show what URL would be constructed
                    const normalizedPath = pathToUse.replace(/\\/g, '/');
                    const url = normalizedPath.startsWith('/') ? normalizedPath : '/' + normalizedPath;
                    console.log(`\n   🌐 Expected URL: http://localhost:3001${url}`);
                }
            });
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

checkRegistrationPaymentSlip();
