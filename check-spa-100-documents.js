/**
 * Check SPA #100 document paths to see what's stored
 */

const db = require('./backend/config/database');
const fs = require('fs');
const path = require('path');

async function checkSpa100Documents() {
    try {
        console.log('🔍 Checking SPA #100 Document Paths...\n');

        // Get SPA #100 data
        const [spas] = await db.execute(`
            SELECT 
                id, name, status, reject_reason,
                nic_front_path, nic_back_path,
                br_attachment_path, other_document_path,
                form1_certificate_path, spa_photos_banner_path,
                created_at, updated_at
            FROM spas 
            WHERE id = 100
        `);

        if (spas.length === 0) {
            console.log('❌ SPA #100 not found');
            return;
        }

        const spa = spas[0];
        console.log('📋 SPA #100 Details:');
        console.log('   Name:', spa.name);
        console.log('   Status:', spa.status);
        console.log('   Reject Reason:', spa.reject_reason || 'None');
        console.log('   Created:', spa.created_at);
        console.log('   Updated:', spa.updated_at);
        console.log('');

        console.log('📄 Document Paths (Raw from Database):');
        console.log('   NIC Front Path:', spa.nic_front_path);
        console.log('   NIC Back Path:', spa.nic_back_path);
        console.log('   BR Attachment:', spa.br_attachment_path);
        console.log('   Other Document:', spa.other_document_path);
        console.log('   Form1 Certificate:', spa.form1_certificate_path);
        console.log('   SPA Photos Banner:', spa.spa_photos_banner_path);
        console.log('');

        // Test parsing
        console.log('🧪 Testing Path Parsing (like the view route does):');

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

        const nicFrontParsed = parseJsonField(spa.nic_front_path);
        const nicBackParsed = parseJsonField(spa.nic_back_path);

        console.log('   Parsed NIC Front:', nicFrontParsed);
        console.log('   Parsed NIC Back:', nicBackParsed);
        console.log('');

        // Check if files exist on server
        console.log('💾 Checking if files exist on server:');

        if (nicFrontParsed) {
            const fullPath = path.join(__dirname, 'backend', nicFrontParsed.replace('/uploads', 'uploads'));
            const exists = fs.existsSync(fullPath);
            console.log(`   NIC Front: ${exists ? '✅ EXISTS' : '❌ NOT FOUND'}`);
            console.log(`   Full path: ${fullPath}`);
        } else {
            console.log('   NIC Front: ⚠️  No path in database');
        }

        if (nicBackParsed) {
            const fullPath = path.join(__dirname, 'backend', nicBackParsed.replace('/uploads', 'uploads'));
            const exists = fs.existsSync(fullPath);
            console.log(`   NIC Back: ${exists ? '✅ EXISTS' : '❌ NOT FOUND'}`);
            console.log(`   Full path: ${fullPath}`);
        } else {
            console.log('   NIC Back: ⚠️  No path in database');
        }

        console.log('');

        // Check uploads directory
        console.log('📁 Checking uploads/spas directory for recent files:');
        const uploadsDir = path.join(__dirname, 'backend', 'uploads', 'spas');

        if (fs.existsSync(uploadsDir)) {
            const files = fs.readdirSync(uploadsDir);
            const recentFiles = files
                .map(file => {
                    const stats = fs.statSync(path.join(uploadsDir, file));
                    return { file, mtime: stats.mtime };
                })
                .sort((a, b) => b.mtime - a.mtime)
                .slice(0, 10);

            console.log('   Recent uploads (last 10):');
            recentFiles.forEach(({ file, mtime }) => {
                console.log(`   - ${file}`);
                console.log(`     Modified: ${mtime.toLocaleString()}`);
            });
        } else {
            console.log('   ❌ Uploads directory not found!');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
    } finally {
        process.exit(0);
    }
}

checkSpa100Documents();
