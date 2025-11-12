const axios = require('axios');

async function testDistrictFilter() {
    try {
        console.log('\n=== TESTING DISTRICT FILTER ===\n');

        // Test 1: Get all spas without filter
        console.log('Test 1: Get all spas without district filter...');
        const allSpasResponse = await axios.get('http://localhost:3001/api/lsa/spas', {
            headers: { Authorization: `Bearer ${process.env.TEST_TOKEN || 'test'}` }
        });

        if (allSpasResponse.data.success) {
            const allSpas = allSpasResponse.data.data.spas || [];
            console.log(`✓ Total spas: ${allSpas.length}`);

            // Show district distribution
            const districtCount = {};
            allSpas.forEach(spa => {
                const district = spa.district || 'N/A';
                districtCount[district] = (districtCount[district] || 0) + 1;
            });
            console.log('\nDistrict Distribution:');
            Object.entries(districtCount).forEach(([district, count]) => {
                console.log(`  ${district}: ${count} spa(s)`);
            });
        }

        // Test 2: Filter by Colombo district
        console.log('\n\nTest 2: Filter spas by Colombo district...');
        const colomboSpasResponse = await axios.get('http://localhost:3001/api/lsa/spas?district=Colombo', {
            headers: { Authorization: `Bearer ${process.env.TEST_TOKEN || 'test'}` }
        });

        if (colomboSpasResponse.data.success) {
            const colomboSpas = colomboSpasResponse.data.data.spas || [];
            console.log(`✓ Spas in Colombo: ${colomboSpas.length}`);
            colomboSpas.forEach(spa => {
                console.log(`  - ${spa.spa_name} (District: ${spa.district || 'N/A'})`);
            });
        }

        // Test 3: Filter by Gampaha district
        console.log('\n\nTest 3: Filter spas by Gampaha district...');
        const gampahaSpasResponse = await axios.get('http://localhost:3001/api/lsa/spas?district=Gampaha', {
            headers: { Authorization: `Bearer ${process.env.TEST_TOKEN || 'test'}` }
        });

        if (gampahaSpasResponse.data.success) {
            const gampahaSpas = gampahaSpasResponse.data.data.spas || [];
            console.log(`✓ Spas in Gampaha: ${gampahaSpas.length}`);
            gampahaSpas.forEach(spa => {
                console.log(`  - ${spa.spa_name} (District: ${spa.district || 'N/A'})`);
            });
        }

        console.log('\n✅ District filter test completed!\n');

    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
    }
}

testDistrictFilter();
