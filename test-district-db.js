const db = require('./backend/config/database');

async function testDistrictFilterDB() {
    try {
        console.log('\n=== TESTING DISTRICT FILTER IN DATABASE ===\n');

        // Test 1: Get all spas with districts
        console.log('Test 1: Get all spas with district information...');
        const [allSpas] = await db.execute(`
            SELECT id, name, district, province, status
            FROM spas
            WHERE district IS NOT NULL
            ORDER BY district, name
        `);

        console.log(`✓ Total spas with district: ${allSpas.length}\n`);

        // Show district distribution
        const districtCount = {};
        allSpas.forEach(spa => {
            const district = spa.district;
            if (!districtCount[district]) {
                districtCount[district] = [];
            }
            districtCount[district].push(spa.name);
        });

        console.log('District Distribution:');
        Object.entries(districtCount).forEach(([district, spas]) => {
            console.log(`\n${district} (${spas.length} spa(s)):`);
            spas.forEach(name => console.log(`  - ${name}`));
        });

        // Test 2: Filter by Colombo district (simulating API query)
        console.log('\n\nTest 2: Filter spas by Colombo district (SQL)...');
        const [colomboSpas] = await db.execute(`
            SELECT id, name, district, status
            FROM spas
            WHERE district = ?
        `, ['Colombo']);

        console.log(`✓ Spas in Colombo: ${colomboSpas.length}`);
        colomboSpas.forEach(spa => {
            console.log(`  - ${spa.name} (Status: ${spa.status})`);
        });

        // Test 3: Filter by Gampaha district
        console.log('\n\nTest 3: Filter spas by Gampaha district (SQL)...');
        const [gampahaSpas] = await db.execute(`
            SELECT id, name, district, status
            FROM spas
            WHERE district = ?
        `, ['Gampaha']);

        console.log(`✓ Spas in Gampaha: ${gampahaSpas.length}`);
        gampahaSpas.forEach(spa => {
            console.log(`  - ${spa.name} (Status: ${spa.status})`);
        });

        console.log('\n✅ District filter test completed!\n');
        process.exit(0);

    } catch (error) {
        console.error('❌ Test failed:', error);
        process.exit(1);
    }
}

testDistrictFilterDB();
