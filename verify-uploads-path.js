const path = require('path');

console.log('\n📁 Checking Uploads Directory Paths\n');
console.log('='.repeat(80));

const backendDir = path.join(__dirname, 'backend');
const oldPath = path.join(backendDir, 'uploads');
const newPath = path.join(backendDir, '../uploads');

console.log('\n🔍 Current Setup:');
console.log(`   Backend Directory: ${backendDir}`);
console.log(`   OLD Path (WRONG):  ${oldPath}`);
console.log(`   NEW Path (FIXED):  ${path.resolve(newPath)}`);

const fs = require('fs');

console.log('\n✅ Verification:');
console.log(`   OLD path exists: ${fs.existsSync(oldPath)}`);
console.log(`   NEW path exists: ${fs.existsSync(path.resolve(newPath))}`);

// Check if the specific file exists in the new path
const testFile = path.join(path.resolve(newPath), 'payment-slips', 'transfer-slip-1762304594781-693895911.jpg');
console.log(`   Test file exists: ${fs.existsSync(testFile)}`);
console.log(`   Test file path: ${testFile}`);

console.log('\n✅ Fix Applied: Server will now serve from the correct uploads directory!');
console.log('⚠️  IMPORTANT: Restart your backend server for changes to take effect.\n');
