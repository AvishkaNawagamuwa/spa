const PaymentStatusChecker = require('./backend/services/paymentStatusChecker');

console.log('🧪 Testing Payment Status Checker Service');
console.log('🔄 Running manual payment status check...');

// Run the manual check
PaymentStatusChecker.runManualCheck()
    .then(() => {
        console.log('✅ Manual check completed');
        process.exit(0);
    })
    .catch(error => {
        console.error('❌ Manual check failed:', error);
        process.exit(1);
    });