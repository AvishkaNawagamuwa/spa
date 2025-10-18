const cron = require('node-cron');
const db = require('../config/database');

/**
 * Payment Status Checker Service
 * Runs daily to check for overdue payments and update spa status automatically
 * If a spa's next_payment_date is 5+ days overdue, status changes from 'verified' to 'unverified'
 */

class PaymentStatusChecker {

    /**
     * Start the cron job to check payment statuses daily
     */
    static startScheduler() {
        console.log('🕒 Starting Payment Status Checker scheduler...');

        // Run every day at 2 AM
        cron.schedule('0 2 * * *', async () => {
            console.log('🔄 Running daily payment status check...');
            await this.checkOverduePayments();
        });

        // Also run immediately on startup for testing
        console.log('🔄 Running initial payment status check...');
        this.checkOverduePayments();
    }

    /**
     * Check for spas with overdue payments and update their status
     */
    static async checkOverduePayments() {
        let connection;

        try {
            connection = await db.getConnection();

            // Find spas that are verified but have payments overdue by 5+ days
            const [overdueSPAs] = await connection.execute(`
                SELECT 
                    id, 
                    name, 
                    next_payment_date,
                    status,
                    DATEDIFF(CURDATE(), next_payment_date) as days_overdue
                FROM spas 
                WHERE status = 'verified' 
                AND next_payment_date IS NOT NULL 
                AND DATEDIFF(CURDATE(), next_payment_date) > 5
            `);

            if (overdueSPAs.length === 0) {
                console.log('✅ No overdue payments found');
                return;
            }

            console.log(`⚠️ Found ${overdueSPAs.length} SPAs with overdue payments (5+ days)`);

            // Update each overdue spa to unverified status
            for (const spa of overdueSPAs) {
                await connection.execute(`
                    UPDATE spas 
                    SET status = 'unverified', 
                        updated_at = NOW() 
                    WHERE id = ?
                `, [spa.id]);

                console.log(`📋 Updated SPA "${spa.name}" (ID: ${spa.id}) status to 'unverified' - ${spa.days_overdue} days overdue`);

                // Create notification for the spa
                try {
                    await connection.execute(`
                        INSERT INTO system_notifications (
                            recipient_type, recipient_id, title, message, type, 
                            related_entity_type, related_entity_id, created_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
                    `, [
                        'admin_spa',
                        spa.id,
                        'Payment Overdue - Status Updated',
                        `Your spa status has been changed to 'unverified' due to overdue payment. Payment was due on ${new Date(spa.next_payment_date).toLocaleDateString('en-GB')}. Please make your payment to restore verified status.`,
                        'warning',
                        'payment',
                        spa.id
                    ]);
                    console.log(`📬 Notification sent to SPA ID: ${spa.id}`);
                } catch (notificationError) {
                    console.error(`❌ Failed to create notification for SPA ID: ${spa.id}`, notificationError.message);
                }
            }

            console.log(`✅ Successfully updated ${overdueSPAs.length} overdue SPAs to 'unverified' status`);

        } catch (error) {
            console.error('❌ Error checking overdue payments:', error);
        } finally {
            if (connection) {
                connection.release();
            }
        }
    }

    /**
     * Manual trigger for checking overdue payments (for testing)
     */
    static async runManualCheck() {
        console.log('🔧 Running manual payment status check...');
        await this.checkOverduePayments();
    }
}

module.exports = PaymentStatusChecker;