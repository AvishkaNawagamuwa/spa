const db = require('./backend/config/database');

async function checkSpaBanners() {
    try {
        const [spas] = await db.execute(`
            SELECT id, name, spa_banner_photos_path 
            FROM spas 
            WHERE status = 'verified' 
            LIMIT 5
        `);

        console.log('\n=== SPA BANNER PHOTOS CHECK ===\n');
        spas.forEach(spa => {
            console.log(`SPA: ${spa.name}`);
            console.log(`ID: ${spa.id}`);
            console.log(`Banner Path: ${spa.spa_banner_photos_path || 'NULL'}`);
            console.log(`Type: ${typeof spa.spa_banner_photos_path}`);
            console.log('---');
        });

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkSpaBanners();
