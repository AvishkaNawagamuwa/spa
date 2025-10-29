const { sendPaymentStatusEmail } = require('./backend/utils/emailService');

async function testPaymentEmails() {
    console.log('🧪 Testing Payment Email Notifications...\n');

    // Test email configuration
    const testEmail = 'test@example.com'; // Replace with a real email for testing
    const testOwnerName = 'John Doe';
    const testSpaName = 'Luxury Wellness Spa';
    const testPaymentType = 'annual';
    const testAmount = 45000;

    // Test 1: Payment Approval Email
    console.log('1️⃣ Testing payment approval email...');
    const approvalResult = await sendPaymentStatusEmail(
        testEmail,
        testOwnerName,
        testSpaName,
        'approved',
        testPaymentType,
        testAmount
    );

    if (approvalResult.success) {
        console.log('✅ Payment approval email sent successfully!');
        console.log('📧 Message ID:', approvalResult.messageId);
    } else {
        console.error('❌ Payment approval email failed:', approvalResult.error);
    }
    console.log('');

    // Test 2: Payment Rejection Email
    console.log('2️⃣ Testing payment rejection email...');
    const rejectionResult = await sendPaymentStatusEmail(
        testEmail,
        testOwnerName,
        testSpaName,
        'rejected',
        testPaymentType,
        testAmount,
        'Bank slip is unclear. Please upload a clearer image of the bank transfer slip.'
    );

    if (rejectionResult.success) {
        console.log('✅ Payment rejection email sent successfully!');
        console.log('📧 Message ID:', rejectionResult.messageId);
    } else {
        console.error('❌ Payment rejection email failed:', rejectionResult.error);
    }

    console.log('\n🎉 Payment email testing completed!');
}

// Run the test
if (require.main === module) {
    testPaymentEmails().catch(console.error);
}

module.exports = { testPaymentEmails };