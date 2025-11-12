const db = require('../config/database');
const fs = require('fs').promises;
const path = require('path');

class SpaModel {
    // Register new spa (AdminSPA Registration)
    static async createSpa(spaData, files = {}) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            const {
                name, spa_br_number, spa_tel,
                owner_fname, owner_lname, owner_email, owner_nic, owner_tel, owner_cell,
                address_line1, address_line2, province, postal_code
            } = spaData;

            // Process file paths
            const nic_front_path = files.nic_front ? `/uploads/spas/${files.nic_front[0].filename}` : null;
            const nic_back_path = files.nic_back ? `/uploads/spas/${files.nic_back[0].filename}` : null;
            const br_attachment_path = files.br_attachment ? `/uploads/spas/${files.br_attachment[0].filename}` : null;
            const tax_registration_path = files.tax_registration ? `/uploads/spas/${files.tax_registration[0].filename}` : null;
            const other_doc_path = files.other_doc ? `/uploads/spas/${files.other_doc[0].filename}` : null;

            // Process facility photos (minimum 5 required)
            const facility_photos = files.facility_photos ?
                files.facility_photos.map(file => `/uploads/spas/facility/${file.filename}`) : [];

            // Process professional certifications
            const professional_certifications = files.professional_certifications ?
                files.professional_certifications.map(file => `/uploads/spas/certifications/${file.filename}`) : [];

            const query = `
                INSERT INTO spas (
                    name, spa_br_number, spa_tel,
                    owner_fname, owner_lname, owner_email, owner_nic, owner_tel, owner_cell,
                    address_line1, address_line2, province, postal_code,
                    nic_front_path, nic_back_path, br_attachment_path, tax_registration_path, other_doc_path,
                    facility_photos, professional_certifications,
                    status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
            `;

            const values = [
                name, spa_br_number, spa_tel,
                owner_fname, owner_lname, owner_email, owner_nic, owner_tel, owner_cell,
                address_line1, address_line2, province, postal_code,
                nic_front_path, nic_back_path, br_attachment_path, tax_registration_path, other_doc_path,
                JSON.stringify(facility_photos), JSON.stringify(professional_certifications)
            ];

            const [result] = await connection.execute(query, values);

            // Log activity
            await this.logActivity(connection, 'spa', result.insertId, 'created',
                `New spa registration: ${name}`, 'spa', result.insertId, `${owner_fname} ${owner_lname}`);

            await connection.commit();
            return result.insertId;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    // Get spa profile by ID
    static async getSpaById(spaId) {
        const query = 'SELECT * FROM spas WHERE id = ?';
        const [rows] = await db.execute(query, [spaId]);
        return rows[0];
    }

    // Get spa dashboard statistics
    static async getSpaStats(spaId) {
        const query = 'SELECT * FROM spa_dashboard_stats WHERE spa_id = ?';
        const [rows] = await db.execute(query, [spaId]);
        return rows[0] || {
            spa_id: spaId,
            approved_therapists: 0,
            pending_requests: 0,
            rejected_requests: 0,
            resigned_therapists: 0,
            terminated_therapists: 0,
            total_therapists: 0
        };
    }

    // Update spa verification status (AdminLSA)
    static async updateSpaStatus(spaId, status, reason = null, verifiedBy = null) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            const query = `
                UPDATE spas 
                SET status = ?, reject_reason = ?, verified_at = ?, verified_by = ? 
                WHERE id = ?
            `;

            const values = [
                status,
                reason,
                status === 'verified' ? new Date() : null,
                verifiedBy,
                spaId
            ];

            await connection.execute(query, values);

            // Log activity
            const spa = await this.getSpaById(spaId);
            await this.logActivity(connection, 'spa', spaId, status,
                `Spa ${status}: ${spa.name}`, 'lsa', null, verifiedBy);

            // Create notification for spa
            await this.createNotification(connection, 'spa', spaId,
                `Spa ${status.charAt(0).toUpperCase() + status.slice(1)}`,
                status === 'verified' ?
                    'Your spa has been verified and approved!' :
                    `Your spa verification was rejected. Reason: ${reason}`,
                status === 'verified' ? 'success' : 'error'
            );

            await connection.commit();
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    // Get all spas for LSA dashboard with filtering and pagination
    static async getAllSpas(filters = {}) {
        try {
            let query = `
                SELECT 
                    s.id as spa_id,
                    s.name as spa_name,
                    s.owner_fname,
                    s.owner_lname,
                    CONCAT(COALESCE(s.owner_fname, ''), ' ', COALESCE(s.owner_lname, '')) as owner_name,
                    s.email,
                    s.phone,
                    s.address,
                    s.district,
                    s.province,
                    s.reference_number,
                    s.status,
                    s.verification_status,
                    s.payment_status,
                    s.annual_payment_status,
                    s.payment_method,
                    s.next_payment_date,
                    s.blacklist_reason,
                    s.blacklisted_at,
                    s.blacklisted_by,
                    s.certificate_path,
                    s.form1_certificate_path,
                    s.spa_banner_photos_path,
                    s.spa_photos_banner,
                    s.spa_photos_banner_path,
                    s.nic_front_path,
                    s.nic_back_path,
                    s.br_attachment_path,
                    s.other_document_path,
                    s.annual_fee_paid,
                    s.created_at,
                    s.updated_at,
                    s.registration_date
                FROM spas s
            `;

            const conditions = [];
            const params = [];

            // Status filter
            if (filters.status && filters.status !== 'all') {
                conditions.push('status = ?');
                params.push(filters.status);
            }

            // Verification status filter
            if (filters.verification_status && filters.verification_status !== 'all') {
                conditions.push('verification_status = ?');
                params.push(filters.verification_status);
            }

            // Payment status filter
            if (filters.payment_status && filters.payment_status !== 'all') {
                conditions.push('payment_status = ?');
                params.push(filters.payment_status);
            }

            // District filter
            if (filters.district && filters.district !== 'all') {
                conditions.push('district = ?');
                params.push(filters.district);
            }

            // Search filter (name, email, reference number)
            if (filters.search) {
                conditions.push('(name LIKE ? OR email LIKE ? OR reference_number LIKE ? OR CONCAT(owner_fname, " ", owner_lname) LIKE ?)');
                const searchTerm = `%${filters.search}%`;
                params.push(searchTerm, searchTerm, searchTerm, searchTerm);
            }

            // Add WHERE clause if conditions exist
            if (conditions.length > 0) {
                query += ' WHERE ' + conditions.join(' AND ');
            }

            // Add ORDER BY
            query += ' ORDER BY created_at DESC';

            // Add pagination if provided
            if (filters.limit) {
                const limit = parseInt(filters.limit) || 10;
                const offset = filters.page ? (parseInt(filters.page) - 1) * limit : 0;
                query += ` LIMIT ${limit} OFFSET ${offset}`;
            }

            const [rows] = await db.execute(query, params);

            // Process JSON fields to extract file paths properly
            const processedSpas = rows.map(spa => {
                // Helper function to parse JSON fields and get the first file path
                const parseJsonField = (field) => {
                    if (!field) return null;
                    try {
                        const parsed = JSON.parse(field);
                        if (Array.isArray(parsed) && parsed.length > 0) {
                            return parsed[0]; // Return first file path
                        }
                        return field; // Return as is if not JSON array
                    } catch (e) {
                        return field; // Return original value if not valid JSON
                    }
                };

                return {
                    ...spa,
                    // Parse document paths from JSON arrays
                    form1_certificate_path: parseJsonField(spa.form1_certificate_path),
                    nic_front_path: parseJsonField(spa.nic_front_path),
                    nic_back_path: parseJsonField(spa.nic_back_path),
                    br_attachment_path: parseJsonField(spa.br_attachment_path),
                    other_document_path: parseJsonField(spa.other_document_path),
                    spa_banner_photos_path: parseJsonField(spa.spa_banner_photos_path),

                    // Handle spa_photos_banner (for gallery display)
                    spa_photos_banner: spa.spa_banner_photos_path ? parseJsonField(spa.spa_banner_photos_path) : spa.spa_photos_banner
                };
            });

            // Get total count for pagination
            let totalQuery = 'SELECT COUNT(*) as total FROM spas';
            if (conditions.length > 0) {
                totalQuery += ' WHERE ' + conditions.join(' AND ');
            }

            const [totalResult] = await db.execute(totalQuery, params.slice(0, params.length - (filters.limit ? 0 : 0)));
            const total = totalResult[0].total;

            return {
                spas: processedSpas,
                pagination: {
                    total,
                    page: parseInt(filters.page) || 1,
                    limit: parseInt(filters.limit) || rows.length,
                    totalPages: filters.limit ? Math.ceil(total / parseInt(filters.limit)) : 1
                }
            };
        } catch (error) {
            console.error('Error in getAllSpas:', error);
            throw error;
        }
    }

    // Get detailed spa information with payment history
    static async getSpaWithPaymentDetails(spaId) {
        try {
            // Get spa details
            const spaQuery = `
                SELECT 
                    s.id as spa_id,
                    s.name as spa_name,
                    s.owner_fname,
                    s.owner_lname,
                    CONCAT(COALESCE(s.owner_fname, ''), ' ', COALESCE(s.owner_lname, '')) as owner_name,
                    s.email,
                    s.phone,
                    s.address,
                    s.reference_number,
                    s.status,
                    s.verification_status,
                    s.payment_status,
                    s.annual_payment_status,
                    s.payment_method,
                    s.next_payment_date,
                    s.blacklist_reason,
                    s.blacklisted_at,
                    s.blacklisted_by,
                    s.reject_reason,
                    s.certificate_path,
                    s.form1_certificate_path,
                    s.spa_banner_photos_path,
                    s.spa_photos_banner,
                    s.spa_photos_banner_path,
                    s.nic_front_path,
                    s.nic_back_path,
                    s.br_attachment_path,
                    s.other_document_path,
                    s.annual_fee_paid,
                    s.created_at,
                    s.updated_at,
                    s.registration_date,
                    s.approved_date,
                    s.approved_by
                FROM spas s
                WHERE s.id = ?
            `;

            const [spaRows] = await db.execute(spaQuery, [spaId]);

            if (spaRows.length === 0) {
                return null;
            }

            const spa = spaRows[0];

            // Get payment history from payments table
            const paymentQuery = `
                SELECT 
                    p.id as payment_id,
                    p.amount,
                    p.payment_type,
                    p.payment_method,
                    p.status as payment_status,
                    p.slip_path,
                    p.bank_slip_path,
                    p.reference_number as payment_reference,
                    p.transaction_id,
                    p.payment_plan,
                    p.bank_transfer_approved,
                    p.approval_date,
                    p.approved_by,
                    p.approved_at,
                    p.rejection_reason,
                    p.payhere_order_id,
                    p.payhere_payment_id,
                    p.created_at as payment_created_at,
                    p.updated_at as payment_updated_at
                FROM payments p
                WHERE p.spa_id = ?
                ORDER BY p.created_at DESC
            `;

            const [paymentRows] = await db.execute(paymentQuery, [spaId]);

            // Process JSON fields to extract file paths properly
            const parseJsonField = (field) => {
                if (!field) return null;
                try {
                    const parsed = JSON.parse(field);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        return parsed[0]; // Return first file path
                    }
                    return field; // Return as is if not JSON array
                } catch (e) {
                    return field; // Return original value if not valid JSON
                }
            };

            const processedSpa = {
                ...spa,
                // Parse document paths from JSON arrays
                form1_certificate_path: parseJsonField(spa.form1_certificate_path),
                nic_front_path: parseJsonField(spa.nic_front_path),
                nic_back_path: parseJsonField(spa.nic_back_path),
                br_attachment_path: parseJsonField(spa.br_attachment_path),
                other_document_path: parseJsonField(spa.other_document_path),
                spa_banner_photos_path: parseJsonField(spa.spa_banner_photos_path),
                spa_photos_banner: spa.spa_banner_photos_path ? parseJsonField(spa.spa_banner_photos_path) : spa.spa_photos_banner,
                payments: paymentRows
            };

            return processedSpa;
        } catch (error) {
            console.error('Error in getSpaWithPaymentDetails:', error);
            throw error;
        }
    }

    // Helper method to log activities
    static async logActivity(connection, entityType, entityId, action, description, actorType, actorId, actorName) {
        const query = `
            INSERT INTO activity_logs (entity_type, entity_id, action, description, actor_type, actor_id, actor_name)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        await connection.execute(query, [entityType, entityId, action, description, actorType, actorId, actorName]);
    }

    // Helper method to create notifications
    static async createNotification(connection, recipientType, recipientId, title, message, type = 'info', relatedEntityType = null, relatedEntityId = null) {
        // Map recipient types to match database enum values
        const recipientTypeMap = {
            'lsa': 'admin_lsa',
            'spa': 'admin_spa',
            'admin_lsa': 'admin_lsa',
            'admin_spa': 'admin_spa',
            'government_officer': 'government_officer',
            'all': 'all'
        };

        // Map notification types for spa-related notifications
        const notificationTypeMap = {
            'info': 'spa_registration',
            'success': 'spa_registration',
            'warning': 'system_alert',
            'error': 'system_alert'
        };

        const mappedRecipientType = recipientTypeMap[recipientType] || 'admin_lsa';
        const mappedNotificationType = notificationTypeMap[type] || 'spa_registration';

        // Debug logging
        console.log('🔍 Creating notification with values:', {
            recipientType,
            mappedRecipientType,
            recipientId,
            title,
            message,
            type,
            mappedNotificationType,
            relatedEntityType,
            relatedEntityId
        });

        const query = `
            INSERT INTO system_notifications (recipient_type, recipient_id, title, message, type, notification_type, related_entity_type, related_entity_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        await connection.execute(query, [mappedRecipientType, recipientId, title, message, type, mappedNotificationType, relatedEntityType, relatedEntityId]);
    }

    // Get admin statistics for dashboard
    static async getAdminStats() {
        try {
            const [result] = await db.execute(`
                SELECT 
                    COUNT(*) as total_spas,
                    SUM(CASE WHEN status = 'verified' THEN 1 ELSE 0 END) as verified_spas,
                    SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_verification,
                    SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected_spas
                FROM spas
            `);
            return result[0];
        } catch (error) {
            console.error('Error getting spa admin stats:', error);
            return {
                total_spas: 0,
                verified_spas: 0,
                pending_verification: 0,
                rejected_spas: 0
            };
        }
    }

    // Get recent activities
    static async getRecentActivities(limit = 10) {
        try {
            const limitNum = parseInt(limit) || 10;
            const [activities] = await db.execute(`
                SELECT * FROM activity_logs 
                ORDER BY created_at DESC 
                LIMIT ${limitNum}
            `);
            return activities.map(activity => ({
                id: activity.id,
                message: activity.description,
                time: this.formatTimeAgo(activity.created_at),
                type: activity.entity_type,
                created_at: activity.created_at
            }));
        } catch (error) {
            console.error('Error getting recent activities:', error);
            return [];
        }
    }

    // Get system notifications
    static async getSystemNotifications() {
        try {
            const [notifications] = await db.execute(`
                SELECT * FROM system_notifications 
                WHERE recipient_type = 'admin_lsa' 
                ORDER BY created_at DESC 
                LIMIT 20
            `);
            return notifications;
        } catch (error) {
            console.error('Error getting system notifications:', error);
            return [];
        }
    }

    // Get admin notifications (for the /notifications route)
    static async getAdminNotifications(filters = {}) {
        try {
            let query = `
                SELECT 
                    id,
                    title,
                    message,
                    notification_type as type,
                    is_read as \`read\`,
                    created_at,
                    related_entity_type,
                    related_entity_id
                FROM system_notifications 
                WHERE recipient_type = 'admin_lsa' 
            `;
            const params = [];

            if (filters.type && filters.type !== 'all') {
                query += ' AND notification_type = ?';
                params.push(filters.type);
            }

            if (filters.read_status && filters.read_status !== 'all') {
                query += ' AND is_read = ?';
                params.push(filters.read_status === 'read' ? 1 : 0);
            }

            query += ' ORDER BY created_at DESC LIMIT 50';

            const [notifications] = await db.execute(query, params);
            return notifications;
        } catch (error) {
            console.error('Error getting admin notifications:', error);
            return [];
        }
    }

    // Get unread notification count
    static async getUnreadNotificationCount() {
        try {
            const [result] = await db.execute(`
                SELECT COUNT(*) as count 
                FROM system_notifications 
                WHERE recipient_type = 'admin_lsa' AND is_read = 0
            `);
            return result[0].count;
        } catch (error) {
            console.error('Error getting unread notification count:', error);
            return 0;
        }
    }

    // Get admin notifications with filters
    static async getAdminNotifications(filters = {}) {
        try {
            let query = `
                SELECT * FROM system_notifications 
                WHERE recipient_type = 'admin_lsa'
            `;
            const params = [];
            const conditions = [];

            if (filters.type) {
                conditions.push('notification_type = ?');
                params.push(filters.type);
            }

            if (filters.read_status === 'read') {
                conditions.push('is_read = 1');
            } else if (filters.read_status === 'unread') {
                conditions.push('is_read = 0');
            }

            if (conditions.length > 0) {
                query += ' AND ' + conditions.join(' AND ');
            }

            query += ' ORDER BY created_at DESC LIMIT 50';

            const [notifications] = await db.execute(query, params);
            return notifications;
        } catch (error) {
            console.error('Error getting admin notifications:', error);
            return [];
        }
    }

    // Helper method to format time ago
    static formatTimeAgo(date) {
        const now = new Date();
        const diffInMs = now - new Date(date);
        const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
        const diffInDays = Math.floor(diffInHours / 24);

        if (diffInDays > 0) {
            return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
        } else if (diffInHours > 0) {
            return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
        } else {
            const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
            return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
        }
    }

    // Update getAllSpas method to support filtering
    static async getAllSpas(filters = {}) {
        try {
            let query = `
                SELECT 
                    id as spa_id,
                    name as spa_name,
                    CONCAT(COALESCE(owner_fname, ''), ' ', COALESCE(owner_lname, '')) as owner_name,
                    email,
                    phone as contact_phone,
                    address as city,
                    verification_status,
                    status,
                    created_at
                FROM spas
            `;
            const params = [];
            const conditions = [];

            if (filters.status && filters.status !== 'all') {
                conditions.push('status = ?');
                params.push(filters.status);
            }

            if (filters.verification_status && filters.verification_status !== 'all') {
                conditions.push('verification_status = ?');
                params.push(filters.verification_status);
            }

            if (filters.search) {
                conditions.push('(name LIKE ? OR COALESCE(owner_fname, "") LIKE ? OR COALESCE(owner_lname, "") LIKE ? OR email LIKE ?)');
                const searchTerm = `%${filters.search}%`;
                params.push(searchTerm, searchTerm, searchTerm, searchTerm);
            }

            if (conditions.length > 0) {
                query += ' WHERE ' + conditions.join(' AND ');
            }

            query += ' ORDER BY created_at DESC';

            // Simple pagination
            if (filters.limit) {
                const limit = Math.max(1, parseInt(filters.limit) || 10);
                query += ` LIMIT ${limit}`;

                if (filters.page && parseInt(filters.page) > 1) {
                    const offset = (parseInt(filters.page) - 1) * limit;
                    query += ` OFFSET ${offset}`;
                }
            } else {
                query += ' LIMIT 50';
            }

            const [spas] = await db.execute(query, params);
            return { spas };
        } catch (error) {
            console.error('Error getting all spas:', error);
            return { spas: [] };
        }
    }

    // Resubmit rejected spa application with updated data
    static async resubmitSpa(spaId, updateData) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            // Build update query dynamically based on provided fields
            const updateFields = [];
            const updateValues = [];

            Object.keys(updateData).forEach(key => {
                if (updateData[key] !== undefined && updateData[key] !== null) {
                    updateFields.push(`${key} = ?`);
                    updateValues.push(updateData[key]);
                }
            });

            if (updateFields.length === 0) {
                throw new Error('No valid update data provided');
            }

            const query = `
                UPDATE spas 
                SET ${updateFields.join(', ')} 
                WHERE id = ?
            `;

            updateValues.push(spaId);
            await connection.execute(query, updateValues);

            // Get updated spa info for activity log
            const spa = await this.getSpaById(spaId);

            // Log the resubmission activity
            await this.logActivity(connection, 'spa', spaId, 'resubmitted',
                `Spa application resubmitted: ${spa.name}`, 'spa', spaId, `${spa.owner_fname} ${spa.owner_lname}`);

            // Create notification for LSA about resubmission
            await this.createNotification(connection, 'lsa', null,
                'Spa Application Resubmitted',
                `${spa.name} has resubmitted their corrected application for review.`,
                'info', 'spa', spaId
            );

            // Create notification for SPA confirming resubmission
            await this.createNotification(connection, 'spa', spaId,
                'Application Resubmitted Successfully',
                'Your corrected application has been resubmitted and is now pending review by AdminLSA.',
                'success', 'spa', spaId
            );

            await connection.commit();
            return { spa_id: spaId, status: 'pending' };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }
}

module.exports = SpaModel;