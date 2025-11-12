const db = require('./backend/config/database');

async function checkAllSpaDetails() {
    try {
        const [spas] = await db.execute(`
            SELECT 
                id, 
                name, 
                spa_br_number,
                spa_tel,
                owner_fname,
                owner_lname,
                owner_email,
                owner_tel,
                email,
                phone,
                address,
                address_line1,
                address_line2,
                province,
                postal_code,
                status,
                spa_banner_photos_path
            FROM spas 
            WHERE status = 'verified'
            ORDER BY id ASC
            LIMIT 15
        `);

        console.log('\n=== ALL VERIFIED SPAS DATA CHECK ===\n');
        console.log(`Total Verified SPAs: ${spas.length}\n`);

        spas.forEach(spa => {
            console.log(`\n--- SPA ID: ${spa.id} | Name: ${spa.name} ---`);
            console.log(`spa_br_number: ${spa.spa_br_number || 'NULL'}`);
            console.log(`spa_tel: ${spa.spa_tel || 'NULL'}`);
            console.log(`owner_email: ${spa.owner_email || 'NULL'}`);
            console.log(`owner_tel: ${spa.owner_tel || 'NULL'}`);
            console.log(`email: ${spa.email || 'NULL'}`);
            console.log(`phone: ${spa.phone || 'NULL'}`);
            console.log(`address: ${spa.address || 'NULL'}`);
            console.log(`address_line1: ${spa.address_line1 || 'NULL'}`);
            console.log(`address_line2: ${spa.address_line2 || 'NULL'}`);
            console.log(`province: ${spa.province || 'NULL'}`);
            console.log(`postal_code: ${spa.postal_code || 'NULL'}`);
            console.log(`spa_banner_photos_path: ${spa.spa_banner_photos_path || 'NULL'}`);

            // Show which fields have data
            const hasData = [];
            if (spa.spa_br_number) hasData.push('spa_br_number');
            if (spa.spa_tel) hasData.push('spa_tel');
            if (spa.owner_email) hasData.push('owner_email');
            if (spa.email) hasData.push('email');
            if (spa.phone) hasData.push('phone');
            if (spa.address) hasData.push('address');
            if (spa.address_line1) hasData.push('address_line1');

            console.log(`\n✅ HAS DATA IN: ${hasData.length > 0 ? hasData.join(', ') : 'NONE'}`);
        });

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkAllSpaDetails();
