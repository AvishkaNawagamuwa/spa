const mysql = require('mysql2/promise');

const fixNotificationsTable = async () => {
    try {
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '12345678',
            database: 'lsa_spa_management'
        });

        console.log('🔍 Checking system_notifications table...');

        try {
            // Check if table exists
            const [tables] = await connection.execute(`
                SELECT TABLE_NAME 
                FROM INFORMATION_SCHEMA.TABLES 
                WHERE TABLE_SCHEMA = 'lsa_spa_management' 
                AND TABLE_NAME = 'system_notifications'
            `);

            if (tables.length === 0) {
                console.log('❌ system_notifications table does not exist. Creating...');

                // Create the table with correct structure
                await connection.execute(`
                    CREATE TABLE system_notifications (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        recipient_type ENUM('spa', 'lsa') NOT NULL,
                        recipient_id INT,
                        title VARCHAR(255) NOT NULL,
                        message TEXT NOT NULL,
                        type ENUM('info', 'success', 'warning', 'error') DEFAULT 'info',
                        related_entity_type ENUM('spa', 'therapist', 'request'),
                        related_entity_id INT,
                        is_read BOOLEAN DEFAULT FALSE,
                        read_at TIMESTAMP NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        INDEX idx_notification_recipient (recipient_type, recipient_id),
                        INDEX idx_notification_unread (is_read, created_at)
                    )
                `);

                console.log('✅ Created system_notifications table');

            } else {
                console.log('✅ system_notifications table exists');

                // Check columns
                const [columns] = await connection.execute(`
                    SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
                    FROM INFORMATION_SCHEMA.COLUMNS 
                    WHERE TABLE_SCHEMA = 'lsa_spa_management' 
                    AND TABLE_NAME = 'system_notifications'
                    ORDER BY ORDINAL_POSITION
                `);

                console.log('\n📋 Current columns:');
                columns.forEach(col => {
                    console.log(`- ${col.COLUMN_NAME}: ${col.DATA_TYPE} ${col.IS_NULLABLE === 'NO' ? '(NOT NULL)' : '(NULL)'}`);
                });

                // Check if 'type' column exists
                const hasTypeColumn = columns.some(col => col.COLUMN_NAME === 'type');

                if (!hasTypeColumn) {
                    console.log('\n❌ Missing "type" column. Adding...');
                    await connection.execute(`
                        ALTER TABLE system_notifications 
                        ADD COLUMN type ENUM('info', 'success', 'warning', 'error') DEFAULT 'info' 
                        AFTER message
                    `);
                    console.log('✅ Added "type" column');
                }

                // Check other missing columns
                const expectedColumns = ['is_read', 'read_at'];
                for (const expectedCol of expectedColumns) {
                    const hasColumn = columns.some(col => col.COLUMN_NAME === expectedCol);
                    if (!hasColumn) {
                        console.log(`\n❌ Missing "${expectedCol}" column. Adding...`);

                        if (expectedCol === 'is_read') {
                            await connection.execute(`
                                ALTER TABLE system_notifications 
                                ADD COLUMN is_read BOOLEAN DEFAULT FALSE
                            `);
                        } else if (expectedCol === 'read_at') {
                            await connection.execute(`
                                ALTER TABLE system_notifications 
                                ADD COLUMN read_at TIMESTAMP NULL
                            `);
                        }

                        console.log(`✅ Added "${expectedCol}" column`);
                    }
                }
            }

            // Test notification creation
            console.log('\n🧪 Testing notification creation...');
            await connection.execute(`
                INSERT INTO system_notifications (recipient_type, recipient_id, title, message, type, related_entity_type, related_entity_id)
                VALUES ('lsa', NULL, 'Test Notification', 'This is a test notification', 'info', 'spa', 1)
            `);

            console.log('✅ Test notification created successfully');

            // Clean up test notification
            await connection.execute(`
                DELETE FROM system_notifications 
                WHERE title = 'Test Notification' AND message = 'This is a test notification'
            `);

        } catch (error) {
            console.error('❌ Error during table check/fix:', error);
        }

        await connection.end();
        console.log('\n✅ Database check complete');

    } catch (error) {
        console.error('❌ Database connection error:', error);
    }
};

fixNotificationsTable();