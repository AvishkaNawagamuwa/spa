const axios = require('axios');

async function testPaymentHistoryAPI() {
    try {
        console.log('\n🧪 Testing Payment History API Response\n');

        const response = await axios.get('http://localhost:3001/api/lsa/enhanced/payments/history?limit=3');

        console.log('✅ API Response received\n');
        console.log('='.repeat(80));

        response.data.data.forEach((payment, index) => {
            console.log(`\n${index + 1}. Payment ID: ${payment.id}`);
            console.log(`   SPA: ${payment.spa_name}`);
            console.log(`   Method: ${payment.payment_method}`);
            console.log(`   Bank Slip URL: ${payment.bank_slip_path || 'NULL'}`);

            if (payment.bank_slip_path) {
                // Check if URL has backslashes (means fix didn't apply)
                if (payment.bank_slip_path.includes('\\')) {
                    console.log('   ❌ PROBLEM: URL still has backslashes!');
                } else {
                    console.log('   ✅ URL format looks correct');
                }
            }
            console.log('-'.repeat(80));
        });

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        }
        process.exit(1);
    }
}

testPaymentHistoryAPI();
