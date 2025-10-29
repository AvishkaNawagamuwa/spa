const mysql = require('mysql2/promise');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '12345678',
    database: 'lsa_spa_management'
};

async function checkBankSlipIssue() {
    try {
        const connection = await mysql.createConnection(dbConfig);
        console.log('🔍 Connected to database successfully');

        // Get all payments with bank slips 
        console.log('\n=== CHECKING ALL PAYMENTS WITH BANK SLIPS ===');
        const [payments] = await connection.execute(`
            SELECT 
                p.id,
                p.spa_id,
                p.payment_method,
                p.payment_status,
                p.bank_slip_path,
                p.reference_number,
                p.created_at,
                s.name as spa_name,
                s.reference_number as spa_reference
            FROM payments p
            LEFT JOIN spas s ON p.spa_id = s.id
            WHERE p.bank_slip_path IS NOT NULL AND p.bank_slip_path != ''
            ORDER BY p.id DESC 
            LIMIT 10
        `);

        if (payments.length > 0) {
            console.log(`Found ${payments.length} payments:`);
            payments.forEach((payment, index) => {
                console.log(`\n${index + 1}. Payment ID: ${payment.id}`);
                console.log(`   SPA: ${payment.spa_name} (${payment.spa_reference})`);
                console.log(`   Method: ${payment.payment_method}`);
                console.log(`   Status: ${payment.payment_status}`);
                console.log(`   Bank Slip Path: ${payment.bank_slip_path || 'NULL'}`);
                console.log(`   Reference: ${payment.reference_number}`);
                console.log(`   Created: ${payment.created_at}`);
            });
        } else {
            console.log('No payments found for LSA0087');
        }

        // Check what files actually exist in payment-slips directory
        console.log('\n=== CHECKING ACTUAL FILES IN payment-slips DIRECTORY ===');
        const fs = require('fs');
        const path = require('path');
        const paymentSlipsDir = path.join(__dirname, 'backend', 'uploads', 'payment-slips');

        try {
            const files = fs.readdirSync(paymentSlipsDir);
            console.log(`Files in ${paymentSlipsDir}:`);
            files.forEach(file => {
                const filePath = path.join(paymentSlipsDir, file);
                const stats = fs.statSync(filePath);
                console.log(`   ${file} - Size: ${stats.size} bytes - Modified: ${stats.mtime}`);
            });
        } catch (error) {
            console.log(`Error reading directory: ${error.message}`);
        }

        await connection.end();
        console.log('\n✅ Database connection closed');

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

checkBankSlipIssue();
