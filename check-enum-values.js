const mysql = require('mysql2/promise');

const checkEnumValues = async () => {
    try {
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '12345678',
            database: 'lsa_spa_management'
        });

        console.log('🔍 Checking ENUM values for system_notifications...');

        // Check column definitions
        const [columns] = await connection.execute(`
            SELECT COLUMN_NAME, COLUMN_TYPE, DATA_TYPE
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = 'lsa_spa_management' 
            AND TABLE_NAME = 'system_notifications'
            AND DATA_TYPE = 'enum'
        `);

        console.log('\n📋 ENUM columns:');
        columns.forEach(col => {
            console.log(`- ${col.COLUMN_NAME}: ${col.COLUMN_TYPE}`);
        });

        // Test with correct enum values
        console.log('\n🧪 Testing notification creation with correct values...');

        // Try different recipient_type values
        const testValues = ['admin', 'spa_admin', 'lsa_admin', 'spa', 'lsa'];

        for (const recipientType of testValues) {
            try {
                await connection.execute(`
                    INSERT INTO system_notifications (recipient_type, recipient_id, title, message, notification_type, related_entity_type, related_entity_id)
                    VALUES (?, NULL, 'Test Notification', 'This is a test notification', 'info', 'spa', 1)
                `, [recipientType]);

                console.log(`✅ Successfully inserted with recipient_type: ${recipientType}`);

                // Clean up
                await connection.execute(`
                    DELETE FROM system_notifications 
                    WHERE title = 'Test Notification' AND recipient_type = ?
                `, [recipientType]);

                break; // Exit loop on success

            } catch (error) {
                console.log(`❌ Failed with recipient_type: ${recipientType} - ${error.message}`);
            }
        }

        await connection.end();

    } catch (error) {
        console.error('❌ Database connection error:', error);
    }
};

checkEnumValues();