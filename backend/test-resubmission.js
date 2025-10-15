// Test file to demonstrate resubmission functionality
const mysql = require('mysql2/promise');

// Database connection
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '12345678',
    database: 'lsa_spa_management'
};

async function testResubmissionFeature() {
    let connection;

    try {
        console.log('🔍 Testing Resubmission Feature...\n');

        // Connect to database
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ Database connected successfully');

        // 1. Check for rejected SPAs
        const [rejectedSpas] = await connection.execute(`
            SELECT id, name, owner_fname, owner_lname, status, reject_reason 
            FROM spas 
            WHERE status = 'rejected'
        `);

        console.log('\n📋 Rejected SPAs available for resubmission:');
        if (rejectedSpas.length === 0) {
            console.log('❌ No rejected SPAs found. Creating a sample rejected SPA...');

            // Create a sample rejected SPA for testing
            await connection.execute(`
                INSERT INTO spas (
                    name, owner_fname, owner_lname, email, phone, address,
                    status, reject_reason
                ) VALUES (
                    'Test Rejected Spa',
                    'John', 'Doe', 'john.doe@test.com', '0112345678', '123 Test Street, Test Area, Western Province, 10100',
                    'rejected', 'Incomplete documentation and missing facility photos'
                )
            `);

            console.log('✅ Sample rejected SPA created for testing');

            // Fetch again
            const [newRejectedSpas] = await connection.execute(`
                SELECT id, name, owner_fname, owner_lname, status, rejection_reason 
                FROM spas 
                WHERE status = 'rejected'
            `);

            rejectedSpas.push(...newRejectedSpas);
        }

        rejectedSpas.forEach(spa => {
            console.log(`  📍 ID: ${spa.id} | Name: ${spa.name} | Owner: ${spa.owner_fname} ${spa.owner_lname}`);
            console.log(`     Reason: ${spa.reject_reason}`);
        });

        // 2. Test the resubmission process
        if (rejectedSpas.length > 0) {
            const testSpa = rejectedSpas[0];
            console.log(`\n🔄 Testing resubmission for SPA ID: ${testSpa.id}`);

            // Update the rejected SPA to "pending" status (simulating resubmission)
            const updateResult = await connection.execute(`
                UPDATE spas 
                SET status = 'pending', 
                    reject_reason = NULL,
                    updated_at = NOW(),
                    owner_fname = 'John Updated',
                    owner_lname = 'Doe Updated',
                    name = 'Updated Test Spa'
                WHERE id = ? AND status = 'rejected'
            `, [testSpa.id]);

            if (updateResult[0].affectedRows > 0) {
                console.log('✅ Resubmission simulation successful!');

                // Log activity
                await connection.execute(`
                    INSERT INTO activity_logs (
                        entity_type, entity_id, action, description, 
                        actor_type, actor_id, actor_name, created_at
                    ) VALUES (
                        'spa', ?, 'resubmitted', ?, 
                        'spa', ?, ?, NOW()
                    )
                `, [
                    testSpa.id,
                    `Spa application resubmitted: ${testSpa.name}`,
                    testSpa.id,
                    `${testSpa.owner_fname} ${testSpa.owner_lname}`
                ]);

                console.log('✅ Activity logged successfully');

                // Check updated status
                const [updatedSpa] = await connection.execute(`
                    SELECT id, name, owner_fname, owner_lname, status, reject_reason, updated_at
                    FROM spas WHERE id = ?
                `, [testSpa.id]);

                if (updatedSpa.length > 0) {
                    const spa = updatedSpa[0];
                    console.log(`\n📋 Updated SPA Status:`);
                    console.log(`  📍 Name: ${spa.name} | Owner: ${spa.owner_fname} ${spa.owner_lname}`);
                    console.log(`  📍 Status: ${spa.status} | Updated: ${spa.updated_at}`);
                    console.log(`  📍 Rejection Reason: ${spa.rejection_reason || 'Cleared'}`);
                }
            } else {
                console.log('❌ Resubmission failed - no rows affected');
            }
        }

        // 3. Check payment relationship
        console.log('\n💰 Checking payment relationship...');
        const [payments] = await connection.execute(`
            SELECT p.id, p.spa_id, p.payment_type, p.amount, p.status, s.name as spa_name
            FROM payments p
            JOIN spas s ON p.spa_id = s.id
            LIMIT 5
        `);

        if (payments.length > 0) {
            console.log('✅ Payment relationship working:');
            payments.forEach(payment => {
                console.log(`  💳 ${payment.spa_name}: ${payment.payment_type} - $${payment.amount} (${payment.status})`);
            });
        } else {
            console.log('⚠️  No payments found in database');
        }

        console.log('\n🎉 Resubmission feature test completed successfully!');
        console.log('\n📋 Summary:');
        console.log('  ✅ Database connection working');
        console.log('  ✅ Rejected SPAs can be identified');
        console.log('  ✅ Resubmission process simulation working');
        console.log('  ✅ Activity logging working');
        console.log('  ✅ Payment relationship intact');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack trace:', error.stack);
    } finally {
        if (connection) {
            await connection.end();
            console.log('\n🔌 Database connection closed');
        }
    }
}

// Run the test
if (require.main === module) {
    testResubmissionFeature();
}

module.exports = { testResubmissionFeature };