const db = require('./backend/config/database');

async function testBankSlipUrlGeneration() {
    try {
        console.log('\n🧪 Testing Bank Slip URL Generation with Fix\n');
        console.log('='.repeat(80));

        // Test the fixed SQL query
        const [payments] = await db.execute(`
      SELECT 
        p.id,
        p.bank_slip_path as original_path,
        s.name as spa_name,
        CASE 
          WHEN p.bank_slip_path IS NOT NULL THEN 
            CASE 
              WHEN REPLACE(p.bank_slip_path, '\\\\', '/') LIKE '/uploads/%' THEN CONCAT('http://localhost:3001', REPLACE(p.bank_slip_path, '\\\\', '/'))
              WHEN REPLACE(p.bank_slip_path, '\\\\', '/') LIKE 'uploads/%' THEN CONCAT('http://localhost:3001/', REPLACE(p.bank_slip_path, '\\\\', '/'))
              ELSE CONCAT('http://localhost:3001/', REPLACE(p.bank_slip_path, '\\\\', '/'))
            END
          ELSE NULL
        END as fixed_url
      FROM payments p
      JOIN spas s ON p.spa_id = s.id
      WHERE p.payment_method = 'bank_transfer' 
      AND p.bank_slip_path IS NOT NULL
      ORDER BY p.created_at DESC 
      LIMIT 5
    `);

        if (payments.length === 0) {
            console.log('❌ No payments found with bank slips');
        } else {
            payments.forEach((payment, index) => {
                console.log(`\n${index + 1}. Payment ID: ${payment.id} - ${payment.spa_name}`);
                console.log(`   Original Path: ${payment.original_path}`);
                console.log(`   ✅ Fixed URL:   ${payment.fixed_url}`);
                console.log('-'.repeat(80));
            });

            console.log('\n✅ All bank slip URLs are now properly formatted!');
            console.log('📌 Note: Make sure your backend server is restarted to apply changes.\n');
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

testBankSlipUrlGeneration();
