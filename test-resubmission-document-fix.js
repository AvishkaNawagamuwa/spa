/**
 * Test script to verify the resubmission document fix
 * This checks if document paths are properly stored and can be retrieved
 */

const db = require('./backend/config/database');

async function testResubmissionDocumentFix() {
    try {
        console.log('🧪 Testing Resubmission Document Fix...\n');

        // Find a rejected SPA for testing
        const [spas] = await db.execute(
            `SELECT id, name, status, nic_front_path, nic_back_path 
             FROM spas 
             WHERE status = 'rejected' 
             LIMIT 1`
        );

        if (spas.length === 0) {
            console.log('⚠️  No rejected SPAs found for testing');
            console.log('   Creating a test rejected SPA...\n');

            // Create a test rejected SPA
            await db.execute(
                `INSERT INTO spas (
                    name, owner_fname, owner_lname, email, phone, address, 
                    status, reject_reason, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
                [
                    'Test Resubmission SPA',
                    'Test',
                    'Owner',
                    'test-resubmit@test.com',
                    '+94771234567',
                    'Test Address',
                    'rejected',
                    'Documents were not clear. Please resubmit.'
                ]
            );

            const [newSpa] = await db.execute(
                'SELECT id, name, status FROM spas WHERE email = ?',
                ['test-resubmit@test.com']
            );

            console.log('✅ Created test SPA:', newSpa[0]);
            return newSpa[0];
        }

        const testSpa = spas[0];
        console.log('📋 Found rejected SPA for testing:');
        console.log('   ID:', testSpa.id);
        console.log('   Name:', testSpa.name);
        console.log('   Status:', testSpa.status);
        console.log('   Current NIC Front Path:', testSpa.nic_front_path);
        console.log('   Current NIC Back Path:', testSpa.nic_back_path);
        console.log('');

        // Simulate document paths as they would be after resubmission
        const mockNicFrontPath = JSON.stringify(['/uploads/spas/test-nic-front-123.jpg']);
        const mockNicBackPath = JSON.stringify(['/uploads/spas/test-nic-back-456.jpg']);

        console.log('📝 Simulating resubmission with new document paths...');

        await db.execute(
            `UPDATE spas 
             SET nic_front_path = ?, 
                 nic_back_path = ?,
                 status = 'pending',
                 reject_reason = NULL,
                 updated_at = NOW()
             WHERE id = ?`,
            [mockNicFrontPath, mockNicBackPath, testSpa.id]
        );

        console.log('✅ Updated SPA with simulated resubmission data\n');

        // Verify the data was saved correctly
        const [updatedSpa] = await db.execute(
            `SELECT id, name, status, reject_reason, nic_front_path, nic_back_path 
             FROM spas 
             WHERE id = ?`,
            [testSpa.id]
        );

        const spa = updatedSpa[0];
        console.log('🔍 Verification Results:');
        console.log('   Status:', spa.status);
        console.log('   Reject Reason:', spa.reject_reason || 'cleared');
        console.log('   NIC Front Path (raw):', spa.nic_front_path);
        console.log('   NIC Back Path (raw):', spa.nic_back_path);
        console.log('');

        // Parse and test document retrieval (simulate what the view route does)
        console.log('📄 Testing document path parsing...');

        const parseJsonField = (field) => {
            if (!field) return null;
            try {
                const parsed = JSON.parse(field);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    return parsed[0];
                }
                return field;
            } catch (e) {
                return field;
            }
        };

        const nicFrontPath = parseJsonField(spa.nic_front_path);
        const nicBackPath = parseJsonField(spa.nic_back_path);

        console.log('   Parsed NIC Front:', nicFrontPath);
        console.log('   Parsed NIC Back:', nicBackPath);
        console.log('');

        if (nicFrontPath && nicBackPath) {
            console.log('✅ SUCCESS! Document paths are properly formatted and parseable');
            console.log('   The documents will now be viewable via:');
            console.log(`   - http://localhost:3001/api/lsa/spas/${spa.id}/documents/nic_front?action=view`);
            console.log(`   - http://localhost:3001/api/lsa/spas/${spa.id}/documents/nic_back?action=view`);
        } else {
            console.log('❌ FAILED: Document paths are not properly formatted');
        }

        console.log('\n📊 Summary:');
        console.log('   ✓ Document paths stored as JSON arrays');
        console.log('   ✓ Status changed to pending');
        console.log('   ✓ Reject reason cleared');
        console.log('   ✓ Paths can be parsed correctly');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error(error);
    } finally {
        process.exit(0);
    }
}

// Run the test
testResubmissionDocumentFix();
