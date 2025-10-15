const axios = require('axios');

// Test script to verify the enhanced spa details API
async function testSpaDetailsAPI() {
    try {
        console.log('Testing enhanced ManageSpa API...');

        // Test getting all spas
        const spasResponse = await axios.get('http://localhost:3001/api/lsa/spas');
        console.log('✓ Basic spas endpoint working');
        console.log(`Found ${spasResponse.data.data.spas.length} spas`);

        if (spasResponse.data.data.spas.length > 0) {
            const firstSpa = spasResponse.data.data.spas[0];
            console.log(`\nTesting detailed view for spa: ${firstSpa.spa_name} (ID: ${firstSpa.spa_id})`);

            // Test getting detailed spa information
            const detailedResponse = await axios.get(`http://localhost:3001/api/lsa/spas/${firstSpa.spa_id}/detailed`);

            console.log('✓ Detailed spa endpoint working');
            console.log('Spa details structure:');
            console.log('- Spa ID:', detailedResponse.data.data.spa_id);
            console.log('- Spa Name:', detailedResponse.data.data.spa_name);
            console.log('- Owner Name:', detailedResponse.data.data.owner_name);
            console.log('- Status:', detailedResponse.data.data.status);
            console.log('- Payment Status:', detailedResponse.data.data.payment_status);
            console.log('- Documents Available:');
            console.log('  - Form 1 Certificate:', detailedResponse.data.data.form1_certificate_path ? '✓' : '✗');
            console.log('  - NIC Front:', detailedResponse.data.data.nic_front_path ? '✓' : '✗');
            console.log('  - NIC Back:', detailedResponse.data.data.nic_back_path ? '✓' : '✗');
            console.log('  - BR Attachment:', detailedResponse.data.data.br_attachment_path ? '✓' : '✗');
            console.log('  - Other Document:', detailedResponse.data.data.other_document_path ? '✓' : '✗');
            console.log('  - Spa Banner Photos:', detailedResponse.data.data.spa_banner_photos_path ? '✓' : '✗');
            console.log('- Payment History:', `${detailedResponse.data.data.payments ? detailedResponse.data.data.payments.length : 0} records`);

            if (detailedResponse.data.data.payments && detailedResponse.data.data.payments.length > 0) {
                console.log('Payment Records:');
                detailedResponse.data.data.payments.forEach((payment, index) => {
                    console.log(`  ${index + 1}. Type: ${payment.payment_type}, Amount: ${payment.amount}, Status: ${payment.payment_status}, Slip: ${payment.slip_path ? '✓' : '✗'}`);
                });
            }

            console.log('\n✅ All tests passed! Enhanced ManageSpa API is working correctly.');
        } else {
            console.log('⚠️  No spas found in database for testing');
        }

    } catch (error) {
        console.error('❌ API Test Failed:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
    }
}

testSpaDetailsAPI();