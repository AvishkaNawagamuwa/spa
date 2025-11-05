const express = require('express');
const router = express.Router();
const NotificationModel = require('../models/NotificationModel');
const ActivityLogModel = require('../models/ActivityLogModel');
const db = require('../config/database');
const multer = require('multer');
const path = require('path');
const jwt = require('jsonwebtoken');

// Authentication middleware for AdminSPA
const authenticateAdminSPA = async (req, res, next) => {
    try {
        console.log('🔒 Authentication attempt for:', req.url);
        console.log('� All headers received:', Object.keys(req.headers).join(', '));
        console.log('🔑 Authorization header:', req.headers.authorization ? `Present (${req.headers.authorization.substring(0, 20)}...)` : 'MISSING');
        console.log('�📝 Headers summary:', req.headers.authorization ? 'Token present' : 'No token');

        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) {
            console.log('❌ No token provided');
            return res.status(401).json({ success: false, error: 'No token provided' });
        }

        console.log('🔑 Token found, verifying...');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production');
        console.log('✅ Token decoded for user ID:', decoded.id);

        const [user] = await db.execute(
            'SELECT * FROM admin_users WHERE id = ? AND role = "admin_spa" AND is_active = true',
            [decoded.id]
        );

        if (user.length === 0) {
            console.log('❌ User not found or inactive');
            return res.status(401).json({ success: false, error: 'Invalid token' });
        }

        console.log('✅ User authenticated:', user[0].username, 'spa_id:', user[0].spa_id);
        req.user = user[0];
        next();
    } catch (error) {
        console.log('❌ Authentication error:', error.message);
        return res.status(401).json({ success: false, error: 'Invalid token' });
    }
};

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/therapist-documents/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|pdf/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only images (JPEG, JPG, PNG) and PDF files are allowed'));
        }
    }
});

// Get dynamic dashboard stats (Step 01)
router.get('/dashboard-stats', authenticateAdminSPA, async (req, res) => {
    try {
        // Get spa_id from authenticated user
        const spaId = req.user.spa_id;

        console.log(`🔍 Dashboard stats requested for SPA ID: ${spaId}`);

        // Get approved therapists count
        const [approvedResult] = await db.execute(
            'SELECT COUNT(*) as count FROM therapists WHERE spa_id = ? AND status = ?',
            [spaId, 'approved']
        );

        // Get pending therapists count
        const [pendingResult] = await db.execute(
            'SELECT COUNT(*) as count FROM therapists WHERE spa_id = ? AND status = ?',
            [spaId, 'pending']
        );

        const stats = {
            success: true,
            approved_therapists: approvedResult[0].count,
            pending_therapists: pendingResult[0].count
        };

        console.log(`📊 Dashboard stats for SPA ${spaId}:`, stats);
        res.json(stats);

    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch dashboard statistics',
            approved_therapists: 0,
            pending_therapists: 0
        });
    }
});

// Get recent activity for today and yesterday (Step 01)
router.get('/recent-activity', authenticateAdminSPA, async (req, res) => {
    try {
        // Get spa_id from authenticated user
        const spaId = req.user.spa_id;

        console.log(`🔍 Recent activity requested for SPA ID: ${spaId}`);

        // Get today and yesterday's dates
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const todayStr = today.toISOString().split('T')[0];
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        // Get recent activities (add, request, response)
        const [activities] = await db.execute(`
            SELECT id, name, nic, status, created_at, updated_at
            FROM therapists 
            WHERE spa_id = ? 
            AND status IN ('pending', 'approved', 'rejected')
            AND DATE(created_at) >= ?
            ORDER BY created_at DESC
            LIMIT 10
        `, [spaId, yesterdayStr]);

        console.log(`📝 Recent activities for SPA ${spaId}:`, activities.length, 'records found');
        res.json(activities);

    } catch (error) {
        console.error('Recent activity error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch recent activities',
            data: []
        });
    }
});

// Process payment - Enhanced (Step 02)
router.post('/process-payment', authenticateAdminSPA, upload.single('slip'), async (req, res) => {
    try {
        // Get spa_id from authenticated user
        const spaId = req.user.spa_id;
        const { type, amount, method, planId } = req.body;

        // Validate required fields
        if (!type || !amount || !method) {
            return res.status(400).json({
                success: false,
                message: 'Missing required payment information'
            });
        }

        let paymentData = {
            spa_id: spaId,
            type: type, // 'registration_fee' or 'annual_fee'
            amount: parseFloat(amount),
            method: method, // 'card' or 'bank_transfer'
            status: 'pending',
            created_at: new Date()
        };

        if (method === 'card') {
            // Handle card payment with PayHere integration
            const cardDetails = req.body.cardDetails;

            // In production, integrate with PayHere API
            // For now, simulate successful payment
            paymentData.status = 'paid';
            paymentData.payhere_order_id = 'ORDER_' + Date.now();
            paymentData.card_details = JSON.stringify({
                last4: cardDetails.cardNumber.slice(-4),
                holderName: cardDetails.holderName
            });

            // Insert payment record
            const [result] = await db.execute(
                'INSERT INTO payments (spa_id, type, amount, method, status, payhere_order_id, card_details, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [paymentData.spa_id, paymentData.type, paymentData.amount, paymentData.method, paymentData.status, paymentData.payhere_order_id, paymentData.card_details, paymentData.created_at]
            );

            res.json({
                success: true,
                message: 'Payment processed successfully',
                paymentId: result.insertId,
                orderId: paymentData.payhere_order_id
            });

        } else if (method === 'bank_transfer') {
            // Handle bank transfer with file upload
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: 'Bank transfer slip is required'
                });
            }

            paymentData.slip_path = req.file.path;
            paymentData.status = 'pending'; // Requires admin approval

            // Insert payment record
            const [result] = await db.execute(
                'INSERT INTO payments (spa_id, type, amount, method, status, slip_path, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [paymentData.spa_id, paymentData.type, paymentData.amount, paymentData.method, paymentData.status, paymentData.slip_path, paymentData.created_at]
            );

            res.json({
                success: true,
                message: 'Bank transfer slip uploaded successfully. Payment pending approval.',
                paymentId: result.insertId
            });
        }

    } catch (error) {
        console.error('Payment processing error:', error);
        res.status(500).json({
            success: false,
            message: 'Payment processing failed',
            error: error.message
        });
    }
});

// Get notification history (Step 04)
router.get('/notification-history', authenticateAdminSPA, async (req, res) => {
    try {
        // Get spa_id from authenticated user
        const spaId = req.user.spa_id;

        console.log(`🔍 Notification history requested for SPA ID: ${spaId}`);

        // Get approved and rejected therapist history with dates
        const [history] = await db.execute(`
            SELECT id, name, nic, status, created_at, updated_at, reject_reason
            FROM therapists 
            WHERE spa_id = ? 
            AND status IN ('approved', 'rejected')
            ORDER BY updated_at DESC, created_at DESC
        `, [spaId]);

        res.json(history);

    } catch (error) {
        console.error('Notification history error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch notification history',
            data: []
        });
    }
});

// Get spa dashboard data (existing route - keeping for compatibility)
router.get('/dashboard/:spaId', async (req, res) => {
    try {
        const spaId = req.params.spaId;

        // Get spa basic info
        const [spa] = await db.execute('SELECT * FROM spas WHERE id = ?', [spaId]);

        if (spa.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Spa not found'
            });
        }

        // Get therapist statistics
        const [therapistStats] = await db.execute(`
            SELECT 
                COUNT(*) as total_therapists,
                COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_therapists,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_therapists,
                COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_therapists
            FROM therapists 
            WHERE spa_id = ?
        `, [spaId]);

        // Get recent activities for this spa
        const recentActivities = await ActivityLogModel.getEntityActivities('spa', spaId);

        // Get unread notifications for this spa
        const unreadCount = await NotificationModel.getUnreadCount('spa', spaId);

        res.json({
            success: true,
            spa: spa[0],
            stats: therapistStats[0],
            recent_activities: recentActivities.slice(0, 10), // Latest 10
            unread_notifications: unreadCount
        });
    } catch (error) {
        console.error('Error fetching spa dashboard:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch spa dashboard data'
        });
    }
});

// Get therapists for a specific spa
router.get('/spas/:spaId/therapists', authenticateAdminSPA, async (req, res) => {
    try {
        const requestedSpaId = req.params.spaId;
        const userSpaId = req.user.spa_id;

        // Validate that the user is requesting data for their own spa
        if (parseInt(requestedSpaId) !== parseInt(userSpaId)) {
            return res.status(403).json({
                success: false,
                error: 'Access denied: You can only view therapists for your own spa'
            });
        }

        const spaId = userSpaId;
        console.log(`🔍 Therapists requested for SPA ID: ${spaId}`);
        const { status = 'all' } = req.query;

        let query = 'SELECT * FROM therapists WHERE spa_id = ?';
        const params = [spaId];

        if (status !== 'all') {
            query += ' AND status = ?';
            params.push(status);
        }

        query += ' ORDER BY created_at DESC';

        const [therapists] = await db.execute(query, params);

        // Parse JSON fields safely
        const enrichedTherapists = therapists.map(therapist => {
            let specializations;
            try {
                // Try to parse as JSON first
                specializations = JSON.parse(therapist.specializations || '[]');
            } catch (e) {
                // If parsing fails, treat as comma-separated string or single value
                if (therapist.specializations) {
                    const specString = String(therapist.specializations);
                    specializations = specString.includes(',')
                        ? specString.split(',').map(s => s.trim())
                        : [specString.trim()];
                } else {
                    specializations = [];
                }
            }

            let working_history;
            try {
                working_history = JSON.parse(therapist.working_history || '[]');
            } catch (e) {
                working_history = [];
            }

            return {
                ...therapist,
                specializations,
                working_history
            };
        });

        res.json({
            success: true,
            therapists: enrichedTherapists
        });
    } catch (error) {
        console.error('Error fetching spa therapists:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch spa therapists'
        });
    }
});

// Add new therapist request - Enhanced with all fields and validation
router.post('/add-therapist', upload.fields([
    { name: 'nicFile', maxCount: 1 },
    { name: 'medicalFile', maxCount: 1 },
    { name: 'certificateFile', maxCount: 1 },
    { name: 'profileImage', maxCount: 1 }
]), async (req, res) => {
    try {
        const {
            firstName, lastName, birthday, nic, phone, spa_id,
            name, email, address, experience_years, specializations
        } = req.body;

        // Validation (server-side)
        if (!firstName || !lastName || !birthday || !nic || !phone) {
            return res.status(400).json({
                success: false,
                message: 'All personal fields (firstName, lastName, birthday, NIC, phone) are required'
            });
        }

        // NIC format validation - Support both Old (9 digits + V/X) and New (12 digits) formats
        const oldNICPattern = /^[0-9]{9}[VXvx]$/;
        const newNICPattern = /^[0-9]{12}$/;

        if (!oldNICPattern.test(nic) && !newNICPattern.test(nic)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid NIC format. Use Old NIC (902541234V) or New NIC (200254123456)'
            });
        }

        // Phone format validation (+94xxxxxxxxx)
        if (!/^\+94\d{9}$/.test(phone)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid phone format. Must be +94xxxxxxxxx'
            });
        }

        // Process uploaded files
        const nicPath = req.files['nicFile'] ? req.files['nicFile'][0].path : null;
        const medicalPath = req.files['medicalFile'] ? req.files['medicalFile'][0].path : null;
        const certificatePath = req.files['certificateFile'] ? req.files['certificateFile'][0].path : null;
        const imagePath = req.files['profileImage'] ? req.files['profileImage'][0].path : null;

        // Parse specializations if provided
        let parsedSpecializations = [];
        try {
            if (specializations) {
                parsedSpecializations = typeof specializations === 'string'
                    ? JSON.parse(specializations)
                    : (Array.isArray(specializations) ? specializations : [specializations]);
            } else {
                parsedSpecializations = ['General Therapy']; // Default
            }
        } catch (e) {
            parsedSpecializations = ['General Therapy'];
        }

        // Create working history entry
        const workingHistory = [{
            spa_id: parseInt(spa_id) || 1,
            start_date: new Date().toISOString().split('T')[0],
            end_date: null,
            position: 'Therapist',
            experience_gained: parseInt(experience_years) || 0,
            status: 'pending'
        }];

        // Insert therapist with all new fields
        const [result] = await db.execute(`
            INSERT INTO therapists (
                spa_id, name, first_name, last_name, date_of_birth, nic, nic_number,
                email, phone, address, 
                nic_attachment, medical_certificate, spa_center_certificate, therapist_image,
                specializations, experience_years, status,
                working_history, current_spa_id, total_experience_years, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, NOW())
        `, [
            parseInt(spa_id) || 1,
            name || `${firstName} ${lastName}`,
            firstName,
            lastName,
            birthday,
            nic,
            nic,  // Use same NIC for both fields
            email || `${firstName.toLowerCase()}.${lastName.toLowerCase()}@spa.com`,
            phone,
            address || 'Spa Location',
            nicPath,
            medicalPath,
            certificatePath,
            imagePath,
            JSON.stringify(parsedSpecializations),
            parseInt(experience_years) || 0,
            JSON.stringify(workingHistory),
            parseInt(spa_id) || 1,
            parseInt(experience_years) || 0
        ]);

        const therapistId = result.insertId;

        // Get spa details for notifications
        const [spa] = await db.execute('SELECT * FROM spas WHERE id = ?', [parseInt(spa_id) || 1]);
        const spaName = spa[0]?.name || 'Unknown Spa';

        // Log activity
        await ActivityLogModel.logActivity({
            entity_type: 'therapist',
            entity_id: therapistId,
            action: 'created',
            description: `New therapist ${firstName} ${lastName} added to ${spaName} - pending LSA approval`,
            actor_type: 'spa',
            actor_id: parseInt(spa_id) || 1,
            actor_name: spaName,
            new_status: 'pending'
        });

        // Create notification for LSA
        await NotificationModel.createNotification({
            recipient_type: 'lsa',
            recipient_id: 1, // LSA admin
            title: 'New Therapist Application',
            message: `${firstName} ${lastName} from ${spaName} requires approval for registration`,
            type: 'warning',
            related_entity_type: 'therapist',
            related_entity_id: therapistId
        });

        // Create confirmation notification for spa
        await NotificationModel.createNotification({
            recipient_type: 'spa',
            recipient_id: parseInt(spa_id) || 1,
            title: 'Therapist Application Submitted',
            message: `${firstName} ${lastName} application has been submitted to LSA for approval`,
            type: 'info',
            related_entity_type: 'therapist',
            related_entity_id: therapistId
        });

        res.status(201).json({
            success: true,
            message: 'Therapist added successfully! Sent to AdminLSA for approval.',
            therapist_id: therapistId,
            data: {
                id: therapistId,
                name: `${firstName} ${lastName}`,
                firstName,
                lastName,
                nic,
                phone,
                status: 'pending',
                submitted_at: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Error adding therapist:', error);
        res.status(500).json({
            success: false,
            message: 'Server error saving therapist data',
            error: error.message
        });
    }
});

// Keep the existing route for backward compatibility
router.post('/spas/:spaId/therapists', upload.fields([
    { name: 'certificate', maxCount: 1 },
    { name: 'profile_image', maxCount: 1 },
    { name: 'medical_certificate', maxCount: 1 }
]), async (req, res) => {
    try {
        const spaId = req.params.spaId;
        const {
            name, email, phone, address,
            specializations, experience_years
        } = req.body;

        // Validate required fields
        if (!name || !email || !phone || !address) {
            return res.status(400).json({
                success: false,
                error: 'Name, email, phone, and address are required'
            });
        }

        // Process uploaded files
        const certificatePath = req.files['certificate'] ? req.files['certificate'][0].path : null;
        const profileImagePath = req.files['profile_image'] ? req.files['profile_image'][0].path : null;
        const medicalCertPath = req.files['medical_certificate'] ? req.files['medical_certificate'][0].path : null;

        // Parse specializations if it's a string
        let parsedSpecializations = [];
        try {
            parsedSpecializations = typeof specializations === 'string'
                ? JSON.parse(specializations)
                : (Array.isArray(specializations) ? specializations : []);
        } catch (e) {
            parsedSpecializations = [specializations].filter(Boolean);
        }

        // Create initial working history entry
        const workingHistory = [{
            spa_id: parseInt(spaId),
            start_date: new Date().toISOString().split('T')[0],
            end_date: null,
            position: 'Therapist',
            experience_gained: parseInt(experience_years) || 0,
            status: 'pending'
        }];

        // Insert therapist
        const [result] = await db.execute(`
            INSERT INTO therapists (
                spa_id, name, email, phone, address, 
                specializations, experience_years, status,
                certificate_path, working_history, current_spa_id, total_experience_years
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)
        `, [
            spaId, name, email, phone, address,
            JSON.stringify(parsedSpecializations),
            parseInt(experience_years) || 0,
            certificatePath,
            JSON.stringify(workingHistory),
            spaId,
            parseInt(experience_years) || 0
        ]);

        const therapistId = result.insertId;

        // Get spa details for notifications
        const [spa] = await db.execute('SELECT * FROM spas WHERE id = ?', [spaId]);

        // Log activity
        await ActivityLogModel.logActivity({
            entity_type: 'therapist',
            entity_id: therapistId,
            action: 'created',
            description: `New therapist ${name} added to ${spa[0].name} - pending LSA approval`,
            actor_type: 'spa',
            actor_id: parseInt(spaId),
            actor_name: spa[0].name,
            new_status: 'pending'
        });

        // Create notification for LSA
        await NotificationModel.createNotification({
            recipient_type: 'lsa',
            recipient_id: 1, // LSA admin
            title: 'New Therapist Application',
            message: `${name} from ${spa[0].name} requires approval for registration`,
            type: 'warning',
            related_entity_type: 'therapist',
            related_entity_id: therapistId
        });

        // Create confirmation notification for spa
        await NotificationModel.createNotification({
            recipient_type: 'spa',
            recipient_id: parseInt(spaId),
            title: 'Therapist Application Submitted',
            message: `${name} application has been submitted to LSA for approval`,
            type: 'info',
            related_entity_type: 'therapist',
            related_entity_id: therapistId
        });

        res.status(201).json({
            success: true,
            message: 'Therapist application submitted successfully',
            therapist_id: therapistId,
            data: {
                name,
                email,
                status: 'pending',
                submitted_at: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Error adding therapist:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to add therapist application'
        });
    }
});

// Get notifications for spa
router.get('/spas/:spaId/notifications', async (req, res) => {
    try {
        const spaId = req.params.spaId;
        const { unread_only = false } = req.query;

        const notifications = await NotificationModel.getNotificationsByRecipient(
            'spa',
            parseInt(spaId),
            unread_only === 'true'
        );

        res.json({
            success: true,
            notifications,
            total: notifications.length
        });
    } catch (error) {
        console.error('Error fetching spa notifications:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch notifications'
        });
    }
});

// Mark spa notification as read
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

// Update therapist status (resign/terminate)
router.put('/therapists/:therapistId/status', async (req, res) => {
    try {
        const { therapistId } = req.params;
        const { status, reason, spa_id } = req.body;

        // Validate required fields
        if (!status || !spa_id) {
            return res.status(400).json({
                success: false,
                message: 'Status and spa_id are required'
            });
        }

        // Validate status values
        const validStatuses = ['resigned', 'terminated'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status. Must be "resigned" or "terminated"'
            });
        }

        // For termination, reason is required
        if (status === 'terminated' && (!reason || !reason.trim())) {
            return res.status(400).json({
                success: false,
                message: 'Termination reason is required'
            });
        }

        // Check if therapist exists and is approved
        const [existingTherapist] = await db.execute(
            'SELECT id, status, first_name, last_name, name FROM therapists WHERE id = ? AND spa_id = ?',
            [therapistId, spa_id]
        );

        if (existingTherapist.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Therapist not found'
            });
        }

        if (existingTherapist[0].status !== 'approved') {
            return res.status(400).json({
                success: false,
                message: 'Only approved therapists can be resigned or terminated'
            });
        }

        // Update therapist status
        const updateQuery = status === 'terminated'
            ? 'UPDATE therapists SET status = ?, terminate_reason = ?, updated_at = NOW() WHERE id = ? AND spa_id = ?'
            : 'UPDATE therapists SET status = ?, resign_reason = ?, updated_at = NOW() WHERE id = ? AND spa_id = ?';

        const updateParams = status === 'terminated'
            ? [status, reason || null, therapistId, spa_id]
            : [status, reason || 'Voluntary resignation', therapistId, spa_id];

        await db.execute(updateQuery, updateParams);

        // Log the activity
        const therapistName = existingTherapist[0].first_name && existingTherapist[0].last_name
            ? `${existingTherapist[0].first_name} ${existingTherapist[0].last_name}`
            : existingTherapist[0].name || 'Unknown Therapist';
        const activityDescription = status === 'terminated'
            ? `Therapist ${therapistName} has been terminated. Reason: ${reason}`
            : `Therapist ${therapistName} has resigned.`;

        await db.execute(
            'INSERT INTO activity_logs (entity_type, entity_id, action, description, actor_type, actor_id, actor_name, old_status, new_status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())',
            ['therapist', therapistId, status, activityDescription, 'spa', spa_id, 'SPA Admin', 'approved', status]
        );

        res.json({
            success: true,
            message: `Therapist ${status} successfully`,
            id: therapistId,
            status: status
        });

    } catch (error) {
        console.error('Error updating therapist status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update therapist status'
        });
    }
});

// Get SPA Profile Data (Step 08)
router.get('/spa-profile/:spaId', async (req, res) => {
    try {
        console.log('🔍 SPA Profile route called with ID:', req.params.spaId);
        const spaId = req.params.spaId;

        // Get spa profile data from spas table where status = 'verified'
        console.log('📊 Executing SPA profile query...');
        const [spaResults] = await db.execute(`
            SELECT 
                id,
                name as spa_name,
                CONCAT(owner_fname, ' ', owner_lname) as owner_name,
                email,
                phone,
                address,
                address as district,
                status,
                created_at,
                updated_at
            FROM spas 
            WHERE id = ? AND status = 'verified'
        `, [spaId]);

        console.log('📋 Query results:', spaResults.length, 'rows found');

        if (spaResults.length === 0) {
            console.log('❌ No verified SPA found for ID:', spaId);
            return res.status(404).json({
                success: false,
                error: 'Verified SPA not found'
            });
        }

        const spaProfile = spaResults[0];
        console.log('✅ Returning SPA profile data for:', spaProfile.spa_name);

        res.json({
            success: true,
            data: spaProfile
        });

    } catch (error) {
        console.error('❌ Get SPA profile error:', error.message);
        console.error('Stack trace:', error.stack);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch SPA profile',
            data: null
        });
    }
});

module.exports = router;