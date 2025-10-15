const db = require('./backend/config/database');

async function testStatusUpdate() {
    try {
        console.log('🔍 Testing manual status update for anuradiii...');

        // Find anuradiii SPA
        const [spa] = await db.execute(`
            SELECT id, spa_name, status, registration_no 
            FROM lsa_spa_management.spas 
            WHERE spa_name LIKE '%anurad%' OR registration_no = 'LSA0050'
        `);

        if (spa.length === 0) {
            console.log('❌ anuradiii SPA not found');
            return;
        }

        console.log('📊 Found SPA:', spa[0]);

        // Try to update status manually
        console.log('🔄 Attempting to update status to verified...');
        const updateResult = await db.execute(`
            UPDATE lsa_spa_management.spas 
            SET status = 'verified', updated_at = NOW()
            WHERE id = ?
        `, [spa[0].id]);

        console.log('🔧 Update result:', updateResult[0]);

        // Check if update worked
        const [updatedSpa] = await db.execute(`
            SELECT id, spa_name, status, updated_at 
            FROM lsa_spa_management.spas 
            WHERE id = ?
        `, [spa[0].id]);

        console.log('✅ Updated SPA status:', updatedSpa[0]);

        // Revert back to unverified for testing
        console.log('🔄 Reverting back to unverified...');
        await db.execute(`
            UPDATE lsa_spa_management.spas 
            SET status = 'unverified', updated_at = NOW()
            WHERE id = ?
        `, [spa[0].id]);

        console.log('✅ Test completed successfully!');

    } catch (error) {
        console.error('❌ Error during test:', error);
    } finally {
        process.exit();
    }
}

testStatusUpdate();