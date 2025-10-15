const db = require('../config/database');

class TherapistModel {
    // Add new therapist (AdminSPA) - Creates as 'pending' and sends request to AdminLSA
    static async createTherapist(therapistData, files = {}, spaId) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            const {
                fname, lname, birthday, nic, telno, email, specialty
            } = therapistData;

            // Process file paths
            const nic_attachment_path = files.nic_attachment ? `/uploads/therapists/${files.nic_attachment[0].filename}` : null;
            const medical_certificate_path = files.medical_certificate ? `/uploads/therapists/${files.medical_certificate[0].filename}` : null;
            const spa_certificate_path = files.spa_certificate ? `/uploads/therapists/${files.spa_certificate[0].filename}` : null;
            const therapist_image_path = files.therapist_image ? `/uploads/therapists/${files.therapist_image[0].filename}` : null;

            // Insert therapist
            const therapistQuery = `
                INSERT INTO therapists (
                    spa_id, fname, lname, birthday, nic, telno, email, specialty,
                    nic_attachment_path, medical_certificate_path, spa_certificate_path, therapist_image_path,
                    status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
            `;

            const therapistValues = [
                spaId, fname, lname, birthday, nic, telno, email, specialty,
                nic_attachment_path, medical_certificate_path, spa_certificate_path, therapist_image_path
            ];

            const [therapistResult] = await connection.execute(therapistQuery, therapistValues);
            const therapistId = therapistResult.insertId;

            // Create request for AdminLSA
            const requestQuery = `
                INSERT INTO therapist_requests (therapist_id, spa_id, request_type, request_status, spa_notes)
                VALUES (?, ?, 'add', 'pending', ?)
            `;

            await connection.execute(requestQuery, [therapistId, spaId, `New therapist registration request for ${fname} ${lname}`]);

            // Log activity
            await this.logActivity(connection, 'therapist', therapistId, 'created',
                `New therapist request: ${fname} ${lname}`, 'spa', spaId, `${fname} ${lname}`);

            // Create notification for LSA
            await this.createNotification(connection, 'admin_lsa', null,
                'New Therapist Request',
                `New therapist registration request from spa: ${fname} ${lname}`,
                'therapist_application', 'therapist', therapistId
            );

            await connection.commit();
            return therapistId;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    // Get therapists by spa ID with optional status filter
    static async getTherapistsBySpa(spaId, status = null) {
        let query = `
            SELECT t.*, s.name as spa_name 
            FROM therapists t 
            LEFT JOIN spas s ON t.spa_id = s.id 
            WHERE t.spa_id = ?
        `;
        const params = [spaId];

        if (status) {
            query += ' AND t.status = ?';
            params.push(status);
        }

        query += ' ORDER BY t.created_at DESC';
        const [rows] = await db.execute(query, params);
        return rows;
    }

    // Get all therapists for AdminLSA with optional status filter
    static async getAllTherapists(status = null) {
        console.log('🚀 TherapistModel.getAllTherapists called with status:', status);

        let query = `
            SELECT t.*, s.name as spa_name, s.owner_fname, s.owner_lname 
            FROM therapists t 
            LEFT JOIN spas s ON t.spa_id = s.id
        `;
        const params = [];

        if (status) {
            query += ' WHERE t.status = ?';
            params.push(status);
        }

        query += ' ORDER BY t.created_at DESC';

        console.log('🔍 Executing therapist query:', query);
        console.log('📝 With params:', params);

        let rows;
        try {
            const result = await db.execute(query, params);
            rows = result[0]; // Get the first element which contains the rows
            console.log('📊 Query returned:', rows.length, 'rows');
        } catch (dbError) {
            console.error('❌ Database error in getAllTherapists:', dbError);
            throw dbError;
        }

        if (rows.length > 0) {
            console.log('🎯 First row sample:', {
                id: rows[0].id,
                name: rows[0].name,
                status: rows[0].status,
                spa_name: rows[0].spa_name
            });
        }

        return rows;
    }

    // Get pending therapist requests for AdminLSA
    static async getPendingRequests() {
        const query = `
            SELECT t.*, s.name as spa_name, s.owner_fname, s.owner_lname, 
                   tr.id as request_id, tr.spa_notes, tr.created_at as request_date
            FROM therapists t 
            LEFT JOIN spas s ON t.spa_id = s.id
            LEFT JOIN therapist_requests tr ON t.id = tr.therapist_id
            WHERE t.status = 'pending' AND tr.request_status = 'pending'
            ORDER BY tr.created_at DESC
        `;
        const [rows] = await db.execute(query);
        return rows;
    }

    // AdminLSA approve therapist
    static async approveTherapist(therapistId, reviewedBy) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            // Update therapist status
            const updateTherapistQuery = `
                UPDATE therapists 
                SET status = 'approved', approved_date = NOW()
                WHERE id = ?
            `;
            await connection.execute(updateTherapistQuery, [therapistId]);

            // Update request status
            const updateRequestQuery = `
                UPDATE therapist_requests 
                SET request_status = 'approved', response_message = 'Therapist approved successfully', 
                    response_date = NOW(), responded_by = ?
                WHERE therapist_id = ? AND request_status = 'pending'
            `;
            await connection.execute(updateRequestQuery, [reviewedBy, therapistId]);

            // Get therapist details for notifications
            const therapist = await this.getTherapistById(therapistId);
            const therapistName = therapist.name || `${therapist.first_name || ''} ${therapist.last_name || ''}`.trim();

            // Log activity
            await this.logActivity(connection, 'therapist', therapistId, 'approved',
                `Therapist approved: ${therapistName}`, 'lsa', null, reviewedBy);

            // Create notification for spa
            await this.createNotification(connection, 'admin_spa', therapist.spa_id,
                'Therapist Approved',
                `Your therapist ${therapistName} has been approved!`,
                'therapist_application', 'therapist', therapistId
            );

            await connection.commit();
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    // AdminLSA reject therapist
    static async rejectTherapist(therapistId, reason, reviewedBy) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            // Update therapist status
            const updateTherapistQuery = `
                UPDATE therapists 
                SET status = 'rejected', reject_reason = ?
                WHERE id = ?
            `;
            await connection.execute(updateTherapistQuery, [reason, therapistId]);

            // Update request status
            const updateRequestQuery = `
                UPDATE therapist_requests 
                SET request_status = 'rejected', response_message = ?, 
                    response_date = NOW(), responded_by = ?
                WHERE therapist_id = ? AND request_status = 'pending'
            `;
            await connection.execute(updateRequestQuery, [reason, reviewedBy, therapistId]);

            // Get therapist details for notifications
            const therapist = await this.getTherapistById(therapistId);
            const therapistName = therapist.name || `${therapist.first_name || ''} ${therapist.last_name || ''}`.trim();

            // Log activity
            await this.logActivity(connection, 'therapist', therapistId, 'rejected',
                `Therapist rejected: ${therapistName}. Reason: ${reason}`, 'lsa', null, reviewedBy);

            // Create notification for spa
            await this.createNotification(connection, 'admin_spa', therapist.spa_id,
                'Therapist Rejected',
                `Your therapist ${therapistName} was rejected. Reason: ${reason}`,
                'therapist_application', 'therapist', therapistId
            );

            await connection.commit();
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    // AdminSPA resign therapist
    static async resignTherapist(therapistId, spaId) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            const updateQuery = `
                UPDATE therapists 
                SET status = 'resigned', resigned_at = NOW()
                WHERE id = ? AND spa_id = ? AND status = 'approved'
            `;
            const [result] = await connection.execute(updateQuery, [therapistId, spaId]);

            if (result.affectedRows === 0) {
                throw new Error('Therapist not found or cannot be resigned');
            }

            // Get therapist details
            const therapist = await this.getTherapistById(therapistId);
            const therapistName = therapist.name || `${therapist.first_name || ''} ${therapist.last_name || ''}`.trim();

            // Log activity
            await this.logActivity(connection, 'therapist', therapistId, 'resigned',
                `Therapist resigned: ${therapistName}`, 'spa', spaId, therapistName);

            await connection.commit();
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    // AdminSPA terminate therapist
    static async terminateTherapist(therapistId, spaId, reason = null) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            const updateQuery = `
                UPDATE therapists 
                SET status = 'terminated', terminated_at = NOW(), termination_reason = ?
                WHERE id = ? AND spa_id = ? AND status = 'approved'
            `;
            const [result] = await connection.execute(updateQuery, [reason, therapistId, spaId]);

            if (result.affectedRows === 0) {
                throw new Error('Therapist not found or cannot be terminated');
            }

            // Get therapist details
            const therapist = await this.getTherapistById(therapistId);
            const therapistName = therapist.name || `${therapist.first_name || ''} ${therapist.last_name || ''}`.trim();

            // Log activity
            await this.logActivity(connection, 'therapist', therapistId, 'terminated',
                `Therapist terminated: ${therapistName}${reason ? '. Reason: ' + reason : ''}`,
                'spa', spaId, therapistName);

            await connection.commit();
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    // Resubmit rejected therapist (AdminSPA)
    static async resubmitTherapist(therapistId, therapistData, files = {}, spaId) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            const {
                fname, lname, birthday, nic, telno, email, specialty
            } = therapistData;

            // Process file paths - only update if new files are provided
            let updateFields = [];
            let updateValues = [];

            // Basic information updates - map to correct database column names
            if (fname) {
                updateFields.push('first_name = ?');
                updateValues.push(fname);
            }
            if (lname) {
                updateFields.push('last_name = ?');
                updateValues.push(lname);
            }
            if (birthday) {
                updateFields.push('date_of_birth = ?');
                // Convert date to proper format (YYYY-MM-DD) if it's an ISO string
                const dateValue = birthday.includes('T') ? birthday.split('T')[0] : birthday;
                updateValues.push(dateValue);
            }
            if (nic) {
                updateFields.push('nic_number = ?');
                updateValues.push(nic);
            }
            if (telno) {
                updateFields.push('phone = ?');
                updateValues.push(telno);
            }
            if (email) {
                updateFields.push('email = ?');
                updateValues.push(email);
            }
            if (specialty) {
                updateFields.push('specialization = ?');
                updateValues.push(specialty);
            }

            // File updates - only update if new files are provided
            if (files.nic_attachment) {
                updateFields.push('nic_attachment = ?');
                updateValues.push(`/uploads/therapists/${files.nic_attachment[0].filename}`);
            }
            if (files.medical_certificate) {
                updateFields.push('medical_certificate = ?');
                updateValues.push(`/uploads/therapists/${files.medical_certificate[0].filename}`);
            }
            if (files.spa_certificate) {
                updateFields.push('spa_center_certificate = ?');
                updateValues.push(`/uploads/therapists/${files.spa_certificate[0].filename}`);
            }
            if (files.therapist_image) {
                updateFields.push('therapist_image = ?');
                updateValues.push(`/uploads/therapists/${files.therapist_image[0].filename}`);
            }

            // Always update status to pending and clear reject reason
            updateFields.push('status = ?');
            updateValues.push('pending');
            updateFields.push('reject_reason = ?');
            updateValues.push(null);

            updateValues.push(therapistId);
            updateValues.push(spaId);

            // Update therapist
            const updateQuery = `
                UPDATE therapists 
                SET ${updateFields.join(', ')}
                WHERE id = ? AND spa_id = ? AND status = 'rejected'
            `;

            const [result] = await connection.execute(updateQuery, updateValues);

            if (result.affectedRows === 0) {
                throw new Error('Therapist not found or cannot be resubmitted');
            }

            // Create new request for AdminLSA (check if therapist_requests table exists)
            try {
                const requestQuery = `
                    INSERT INTO therapist_requests (therapist_id, spa_id, request_type, request_status, spa_notes)
                    VALUES (?, ?, 'resubmit', 'pending', ?)
                `;
                await connection.execute(requestQuery, [therapistId, spaId, `Resubmitted therapist application for ${fname} ${lname}`]);
            } catch (requestError) {
                // If therapist_requests table doesn't exist, continue without it
                console.log('Note: therapist_requests table not available:', requestError.message);
            }

            // Log activity (check if this method exists)
            try {
                await this.logActivity(connection, 'therapist', therapistId, 'resubmitted',
                    `Therapist resubmitted: ${fname} ${lname}`, 'spa', spaId, `${fname} ${lname}`);
            } catch (logError) {
                console.log('Note: Activity logging not available:', logError.message);
            }

            // Create notification for LSA (check if this method exists)
            try {
                await this.createNotification(connection, 'admin_lsa', null,
                    'Therapist Resubmission',
                    `Resubmitted therapist application from spa: ${fname} ${lname}`,
                    'therapist_application', 'therapist', therapistId
                );
            } catch (notificationError) {
                console.log('Note: Notification creation not available:', notificationError.message);
            }

            await connection.commit();
            return therapistId;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    // Search therapists
    static async searchTherapists(searchTerm, spaId = null) {
        let query = `
            SELECT t.*, s.name as spa_name 
            FROM therapists t 
            LEFT JOIN spas s ON t.spa_id = s.id 
            WHERE (t.fname LIKE ? OR t.lname LIKE ? OR t.nic = ? OR t.email LIKE ? OR t.specialty LIKE ?)
        `;
        let params = [
            `%${searchTerm}%`, `%${searchTerm}%`, searchTerm, `%${searchTerm}%`, `%${searchTerm}%`
        ];

        if (spaId) {
            query += ' AND t.spa_id = ?';
            params.push(spaId);
        }

        query += ' ORDER BY t.created_at DESC';
        const [rows] = await db.execute(query, params);
        return rows;
    }

    // Get therapist by ID
    static async getTherapistById(therapistId) {
        const query = `
            SELECT t.*, s.name as spa_name 
            FROM therapists t 
            LEFT JOIN spas s ON t.spa_id = s.id 
            WHERE t.id = ?
        `;
        const [rows] = await db.execute(query, [therapistId]);
        return rows[0];
    }

    // Get recent activity
    static async getRecentActivity(limit = 10, spaId = null) {
        let query = 'SELECT * FROM recent_activity';
        const params = [];

        if (spaId) {
            query += ' WHERE (entity_type = "therapist" AND entity_id IN (SELECT id FROM therapists WHERE spa_id = ?)) OR (entity_type = "spa" AND entity_id = ?)';
            params.push(spaId, spaId);
        }

        query += ' LIMIT ?';
        params.push(limit);

        const [rows] = await db.execute(query, params);
        return rows;
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
    static async createNotification(connection, recipientType, recipientId, title, message, notificationType = 'system_alert', relatedEntityType = null, relatedEntityId = null) {
        const query = `
            INSERT INTO system_notifications (recipient_type, recipient_id, title, message, notification_type, related_entity_type, related_entity_id)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        await connection.execute(query, [recipientType, recipientId, title, message, notificationType, relatedEntityType, relatedEntityId]);
    }

    // Get admin statistics for dashboard
    static async getAdminStats() {
        try {
            const [result] = await db.execute(`
                SELECT 
                    COUNT(*) as total_therapists,
                    SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_therapists,
                    SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_applications,
                    SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected_applications,
                    SUM(CASE WHEN status = 'resigned' THEN 1 ELSE 0 END) as resigned_therapists,
                    SUM(CASE WHEN status = 'terminated' THEN 1 ELSE 0 END) as terminated_therapists
                FROM therapists
            `);
            return result[0];
        } catch (error) {
            console.error('Error getting therapist admin stats:', error);
            return {
                total_therapists: 0,
                approved_therapists: 0,
                pending_applications: 0,
                rejected_applications: 0,
                resigned_therapists: 0,
                terminated_therapists: 0
            };
        }
    }

    // Update getAllTherapists method to support filtering and return proper format
    static async getAllTherapists(filters = {}) {
        try {
            let query = `
                SELECT 
                    t.*,
                    s.name as spa_name,
                    CONCAT(COALESCE(s.owner_fname, ''), ' ', COALESCE(s.owner_lname, '')) as spa_owner_name
                FROM therapists t 
                LEFT JOIN spas s ON t.spa_id = s.id
            `;
            const params = [];
            const conditions = [];

            // Handle both old signature (status as string) and new signature (filters object)
            if (typeof filters === 'string') {
                // Old signature: getAllTherapists(status)
                if (filters && filters !== 'all') {
                    conditions.push('t.status = ?');
                    params.push(filters);
                }
            } else {
                // New signature: getAllTherapists(filters)
                if (filters.status && filters.status !== 'all') {
                    conditions.push('t.status = ?');
                    params.push(filters.status);
                }

                if (filters.spa_id) {
                    conditions.push('t.spa_id = ?');
                    params.push(filters.spa_id);
                }

                if (filters.search) {
                    conditions.push('(t.name LIKE ? OR t.email LIKE ? OR s.name LIKE ?)');
                    const searchTerm = `%${filters.search}%`;
                    params.push(searchTerm, searchTerm, searchTerm);
                }
            }

            if (conditions.length > 0) {
                query += ' WHERE ' + conditions.join(' AND ');
            }

            query += ' ORDER BY t.created_at DESC';

            // Pagination for filters object
            if (typeof filters === 'object' && filters.limit) {
                const limit = Math.max(1, parseInt(filters.limit) || 10);
                query += ` LIMIT ${limit}`;

                if (filters.page && parseInt(filters.page) > 1) {
                    const offset = (parseInt(filters.page) - 1) * limit;
                    query += ` OFFSET ${offset}`;
                }
            } else {
                query += ' LIMIT 50'; // Default limit
            }

            const [therapists] = await db.execute(query, params);
            return { therapists };
        } catch (error) {
            console.error('Error getting all therapists:', error);
            return { therapists: [] };
        }
    }
}

module.exports = TherapistModel;