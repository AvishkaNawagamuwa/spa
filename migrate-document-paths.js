/**
 * Migration Script: Fix Document Paths for Previously Resubmitted SPAs
 * 
 * This script finds SPAs that have document paths stored as plain strings
 * (from old resubmissions) and converts them to JSON arrays for consistency.
 */

const db = require('./backend/config/database');

async function migrateOldDocumentPaths() {
    try {
        console.log('🔄 Starting Document Path Migration...\n');

        // Find SPAs with non-JSON document paths
        const [spas] = await db.execute(`
            SELECT 
                id, name, status,
                nic_front_path, nic_back_path, 
                br_attachment_path, other_document_path,
                form1_certificate_path, spa_photos_banner_path
            FROM spas
            WHERE 
                (nic_front_path IS NOT NULL AND nic_front_path NOT LIKE '[%')
                OR (nic_back_path IS NOT NULL AND nic_back_path NOT LIKE '[%')
                OR (br_attachment_path IS NOT NULL AND br_attachment_path NOT LIKE '[%')
                OR (other_document_path IS NOT NULL AND other_document_path NOT LIKE '[%')
                OR (form1_certificate_path IS NOT NULL AND form1_certificate_path NOT LIKE '[%')
                OR (spa_photos_banner_path IS NOT NULL AND spa_photos_banner_path NOT LIKE '[%')
        `);

        if (spas.length === 0) {
            console.log('✅ No SPAs found with old document path format');
            console.log('   All document paths are already in JSON array format!\n');
            return;
        }

        console.log(`📋 Found ${spas.length} SPA(s) with old document path format:\n`);

        let migrated = 0;
        let failed = 0;

        for (const spa of spas) {
            try {
                console.log(`   Processing SPA #${spa.id} - ${spa.name}`);

                const updates = [];
                const values = [];

                // Helper to convert path to JSON array if needed
                const convertPath = (path) => {
                    if (!path) return null;

                    // Already a JSON array
                    if (path.startsWith('[')) return path;

                    // Convert plain string to JSON array
                    return JSON.stringify([path]);
                };

                // Check and convert each document path
                const pathFields = [
                    'nic_front_path',
                    'nic_back_path',
                    'br_attachment_path',
                    'other_document_path',
                    'form1_certificate_path',
                    'spa_photos_banner_path'
                ];

                for (const field of pathFields) {
                    const oldPath = spa[field];
                    if (oldPath && !oldPath.startsWith('[')) {
                        const newPath = convertPath(oldPath);
                        updates.push(`${field} = ?`);
                        values.push(newPath);
                        console.log(`      ✓ Converting ${field}`);
                        console.log(`        Old: ${oldPath}`);
                        console.log(`        New: ${newPath}`);
                    }
                }

                if (updates.length > 0) {
                    values.push(spa.id);

                    const query = `
                        UPDATE spas 
                        SET ${updates.join(', ')}, updated_at = NOW()
                        WHERE id = ?
                    `;

                    await db.execute(query, values);
                    migrated++;
                    console.log(`   ✅ Migrated SPA #${spa.id}\n`);
                } else {
                    console.log(`   ℹ️  No paths to migrate for SPA #${spa.id}\n`);
                }

            } catch (error) {
                failed++;
                console.error(`   ❌ Failed to migrate SPA #${spa.id}:`, error.message);
                console.error(error);
                console.log('');
            }
        }

        console.log('\n📊 Migration Summary:');
        console.log(`   Total SPAs checked: ${spas.length}`);
        console.log(`   Successfully migrated: ${migrated}`);
        console.log(`   Failed: ${failed}`);

        if (migrated > 0) {
            console.log('\n✅ Migration completed successfully!');
            console.log('   All document paths are now in JSON array format.');
            console.log('   Documents should now be viewable in the system.');
        }

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error(error);
    } finally {
        process.exit(0);
    }
}

// Run the migration
migrateOldDocumentPaths();
