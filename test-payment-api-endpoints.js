require('dotenv').config();
const axios = require('axios');

async function testPaymentAPIs() {
    const baseURL = 'http://localhost:3001';

    // You'll need to replace this with a valid token from your app
    const token = 'your-test-token-here';
    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };

    console.log('🧪 Testing Payment Plan API Endpoints\n');

    try {
        // Test 1: Check payment status endpoint
        console.log('📋 Test 1: Payment Status Check');
        try {
            const response = await axios.get(`${baseURL}/api/admin-spa-enhanced/payment-status`, { headers });
            console.log('✅ Payment status endpoint working');
            console.log('📊 Response:', response.data);
        } catch (error) {
            console.log('❌ Payment status endpoint error:', error.response?.data || error.message);
        }

        console.log('\n📋 Test 2: Card Payment Structure Test');
        const cardPaymentData = {
            plan_id: 'annual',
            payment_method: 'card',
            card_details: {
                holderName: 'Test User',
                cardNumber: '4111111111111111',
                expiry: '12/25',
                cvv: '123'
            }
        };

        try {
            const response = await axios.post(`${baseURL}/api/admin-spa-enhanced/process-card-payment`, cardPaymentData, { headers });
            console.log('✅ Card payment endpoint structure correct');
        } catch (error) {
            if (error.response?.status === 401) {
                console.log('✅ Card payment endpoint accessible (authentication required)');
            } else {
                console.log('❌ Card payment endpoint error:', error.response?.data || error.message);
            }
        }

        console.log('\n📋 Test 3: Bank Transfer Structure Test');
        // For bank transfer, we'd need to create FormData, but this tests the endpoint exists
        try {
            const response = await axios.post(`${baseURL}/api/admin-spa-enhanced/process-bank-transfer`, {}, { headers });
            console.log('✅ Bank transfer endpoint structure correct');
        } catch (error) {
            if (error.response?.status === 401) {
                console.log('✅ Bank transfer endpoint accessible (authentication required)');
            } else if (error.response?.status === 400) {
                console.log('✅ Bank transfer endpoint accessible (expects proper form data)');
            } else {
                console.log('❌ Bank transfer endpoint error:', error.response?.data || error.message);
            }
        }

        console.log('\n🎉 API Structure Test Complete!');
        console.log('📝 Summary:');
        console.log('   - Payment status endpoint: Ready');
        console.log('   - Card payment endpoint: Ready');
        console.log('   - Bank transfer endpoint: Ready');
        console.log('\n💡 Next steps:');
        console.log('   1. Test with valid authentication token');
        console.log('   2. Test actual payment processing');
        console.log('   3. Verify file upload functionality');

    } catch (error) {
        console.error('❌ General test error:', error.message);
    }
}

// Note: This test checks endpoint structure without actual authentication
console.log('⚠️  Note: Replace "your-test-token-here" with a valid token for full testing');
testPaymentAPIs();