const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

async function testBankTransferAPI() {
    try {
        console.log('🧪 Testing Bank Transfer API');

        // You'll need a valid token for your test user
        // Get this from your browser's localStorage or generate one
        const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NzQsInVzZXJuYW1lIjoibmlsbWluaSIsImVtYWlsIjoibmlsbWluaWF3YWQyMEBnbWFpbC5jb20iLCJyb2xlIjoiYWRtaW5fc3BhIiwiaWF0IjoxNzI5MjQ4NzM1LCJleHAiOjE3MzE4NDA3MzV9.Efubo8R1-u5sUL8Ar5bWswRxIcTjKJnGhLdUY5XLV30'; // Replace with actual token

        // Create a test file (or use an existing one)
        const testFilePath = path.join(__dirname, 'test-bank-slip.txt');
        fs.writeFileSync(testFilePath, 'Test bank slip content');

        const formData = new FormData();
        formData.append('plan_id', 'annual');
        formData.append('payment_method', 'bank_transfer');
        formData.append('amount', '45000');
        formData.append('transfer_proof', fs.createReadStream(testFilePath));

        const response = await axios.post('http://localhost:3001/api/admin-spa-enhanced/process-bank-transfer', formData, {
            headers: {
                'Authorization': `Bearer ${token}`,
                ...formData.getHeaders()
            }
        });

        console.log('✅ Success:', response.data);

    } catch (error) {
        console.error('❌ Error:', error.response?.data || error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Headers:', error.response.headers);
        }
    } finally {
        // Clean up test file
        const testFilePath = path.join(__dirname, 'test-bank-slip.txt');
        if (fs.existsSync(testFilePath)) {
            fs.unlinkSync(testFilePath);
        }
    }
}

testBankTransferAPI();