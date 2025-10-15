const mysql = require('mysql2/promise');

const testSpaStatus = async () => {
    try {
        // Database connection
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '12345678',
            database: 'lsa_spa_management'
        });

        console.log('🔍 Testing SPA status for Thalawathugoda or similar...');

        // Check all SPAs to see their status
        const [spas] = await connection.execute(`
            SELECT 
                id,
                name, 
                status, 
                reject_reason,
                owner_fname,
                owner_lname,
                email,
                phone,
                created_at,
                updated_at
            FROM spas 
            ORDER BY created_at DESC
        `);

        console.log('\n📋 All SPAs in database:');
        spas.forEach((spa, index) => {
            console.log(`${index + 1}. ${spa.name} (ID: ${spa.id})`);
            console.log(`   Status: ${spa.status}`);
            console.log(`   Owner: ${spa.owner_fname} ${spa.owner_lname}`);
            console.log(`   Email: ${spa.email}`);
            if (spa.reject_reason) {
                console.log(`   ❌ Rejection Reason: ${spa.reject_reason}`);
            }
            console.log(`   Created: ${spa.created_at}`);
            console.log('');
        });

        // Look for rejected SPAs specifically
        const [rejectedSpas] = await connection.execute(`
            SELECT * FROM spas WHERE status = 'rejected'
        `);

        if (rejectedSpas.length > 0) {
            console.log('🚫 Rejected SPAs found:');
            rejectedSpas.forEach(spa => {
                console.log(`- ${spa.name} (ID: ${spa.id})`);
                console.log(`  Reason: ${spa.reject_reason || 'No reason provided'}`);
            });
        } else {
            console.log('✅ No rejected SPAs found in database.');
        }

        // Check users table to see spa assignments
        const [users] = await connection.execute(`
            SELECT 
                id,
                name,
                email,
                spa_id,
                role,
                created_at
            FROM users 
            WHERE role = 'spa_admin'
            ORDER BY created_at DESC
        `);

        console.log('\n👤 SPA Admin users:');
        users.forEach(user => {
            console.log(`- ${user.name} (ID: ${user.id}, SPA ID: ${user.spa_id})`);
            console.log(`  Email: ${user.email}`);
        });

        await connection.end();

    } catch (error) {
        console.error('❌ Database error:', error);
    }
};

testSpaStatus();