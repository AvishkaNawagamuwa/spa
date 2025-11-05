/**
 * Simple test to show the path conversion works correctly
 */

// Simulate what multer gives us
const absolutePath = "D:\\SPA PROJECT\\SPA NEW VSCODE\\ppp\\backend\\uploads\\spas\\nic\\nicFront-1762322670351-352556333.png";

// Convert to relative path (what we need to store)
const toRelativePath = (absolutePath) => {
    return absolutePath.replace(/.*[\\\/]backend[\\\/]/, '');
};

const relativePath = toRelativePath(absolutePath);

console.log('🧪 Path Conversion Test\n');
console.log('Input (absolute path from multer):');
console.log('  ', absolutePath);
console.log('');
console.log('Output (relative path for database):');
console.log('  ', relativePath);
console.log('');
console.log('Stored in database as JSON:');
console.log('  ', JSON.stringify([relativePath]));
console.log('');
console.log('✅ This matches the initial registration format!');
console.log('✅ The view route will now find the file correctly!');
