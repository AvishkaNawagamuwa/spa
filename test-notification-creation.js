const mysql = require('mysql2/promise');

const testNotificationCreation = async () => {
    try {
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '12345678',
            database: 'lsa_spa_management'
        });

        console.log('🧪 Testing notification creation with correct values...');

        // Test LSA notification
        await connection.execute(`
            INSERT INTO system_notifications (recipient_type, recipient_id, title, message, type, notification_type, related_entity_type, related_entity_id)
            VALUES ('admin_lsa', NULL, 'Test LSA Notification', 'Spa application resubmitted for review', 'info', 'spa_registration', 'spa', 1)
        `);
        console.log('✅ LSA notification created successfully');

        // Test SPA notification
        await connection.execute(`
            INSERT INTO system_notifications (recipient_type, recipient_id, title, message, type, notification_type, related_entity_type, related_entity_id)
            VALUES ('admin_spa', 1, 'Test SPA Notification', 'Your application has been resubmitted successfully', 'success', 'spa_registration', 'spa', 1)
        `);
        console.log('✅ SPA notification created successfully');

        // Check created notifications
        const [notifications] = await connection.execute(`
            SELECT * FROM system_notifications 
            WHERE title LIKE 'Test%Notification'
            ORDER BY created_at DESC
        `);

        console.log('\n📋 Created notifications:');
        notifications.forEach(notif => {
            console.log(`- ${notif.title}`);
            console.log(`  Type: ${notif.recipient_type} -> ${notif.notification_type}`);
            console.log(`  Message: ${notif.message}`);
        });

        // Clean up test notifications
        await connection.execute(`
            DELETE FROM system_notifications 
            WHERE title LIKE 'Test%Notification'
        `);
        console.log('\n🧹 Cleaned up test notifications');

        await connection.end();
        console.log('\n✅ Notification test complete');

    } catch (error) {
        console.error('❌ Error:', error);
    }
};

testNotificationCreation();