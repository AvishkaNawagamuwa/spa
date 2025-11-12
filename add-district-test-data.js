const db = require('./backend/config/database');

async function addDistrictToTestData() {
    try {
        console.log('\n=== ADDING DISTRICT DATA TO TEST SPAS ===\n');

        // Update existing spas with district information
        const updates = [
            { id: 1, district: 'Colombo', province: 'Western' },
            { id: 2, district: 'Gampaha', province: 'Western' },
            { id: 3, district: 'Kalutara', province: 'Western' },
            { id: 4, district: 'Kandy', province: 'Central' },
            { id: 5, district: 'Galle', province: 'Southern' },
        ];

        for (const update of updates) {
            const [result] = await db.execute(
                'UPDATE spas SET district = ?, province = ? WHERE id = ?',
                [update.district, update.province, update.id]
            );

            if (result.affectedRows > 0) {
                console.log(`✓ Updated SPA ID ${update.id} with district: ${update.district}, province: ${update.province}`);
            }
        }

        // Show current spa data with districts
        console.log('\n=== CURRENT SPA DATA WITH DISTRICTS ===\n');
        const [spas] = await db.execute(`
            SELECT id, name, district, province, status
            FROM spas
            ORDER BY id
            LIMIT 10
        `);

        spas.forEach(spa => {
            console.log(`ID: ${spa.id} | ${spa.name} | District: ${spa.district || 'N/A'} | Province: ${spa.province || 'N/A'} | Status: ${spa.status}`);
        });

        console.log('\n✅ District data updated successfully!\n');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

addDistrictToTestData();
