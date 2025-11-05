const path = require('path');
const fs = require('fs');

console.log('\n🔍 Verifying Both Uploads Folders Configuration\n');
console.log('='.repeat(80));

const backendDir = path.join(__dirname, 'backend');
const rootUploadsPath = path.join(backendDir, '../uploads');
const backendUploadsPath = path.join(backendDir, 'uploads');

console.log('\n📁 Configured Paths:');
console.log(`   1. Root uploads:    ${path.resolve(rootUploadsPath)}`);
console.log(`   2. Backend uploads: ${path.resolve(backendUploadsPath)}`);

console.log('\n✅ Path Verification:');
console.log(`   Root uploads exists:    ${fs.existsSync(path.resolve(rootUploadsPath))}`);
console.log(`   Backend uploads exists: ${fs.existsSync(path.resolve(backendUploadsPath))}`);

// Test annual payment slip (should be in root uploads)
const annualSlip = path.join(path.resolve(rootUploadsPath), 'payment-slips', 'transfer-slip-1762304594781-693895911.jpg');
console.log('\n🧪 Test 1 - Annual Payment Slip:');
console.log(`   File: ${annualSlip}`);
console.log(`   Exists: ${fs.existsSync(annualSlip) ? '✅ YES' : '❌ NO'}`);
console.log(`   URL: http://localhost:3001/uploads/payment-slips/transfer-slip-xxx.jpg`);

// Test registration slip (should be in backend uploads)
const regSlip = path.join(path.resolve(backendUploadsPath), 'spas', 'general', 'bankSlip-1762304524036-796115228.jpg');
console.log('\n🧪 Test 2 - Registration Payment Slip:');
console.log(`   File: ${regSlip}`);
console.log(`   Exists: ${fs.existsSync(regSlip) ? '✅ YES' : '❌ NO'}`);
console.log(`   URL: http://localhost:3001/uploads/spas/general/bankSlip-xxx.jpg`);

console.log('\n✅ Configuration:');
console.log('   Server will check BOTH locations when serving /uploads/* requests');
console.log('   1. First tries: ../uploads/ (root)');
console.log('   2. Then tries:  ./uploads/ (backend)');

console.log('\n⚠️  IMPORTANT: RESTART YOUR BACKEND SERVER for changes to take effect!\n');
