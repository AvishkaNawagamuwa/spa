const mysql = require('mysql2/promise');

const createTestRejectedSpa = async () => {
    try {
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '12345678',
            database: 'lsa_spa_management'
        });

        console.log('🔍 Creating test rejected SPA for resubmission testing...');

        // Check if we already have a rejected SPA
        const [existingRejected] = await connection.execute(`
            SELECT id, name, status, reject_reason FROM spas WHERE status = 'rejected' LIMIT 1
        `);

        if (existingRejected.length > 0) {
            const spa = existingRejected[0];
            console.log(`✅ Found existing rejected SPA: ${spa.name} (ID: ${spa.id})`);
            console.log(`   Rejection Reason: ${spa.reject_reason || 'No reason provided'}`);
            return spa.id;
        }

        // Create a new rejected SPA for testing
        console.log('Creating new rejected SPA...');

        const [result] = await connection.execute(`
            INSERT INTO spas (
                name, 
                owner_fname, 
                owner_lname, 
                email, 
                phone, 
                address, 
                status, 
                reject_reason,
                created_at, 
                updated_at
            ) VALUES (
                'Thalawathugoda Wellness Spa', 
                'Sumith', 
                'Perera', 
                'sumith@thalawathugoda-spa.com', 
                '+94712345678', 
                'No. 123, Main Street, Thalawathugoda, Western Province, 12345', 
                'rejected', 
                'Incomplete documentation: Missing BR certificate and facility photos. Please resubmit with all required documents.',
                NOW(), 
                NOW()
            )
        `);

        const spaId = result.insertId;
        console.log(`✅ Created rejected SPA: Thalawathugoda Wellness Spa (ID: ${spaId})`);

        // Create a corresponding user for this SPA
        const [userResult] = await connection.execute(`
            INSERT INTO users (
                name, 
                email, 
                password, 
                role, 
                spa_id, 
                created_at
            ) VALUES (
                'Sumith Perera', 
                'sumith@thalawathugoda-spa.com', 
                '$2b$10$example_hash_password_placeholder', 
                'spa_admin', 
                ?, 
                NOW()
            )
        `, [spaId]);

        console.log(`✅ Created user for SPA: Sumith Perera (ID: ${userResult.insertId})`);

        // Test the profile fetch API
        console.log('\n🧪 Testing profile fetch...');
        const [profile] = await connection.execute(`
            SELECT * FROM spas WHERE id = ?
        `, [spaId]);

        if (profile.length > 0) {
            console.log('✅ SPA profile found:');
            console.log(`   Name: ${profile[0].name}`);
            console.log(`   Status: ${profile[0].status}`);
            console.log(`   Rejection Reason: ${profile[0].reject_reason}`);
            console.log(`   Owner: ${profile[0].owner_fname} ${profile[0].owner_lname}`);
        }

        await connection.end();

        console.log(`\n🎯 Test SPA created successfully! Use SPA ID ${spaId} for resubmission testing.`);
        console.log('\n📋 To test resubmission:');
        console.log('1. Login with email: sumith@thalawathugoda-spa.com');
        console.log('2. Navigate to "Resubmit Application" in the admin panel');
        console.log('3. Fill in the corrected information');
        console.log('4. Submit the resubmission');

        return spaId;

    } catch (error) {
        console.error('❌ Error creating test data:', error);
    }
};

createTestRejectedSpa();