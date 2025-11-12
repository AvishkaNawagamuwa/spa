const db = require('./backend/config/database');

async function checkAllSpaBanners() {
    try {
        const [spas] = await db.execute(`
            SELECT id, name, status, spa_banner_photos_path 
            FROM spas 
            WHERE spa_banner_photos_path IS NOT NULL 
            LIMIT 10
        `);

        console.log('\n=== SPAs WITH BANNER PHOTOS ===\n');
        console.log(`Found ${spas.length} SPAs with banner photos\n`);

        if (spas.length > 0) {
            spas.forEach(spa => {
                console.log(`SPA: ${spa.name}`);
                console.log(`ID: ${spa.id}`);
                console.log(`Status: ${spa.status}`);
                console.log(`Banner Path: ${spa.spa_banner_photos_path}`);
                console.log('---');
            });
        } else {
            console.log('❌ No SPAs have banner photos uploaded yet.');
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkAllSpaBanners();
