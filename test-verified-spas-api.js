const axios = require('axios');

async function testAPI() {
    try {
        const response = await axios.get('http://localhost:3001/api/public/verified-spas', {
            params: {
                page: 1,
                limit: 3,
                search: ''
            }
        });

        console.log('\n=== VERIFIED SPAS API TEST ===\n');
        console.log('Success:', response.data.success);
        console.log('Total SPAs:', response.data.data.total);
        console.log('\n=== FIRST SPA DATA ===\n');

        if (response.data.data.spas && response.data.data.spas.length > 0) {
            const spa = response.data.data.spas[0];
            console.log('ID:', spa.id);
            console.log('Name:', spa.name);
            console.log('BR Number:', spa.spa_br_number);
            console.log('Owner:', spa.owner_fname, spa.owner_lname);
            console.log('Email:', spa.email);
            console.log('Phone:', spa.phone);
            console.log('Address:', spa.address);
            console.log('Banner Path:', spa.spa_banner_photos_path);
            console.log('\n=== ALL FIELDS ===');
            console.log(JSON.stringify(spa, null, 2));
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

testAPI();
