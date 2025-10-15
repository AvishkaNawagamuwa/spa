const express = require('express');
const router = express.Router();
const NotificationModel = require('../models/NotificationModel');
const ActivityLogModel = require('../models/ActivityLogModel');
const db = require('../config/database');

// Get all notifications for AdminLSA
router.get('/notifications', async (req, res) => {
    try {
        const { unread_only = false } = req.query;

        const notifications = await NotificationModel.getNotificationsByRecipient(
            'lsa',
            1, // LSA admin ID
            unread_only === 'true'
        );

        res.json({
            success: true,
            notifications,
            total: notifications.length
        });
    } catch (error) {
        console.error('Error fetching LSA notifications:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch notifications'
        });
    }
});

// Mark notification as read
router.patch('/notifications/:id/read', async (req, res) => {
    try {
        await NotificationModel.markAsRead(req.params.id);

        res.json({
            success: true,
            message: 'Notification marked as read'
        });
    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to mark notification as read'
        });
    }
});

// Mark all notifications as read
router.patch('/notifications/mark-all-read', async (req, res) => {
    try {
        await NotificationModel.markAllAsRead('lsa', 1);

        res.json({
            success: true,
            message: 'All notifications marked as read'
        });
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to mark all notifications as read'
        });
    }
});

// Get unread notification count
router.get('/notifications/unread-count', async (req, res) => {
    try {
        const count = await NotificationModel.getUnreadCount('lsa', 1);

        res.json({
            success: true,
            unread_count: count
        });
    } catch (error) {
        console.error('Error getting unread count:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get unread count'
        });
    }
});

// Get all spas with enhanced data
router.get('/spas', async (req, res) => {
    try {
        const { status = 'all', page = 1, limit = 10 } = req.query;

        let query = `
            SELECT s.*, 
                   COUNT(t.id) as therapist_count,
                   COUNT(CASE WHEN t.status = 'approved' THEN 1 END) as approved_therapists,
                   COUNT(CASE WHEN t.status = 'pending' THEN 1 END) as pending_therapists,
                   COUNT(CASE WHEN t.status = 'rejected' THEN 1 END) as rejected_therapists
            FROM spas s
            LEFT JOIN therapists t ON s.id = t.spa_id
        `;

        const params = [];

        if (status !== 'all') {
            query += ' WHERE s.verification_status = ?';
            params.push(status);
        }

        query += ' GROUP BY s.id ORDER BY s.created_at DESC';

        if (limit !== 'all') {
            const offset = (page - 1) * parseInt(limit);
            query += ' LIMIT ? OFFSET ?';
            params.push(parseInt(limit), offset);
        }

        const [spas] = await db.execute(query, params);

        // Get total count for pagination
        let countQuery = 'SELECT COUNT(*) as total FROM spas';
        if (status !== 'all') {
            countQuery += ' WHERE verification_status = ?';
        }

        const [countResult] = await db.execute(countQuery, status !== 'all' ? [status] : []);

        res.json({
            success: true,
            spas,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: countResult[0].total
            }
        });
    } catch (error) {
        console.error('Error fetching spas:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch spas'
        });
    }
});

// Get specific spa with full details
router.get('/spas/:id', async (req, res) => {
    try {
        const [spaResult] = await db.execute(`
            SELECT s.*, 
                   COUNT(t.id) as therapist_count,
                   COUNT(CASE WHEN t.status = 'approved' THEN 1 END) as approved_therapists,
                   COUNT(CASE WHEN t.status = 'pending' THEN 1 END) as pending_therapists
            FROM spas s
            LEFT JOIN therapists t ON s.id = t.spa_id
            WHERE s.id = ?
            GROUP BY s.id
        `, [req.params.id]);

        if (spaResult.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Spa not found'
            });
        }

        // Get therapists for this spa
        const [therapists] = await db.execute(`
            SELECT * FROM therapists WHERE spa_id = ? ORDER BY created_at DESC
        `, [req.params.id]);

        // Get recent activities for this spa
        const activities = await ActivityLogModel.getEntityActivities('spa', req.params.id);

        res.json({
            success: true,
            spa: spaResult[0],
            therapists,
            activities
        });
    } catch (error) {
        console.error('Error fetching spa details:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch spa details'
        });
    }
});

// Approve spa
router.patch('/spas/:id/approve', async (req, res) => {
    try {
        const spaId = req.params.id;
        const { notes } = req.body;

        // Update spa status
        await db.execute(`
            UPDATE spas 
            SET verification_status = 'approved', 
                status = 'unverified',
                approved_by = 1,
                approved_date = NOW()
            WHERE id = ?
        `, [spaId]);

        // Get spa details
        const [spa] = await db.execute('SELECT * FROM spas WHERE id = ?', [spaId]);

        // Log activity
        await ActivityLogModel.logActivity({
            entity_type: 'spa',
            entity_id: spaId,
            action: 'approved',
            description: `Spa ${spa[0].name} approved by LSA administration`,
            actor_type: 'lsa',
            actor_id: 1,
            actor_name: 'LSA Admin',
            old_status: 'pending',
            new_status: 'unverified',
            metadata: { notes }
        });

        // Create notification for spa
        await NotificationModel.createNotification({
            recipient_type: 'spa',
            recipient_id: spaId,
            title: 'Spa Registration Approved',
            message: `Your spa ${spa[0].name} has been approved and is now unverified.`,
            type: 'success',
            related_entity_type: 'spa',
            related_entity_id: spaId
        });

        res.json({
            success: true,
            message: 'Spa approved successfully'
        });
    } catch (error) {
        console.error('Error approving spa:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to approve spa'
        });
    }
});

// Reject spa
router.patch('/spas/:id/reject', async (req, res) => {
    try {
        const spaId = req.params.id;
        const { reason, notes } = req.body;

        if (!reason) {
            return res.status(400).json({
                success: false,
                error: 'Rejection reason is required'
            });
        }

        // Update spa status
        await db.execute(`
            UPDATE spas 
            SET verification_status = 'rejected', 
                status = 'rejected',
                reject_reason = ?
            WHERE id = ?
        `, [reason, spaId]);

        // Get spa details
        const [spa] = await db.execute('SELECT * FROM spas WHERE id = ?', [spaId]);

        // Log activity
        await ActivityLogModel.logActivity({
            entity_type: 'spa',
            entity_id: spaId,
            action: 'rejected',
            description: `Spa ${spa[0].name} rejected by LSA administration: ${reason}`,
            actor_type: 'lsa',
            actor_id: 1,
            actor_name: 'LSA Admin',
            old_status: 'pending',
            new_status: 'rejected',
            metadata: { reason, notes }
        });

        // Create notification for spa
        await NotificationModel.createNotification({
            recipient_type: 'spa',
            recipient_id: spaId,
            title: 'Spa Registration Rejected',
            message: `Your spa ${spa[0].name} registration was rejected. Reason: ${reason}`,
            type: 'error',
            related_entity_type: 'spa',
            related_entity_id: spaId
        });

        res.json({
            success: true,
            message: 'Spa rejected successfully'
        });
    } catch (error) {
        console.error('Error rejecting spa:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to reject spa'
        });
    }
});

// Get all therapists with enhanced data
router.get('/therapists', async (req, res) => {
    try {
        const { status = 'all', spa_id, page = 1, limit = 10 } = req.query;

        let query = `
            SELECT t.*, s.name as spa_name, s.reference_number
            FROM therapists t
            JOIN spas s ON t.spa_id = s.id
        `;

        const params = [];
        const conditions = [];

        if (status !== 'all') {
            conditions.push('t.status = ?');
            params.push(status);
        }

        if (spa_id) {
            conditions.push('t.spa_id = ?');
            params.push(spa_id);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' ORDER BY t.created_at DESC';

        if (limit !== 'all') {
            const offset = (page - 1) * parseInt(limit);
            query += ' LIMIT ? OFFSET ?';
            params.push(parseInt(limit), offset);
        }

        const [therapists] = await db.execute(query, params);

        res.json({
            success: true,
            therapists,
            total: therapists.length
        });
    } catch (error) {
        console.error('Error fetching therapists:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch therapists'
        });
    }
});

// Approve therapist
router.patch('/therapists/:id/approve', async (req, res) => {
    try {
        const therapistId = req.params.id;
        const { notes } = req.body;

        // Get therapist details
        const [therapist] = await db.execute(`
            SELECT t.*, s.name as spa_name 
            FROM therapists t 
            JOIN spas s ON t.spa_id = s.id 
            WHERE t.id = ?
        `, [therapistId]);

        if (therapist.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Therapist not found'
            });
        }

        // Update therapist status
        await db.execute(`
            UPDATE therapists 
            SET status = 'approved', 
                approved_by = 1,
                approved_date = NOW()
            WHERE id = ?
        `, [therapistId]);

        // Update working history
        const currentHistory = JSON.parse(therapist[0].working_history || '[]');
        const updatedHistory = currentHistory.map(entry => {
            if (entry.spa_id === therapist[0].spa_id && !entry.end_date) {
                return { ...entry, status: 'approved', approved_date: new Date().toISOString() };
            }
            return entry;
        });

        await db.execute(`
            UPDATE therapists 
            SET working_history = ?
            WHERE id = ?
        `, [JSON.stringify(updatedHistory), therapistId]);

        // Log activity
        await ActivityLogModel.logActivity({
            entity_type: 'therapist',
            entity_id: therapistId,
            action: 'approved',
            description: `Therapist ${therapist[0].name} approved for ${therapist[0].spa_name}`,
            actor_type: 'lsa',
            actor_id: 1,
            actor_name: 'LSA Admin',
            old_status: 'pending',
            new_status: 'approved',
            metadata: { notes }
        });

        // Create notification for spa
        await NotificationModel.createNotification({
            recipient_type: 'spa',
            recipient_id: therapist[0].spa_id,
            title: 'Therapist Approved',
            message: `${therapist[0].name} has been approved and can now work at your spa.`,
            type: 'success',
            related_entity_type: 'therapist',
            related_entity_id: therapistId
        });

        res.json({
            success: true,
            message: 'Therapist approved successfully'
        });
    } catch (error) {
        console.error('Error approving therapist:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to approve therapist'
        });
    }
});

// Reject therapist
router.patch('/therapists/:id/reject', async (req, res) => {
    try {
        const therapistId = req.params.id;
        const { reason, notes } = req.body;

        if (!reason) {
            return res.status(400).json({
                success: false,
                error: 'Rejection reason is required'
            });
        }

        // Get therapist details
        const [therapist] = await db.execute(`
            SELECT t.*, s.name as spa_name 
            FROM therapists t 
            JOIN spas s ON t.spa_id = s.id 
            WHERE t.id = ?
        `, [therapistId]);

        // Update therapist status
        await db.execute(`
            UPDATE therapists 
            SET status = 'rejected', 
                reject_reason = ?
            WHERE id = ?
        `, [reason, therapistId]);

        // Log activity
        await ActivityLogModel.logActivity({
            entity_type: 'therapist',
            entity_id: therapistId,
            action: 'rejected',
            description: `Therapist ${therapist[0].name} rejected: ${reason}`,
            actor_type: 'lsa',
            actor_id: 1,
            actor_name: 'LSA Admin',
            old_status: 'pending',
            new_status: 'rejected',
            metadata: { reason, notes }
        });

        // Create notification for spa
        await NotificationModel.createNotification({
            recipient_type: 'spa',
            recipient_id: therapist[0].spa_id,
            title: 'Therapist Application Rejected',
            message: `${therapist[0].name} application was rejected. Reason: ${reason}`,
            type: 'error',
            related_entity_type: 'therapist',
            related_entity_id: therapistId
        });

        res.json({
            success: true,
            message: 'Therapist rejected successfully'
        });
    } catch (error) {
        console.error('Error rejecting therapist:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to reject therapist'
        });
    }
});

// Get dashboard statistics
router.get('/dashboard/stats', async (req, res) => {
    try {
        // Get spa statistics
        const [spaStats] = await db.execute(`
            SELECT 
                COUNT(*) as total_spas,
                COUNT(CASE WHEN verification_status = 'pending' THEN 1 END) as pending_spas,
                COUNT(CASE WHEN verification_status = 'approved' THEN 1 END) as approved_spas,
                COUNT(CASE WHEN verification_status = 'rejected' THEN 1 END) as rejected_spas
            FROM spas
        `);

        // Get therapist statistics
        const [therapistStats] = await db.execute(`
            SELECT 
                COUNT(*) as total_therapists,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_therapists,
                COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_therapists,
                COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_therapists
            FROM therapists
        `);

        // Get recent activities
        const recentActivities = await ActivityLogModel.getRecentActivities(10, null, 'lsa');

        // Get unread notifications count
        const unreadCount = await NotificationModel.getUnreadCount('lsa', 1);

        res.json({
            success: true,
            stats: {
                spas: spaStats[0],
                therapists: therapistStats[0],
                unread_notifications: unreadCount
            },
            recent_activities: recentActivities
        });
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch dashboard statistics'
        });
    }
});

// Blacklist spa
router.patch('/spas/:id/blacklist', async (req, res) => {
    try {
        const spaId = req.params.id;
        const { reason } = req.body;

        if (!reason) {
            return res.status(400).json({
                success: false,
                error: 'Blacklist reason is required'
            });
        }

        // Get spa details first
        const [spa] = await db.execute('SELECT * FROM spas WHERE id = ?', [spaId]);

        if (spa.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Spa not found'
            });
        }

        // Update spa with blacklist information
        await db.execute(`
            UPDATE spas 
            SET blacklist_reason = ?, 
                blacklisted_at = NOW(),
                status = 'blacklisted'
            WHERE id = ?
        `, [reason, spaId]);

        // Log activity
        await ActivityLogModel.logActivity({
            entity_type: 'spa',
            entity_id: spaId,
            action: 'blacklisted',
            description: `Spa ${spa[0].name} blacklisted by LSA administration: ${reason}`,
            actor_type: 'lsa',
            actor_id: 1,
            actor_name: 'LSA Admin',
            old_status: spa[0].status,
            new_status: 'blacklisted',
            metadata: { reason }
        });

        // Create notification for spa
        await NotificationModel.createNotification({
            recipient_type: 'spa',
            recipient_id: spaId,
            title: 'Spa Blacklisted',
            message: `Your spa ${spa[0].name} has been blacklisted. Reason: ${reason}`,
            type: 'warning',
            related_entity_type: 'spa',
            related_entity_id: spaId
        });

        res.json({
            success: true,
            message: 'Spa blacklisted successfully'
        });
    } catch (error) {
        console.error('Error blacklisting spa:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to blacklist spa'
        });
    }
});

// Get recent activities
router.get('/activities', async (req, res) => {
    try {
        const { limit = 20, entity_type, actor_type } = req.query;

        const activities = await ActivityLogModel.getRecentActivities(
            parseInt(limit),
            entity_type,
            actor_type
        );

        res.json({
            success: true,
            activities
        });
    } catch (error) {
        console.error('Error fetching activities:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch activities'
        });
    }
});

module.exports = router;