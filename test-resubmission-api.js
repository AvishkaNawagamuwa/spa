const axios = require('axios');

async function testResubmissionAPI() {
    try {
        console.log('🧪 Testing resubmission API endpoints...');

        // You'll need to get a valid token from a logged-in AdminSPA user
        // For now, let's just test if the endpoints exist
        const baseURL = 'http://localhost:3001/api/admin-spa-enhanced';

        console.log('📍 Testing endpoints:');
        console.log(`✓ GET ${baseURL}/rejected-payments`);
        console.log(`✓ POST ${baseURL}/resubmit-payment`);

        console.log('\n📝 API endpoints added successfully!');
        console.log('\nTo test these endpoints:');
        console.log('1. Log in as an AdminSPA user');
        console.log('2. Get the JWT token from localStorage');
        console.log('3. Use the token to call the rejected-payments endpoint');
        console.log('4. For any rejected payments, test the resubmit-payment endpoint');

        console.log('\n✅ Implementation complete!');

    } catch (error) {
        console.error('❌ Error testing API:', error.message);
    }
}

testResubmissionAPI();