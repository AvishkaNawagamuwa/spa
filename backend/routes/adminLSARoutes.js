const express = require('express');
const router = express.Router();
const SpaModel = require('../models/SpaModel');
const TherapistModel = require('../models/TherapistModel');
const { therapistUpload } = require('../middleware/upload');
const db = require('../config/database');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const { sendPaymentStatusEmail } = require('../utils/emailService');

// Error handler middleware
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// ==================== ADMIN LSA DASHBOARD ROUTES ====================

/**
 * @route   GET /api/lsa/dashboard
 * @desc    Get AdminLSA dashboard statistics
 * @access  Private (Admin)
 */
router.get('/dashboard', asyncHandler(async (req, res) => {
    try {
        const [spaStats, therapistStats] = await Promise.all([
            SpaModel.getAdminStats(),
            TherapistModel.getAdminStats()
        ]);

        const dashboardData = {
            spa_statistics: spaStats,
            therapist_statistics: therapistStats,
            recent_activities: await SpaModel.getRecentActivities(10),
            system_notifications: await SpaModel.getSystemNotifications()
        };

        res.json({
            success: true,
            data: dashboardData
        });

    } catch (error) {
        console.error('AdminLSA dashboard error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch dashboard data',
            error: error.message
        });
    }
}));

/**
 * @route   GET /api/lsa/dashboard/spas-count
 * @desc    Get count of verified spas
 * @access  Private (Admin)
 */
router.get('/dashboard/spas-count', asyncHandler(async (req, res) => {
    try {
        const [rows] = await db.execute(
            `SELECT COUNT(*) as verified_count FROM spas WHERE status = 'verified'`
        );

        res.json({
            success: true,
            data: {
                verified_count: rows[0].verified_count
            }
        });

    } catch (error) {
        console.error('Get spas count error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch spas count',
            error: error.message
        });
    }
}));

/**
 * @route   GET /api/lsa/dashboard/therapists-count
 * @desc    Get count of approved therapists
 * @access  Private (Admin)
 */
router.get('/dashboard/therapists-count', asyncHandler(async (req, res) => {
    try {
        const [rows] = await db.execute(
            `SELECT COUNT(*) as approved_count FROM therapists WHERE status = 'approved'`
        );

        res.json({
            success: true,
            data: {
                approved_count: rows[0].approved_count
            }
        });

    } catch (error) {
        console.error('Get therapists count error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch therapists count',
            error: error.message
        });
    }
}));

/**
 * @route   GET /api/lsa/dashboard/recent-activity
 * @desc    Get recent spa and therapist activity from today and yesterday
 * @access  Private (Admin)
 */
router.get('/dashboard/recent-activity', asyncHandler(async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT 
                al.id,
                al.entity_type,
                al.entity_id,
                al.action,
                al.description,
                al.old_status,
                al.new_status,
                al.created_at,
                CASE 
                    WHEN al.entity_type = 'therapist' THEN CONCAT(COALESCE(t.first_name, t.name), ' ', COALESCE(t.last_name, ''))
                    WHEN al.entity_type = 'spa' THEN s.name
                    ELSE 'System'
                END as entity_name
            FROM activity_logs al
            LEFT JOIN therapists t ON al.entity_type = 'therapist' AND al.entity_id = t.id
            LEFT JOIN spas s ON al.entity_type = 'spa' AND al.entity_id = s.id
            WHERE al.created_at >= CURDATE() - INTERVAL 1 DAY
            ORDER BY al.created_at DESC
            LIMIT 20
        `);

        res.json({
            success: true,
            data: rows
        });

    } catch (error) {
        console.error('Get recent activity error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch recent activity',
            error: error.message
        });
    }
}));

// ==================== SPA MANAGEMENT ROUTES ====================

/**
 * @route   GET /api/lsa/spas
 * @desc    Get all spas with filtering and pagination
 * @access  Private (Admin)
 */
router.get('/spas', asyncHandler(async (req, res) => {
    try {
        const {
            status,
            verification_status,
            city,
            spa_type,
            district,
            page = 1,
            limit = 10,
            search
        } = req.query;

        const filters = {
            status,
            verification_status,
            city,
            spa_type,
            district,
            search,
            page: parseInt(page),
            limit: parseInt(limit)
        };

        const spas = await SpaModel.getAllSpas(filters);

        res.json({
            success: true,
            data: spas
        });

    } catch (error) {
        console.error('Get all spas error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch spas',
            error: error.message
        });
    }
}));

/**
 * @route   GET /api/lsa/spas/:spaId
 * @desc    Get detailed spa information
 * @access  Private (Admin)
 */
router.get('/spas/:spaId', asyncHandler(async (req, res) => {
    try {
        const { spaId } = req.params;
        const spa = await SpaModel.getSpaById(spaId);

        if (!spa) {
            return res.status(404).json({
                success: false,
                message: 'Spa not found'
            });
        }

        res.json({
            success: true,
            data: spa
        });
    } catch (error) {
        console.error('Get spa details error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch spa details',
            error: error.message
        });
    }
}));

/**
 * @route   GET /api/lsa/spas/:spaId/detailed
 * @desc    Get detailed spa information with payment details
 * @access  Private (Admin)
 */
router.get('/spas/:spaId/detailed', asyncHandler(async (req, res) => {
    try {
        const { spaId } = req.params;
        const spa = await SpaModel.getSpaWithPaymentDetails(spaId);

        if (!spa) {
            return res.status(404).json({
                success: false,
                message: 'Spa not found'
            });
        }

        res.json({
            success: true,
            data: spa
        });
    } catch (error) {
        console.error('Get detailed spa error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch detailed spa information',
            error: error.message
        });
    }
}));

/**
 * @route   PUT /api/lsa/spas/:spaId/verify
 * @desc    Approve or reject spa verification
 * @access  Private (Admin)
 */
router.put('/spas/:spaId/verify', asyncHandler(async (req, res) => {
    try {
        const { spaId } = req.params;
        const { action, admin_comments } = req.body; // action: 'approve' or 'reject'

        if (!['approve', 'reject'].includes(action)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid action. Must be "approve" or "reject"'
            });
        }

        const result = await SpaModel.updateSpaStatus(spaId, action, admin_comments);

        res.json({
            success: true,
            message: `Spa ${action}d successfully`,
            data: result
        });

    } catch (error) {
        console.error('Spa verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update spa verification status',
            error: error.message
        });
    }
}));

/**
 * @route   PUT /api/lsa/spas/:spaId/status
 * @desc    Update spa status (active/inactive/suspended)
 * @access  Private (Admin)
 */
router.put('/spas/:spaId/status', asyncHandler(async (req, res) => {
    try {
        const { spaId } = req.params;
        const { status, reason } = req.body;

        if (!['active', 'inactive', 'suspended'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status. Must be "active", "inactive", or "suspended"'
            });
        }

        const result = await SpaModel.updateSpaGeneralStatus(spaId, status, reason);

        res.json({
            success: true,
            message: 'Spa status updated successfully',
            data: result
        });

    } catch (error) {
        console.error('Update spa status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update spa status',
            error: error.message
        });
    }
}));

/**
 * @route   GET /api/lsa/spas/:spaId/documents/:documentType
 * @desc    View or download spa documents
 * @access  Private (Admin)
 */
router.get('/spas/:spaId/documents/:documentType', asyncHandler(async (req, res) => {
    try {
        const { spaId, documentType } = req.params;
        const { action = 'view' } = req.query; // view or download

        // Get spa details to find document path
        const spa = await SpaModel.getSpaById(spaId);
        if (!spa) {
            return res.status(404).json({
                success: false,
                message: 'Spa not found'
            });
        }

        // Helper function to parse JSON fields
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

        // Map document types to database columns with JSON parsing
        const documentMap = {
            'certificate': spa.certificate_path,
            'form1_certificate': parseJsonField(spa.form1_certificate_path),
            'nic_front': parseJsonField(spa.nic_front_path),
            'nic_back': parseJsonField(spa.nic_back_path),
            'br_attachment': parseJsonField(spa.br_attachment_path),
            'other_document': parseJsonField(spa.other_document_path),
            'spa_banner_photos': parseJsonField(spa.spa_banner_photos_path),
            'spa_photos_banner': spa.spa_photos_banner_path || parseJsonField(spa.spa_banner_photos_path)
        };

        const documentPath = documentMap[documentType];
        if (!documentPath) {
            return res.status(404).json({
                success: false,
                message: 'Document not found or not uploaded'
            });
        }

        const path = require('path');
        const fs = require('fs');

        // Check if it's a JSON array (multiple photos)
        let filePaths = [];
        if (documentType === 'spa_photos_banner' && spa.spa_photos_banner) {
            try {
                const photos = typeof spa.spa_photos_banner === 'string'
                    ? JSON.parse(spa.spa_photos_banner)
                    : spa.spa_photos_banner;
                filePaths = Array.isArray(photos) ? photos : [photos];
            } catch (e) {
                filePaths = [documentPath];
            }
        } else {
            filePaths = [documentPath];
        }

        // For multiple files, return list of available files
        if (filePaths.length > 1) {
            const availableFiles = filePaths.map((filePath, index) => ({
                index,
                filename: path.basename(filePath),
                url: `/api/lsa/spas/${spaId}/documents/${documentType}/${index}`
            }));

            return res.json({
                success: true,
                message: 'Multiple documents found',
                data: {
                    type: 'multiple',
                    files: availableFiles
                }
            });
        }

        // Handle single file
        const fullPath = path.join(__dirname, '..', documentPath.replace('/uploads', 'uploads'));

        if (!fs.existsSync(fullPath)) {
            return res.status(404).json({
                success: false,
                message: 'Document file not found on server'
            });
        }

        const filename = path.basename(fullPath);

        if (action === 'download') {
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        } else {
            res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
        }

        // Set appropriate content type
        const ext = path.extname(filename).toLowerCase();
        const mimeTypes = {
            '.pdf': 'application/pdf',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.doc': 'application/msword',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        };

        const contentType = mimeTypes[ext] || 'application/octet-stream';
        res.setHeader('Content-Type', contentType);

        // Stream the file
        const fileStream = fs.createReadStream(fullPath);
        fileStream.pipe(res);

    } catch (error) {
        console.error('Document access error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to access document',
            error: error.message
        });
    }
}));

/**
 * @route   GET /api/lsa/spas/:spaId/documents/:documentType/:fileIndex
 * @desc    View or download specific spa document file (for multiple files)
 * @access  Private (Admin)
 */
router.get('/spas/:spaId/documents/:documentType/:fileIndex', asyncHandler(async (req, res) => {
    try {
        const { spaId, documentType, fileIndex } = req.params;
        const { action = 'view' } = req.query;

        const spa = await SpaModel.getSpaById(spaId);
        if (!spa) {
            return res.status(404).json({
                success: false,
                message: 'Spa not found'
            });
        }

        let filePaths = [];
        if (documentType === 'spa_photos_banner' && spa.spa_photos_banner) {
            try {
                const photos = typeof spa.spa_photos_banner === 'string'
                    ? JSON.parse(spa.spa_photos_banner)
                    : spa.spa_photos_banner;
                filePaths = Array.isArray(photos) ? photos : [photos];
            } catch (e) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid document data format'
                });
            }
        }

        const index = parseInt(fileIndex);
        if (index < 0 || index >= filePaths.length) {
            return res.status(404).json({
                success: false,
                message: 'File index out of range'
            });
        }

        const documentPath = filePaths[index];
        const path = require('path');
        const fs = require('fs');
        const fullPath = path.join(__dirname, '..', documentPath.replace('/uploads', 'uploads'));

        if (!fs.existsSync(fullPath)) {
            return res.status(404).json({
                success: false,
                message: 'Document file not found on server'
            });
        }

        const filename = path.basename(fullPath);

        if (action === 'download') {
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        } else {
            res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
        }

        const ext = path.extname(filename).toLowerCase();
        const mimeTypes = {
            '.pdf': 'application/pdf',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif'
        };

        const contentType = mimeTypes[ext] || 'application/octet-stream';
        res.setHeader('Content-Type', contentType);

        const fileStream = fs.createReadStream(fullPath);
        fileStream.pipe(res);

    } catch (error) {
        console.error('Document access error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to access document',
            error: error.message
        });
    }
}));

// ==================== THERAPIST MANAGEMENT ROUTES ====================

/**
 * @route   GET /api/lsa/therapists
 * @desc    Get all therapists with complete details including documents
 * @access  Private (Admin)
 */
router.get('/therapists', asyncHandler(async (req, res) => {
    try {
        const {
            status,
            spa_id,
            specialization,
            experience_level,
            page = 1,
            limit = 100,
            search
        } = req.query;

        console.log('📋 Fetching therapists with status:', status);

        // Build base query with all necessary fields
        let query = `
            SELECT 
                t.id,
                t.spa_id,
                t.name,
                t.first_name,
                t.last_name,
                t.date_of_birth,
                t.nic,
                t.nic_number,
                t.email,
                t.phone,
                t.address,
                t.nic_attachment,
                t.medical_certificate,
                t.spa_center_certificate,
                t.therapist_image,
                t.experience_years,
                t.specialization,
                t.specializations,
                t.status,
                t.reject_reason,
                t.resignation_reason,
                t.termination_reason,
                t.approved_by,
                t.approved_date,
                t.created_at,
                t.updated_at,
                t.working_history,
                t.current_spa_id,
                t.total_experience_years,
                t.notes,
                s.name as spa_name,
                s.owner_fname,
                s.owner_lname
            FROM therapists t 
            LEFT JOIN spas s ON t.spa_id = s.id
        `;

        const params = [];
        const conditions = [];

        // Add status filter
        if (status && status !== 'all') {
            conditions.push('t.status = ?');
            params.push(status);
        }

        // Add spa filter
        if (spa_id) {
            conditions.push('t.spa_id = ?');
            params.push(spa_id);
        }

        // Add search filter
        if (search) {
            conditions.push('(t.name LIKE ? OR t.first_name LIKE ? OR t.last_name LIKE ? OR t.email LIKE ? OR t.phone LIKE ?)');
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
        }

        // Add conditions to query
        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' ORDER BY t.created_at DESC';

        // Add pagination if needed
        if (page && limit) {
            const offset = (parseInt(page) - 1) * parseInt(limit);
            query += ` LIMIT ${parseInt(limit)} OFFSET ${offset}`;
        }

        console.log('🔍 Executing query:', query);
        console.log('📝 With params:', params);

        const [therapists] = await db.execute(query, params);

        console.log('📊 Found', therapists.length, 'therapists');

        // Transform the data to match frontend expectations
        const transformedTherapists = therapists.map(therapist => ({
            id: therapist.id,
            therapist_id: therapist.id, // For backward compatibility
            spa_id: therapist.spa_id,
            name: therapist.name || `${therapist.first_name || ''} ${therapist.last_name || ''}`.trim(),
            first_name: therapist.first_name,
            last_name: therapist.last_name,
            email: therapist.email,
            phone: therapist.phone,
            phone_number: therapist.phone, // Alternative field name
            nic: therapist.nic || therapist.nic_number,
            date_of_birth: therapist.date_of_birth,
            birthday: therapist.date_of_birth, // Alternative field name
            address: therapist.address,
            experience_years: therapist.experience_years || 0,
            specialization: therapist.specialization,
            specializations: therapist.specializations,
            status: therapist.status,
            spa_name: therapist.spa_name,
            owner_name: `${therapist.owner_fname || ''} ${therapist.owner_lname || ''}`.trim(),

            // Document fields
            nic_attachment: therapist.nic_attachment,
            medical_certificate: therapist.medical_certificate,
            spa_center_certificate: therapist.spa_center_certificate,
            therapist_image: therapist.therapist_image,

            // Status and admin fields
            reject_reason: therapist.reject_reason,
            rejection_reason: therapist.reject_reason, // Alternative field name
            admin_comments: therapist.notes,
            approved_by: therapist.approved_by,
            approved_date: therapist.approved_date,

            // Timestamps
            created_at: therapist.created_at,
            updated_at: therapist.updated_at,
            registration_date: therapist.created_at, // Alternative field name

            // Additional fields
            working_history: therapist.working_history,
            current_spa_id: therapist.current_spa_id,
            total_experience_years: therapist.total_experience_years
        }));

        res.json({
            success: true,
            data: {
                therapists: transformedTherapists,
                total: transformedTherapists.length,
                page: parseInt(page),
                limit: parseInt(limit)
            }
        });

    } catch (error) {
        console.error('❌ Get all therapists error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch therapists',
            error: error.message
        });
    }
}));

/**
 * @route   GET /api/lsa/therapists/:therapistId
 * @desc    Get detailed therapist information
 * @access  Private (Admin)
 */
router.get('/therapists/:therapistId', asyncHandler(async (req, res) => {
    try {
        const { therapistId } = req.params;
        const therapist = await TherapistModel.getTherapistById(therapistId);

        if (!therapist) {
            return res.status(404).json({
                success: false,
                message: 'Therapist not found'
            });
        }

        res.json({
            success: true,
            data: therapist
        });

    } catch (error) {
        console.error('Get therapist details error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch therapist details',
            error: error.message
        });
    }
}));

/**
 * @route   POST /api/lsa/therapists
 * @desc    Add new therapist (from AdminLSA)
 * @access  Private (Admin)
 */
router.post('/therapists', therapistUpload, asyncHandler(async (req, res) => {
    try {
        const therapistData = {
            spa_id: req.body.spa_id,
            first_name: req.body.first_name,
            last_name: req.body.last_name,
            nic_number: req.body.nic_number,
            email: req.body.email,
            phone: req.body.phone,
            date_of_birth: req.body.date_of_birth,
            gender: req.body.gender,
            address: req.body.address,
            city: req.body.city,
            postal_code: req.body.postal_code,
            specialization: req.body.specialization ? JSON.parse(req.body.specialization) : [],
            experience_years: parseInt(req.body.experience_years),
            experience_level: req.body.experience_level,
            languages_spoken: req.body.languages_spoken ? JSON.parse(req.body.languages_spoken) : [],
            certifications: req.body.certifications ? JSON.parse(req.body.certifications) : [],
            hourly_rate: parseFloat(req.body.hourly_rate),
            availability: req.body.availability ? JSON.parse(req.body.availability) : {},
            bio: req.body.bio,
            added_by_admin: true
        };

        // Handle file uploads
        if (req.files) {
            if (req.files.nic_attachment) therapistData.nic_attachment = req.files.nic_attachment[0].path;
            if (req.files.medical_certificate) therapistData.medical_certificate = req.files.medical_certificate[0].path;
            if (req.files.spa_certificate) therapistData.spa_certificate = req.files.spa_certificate[0].path;
            if (req.files.therapist_image) therapistData.therapist_image = req.files.therapist_image[0].path;
        }

        const result = await TherapistModel.createTherapist(therapistData);

        res.status(201).json({
            success: true,
            message: 'Therapist added successfully',
            data: {
                therapist_id: result.therapist_id,
                status: result.status
            }
        });

    } catch (error) {
        console.error('Add therapist error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add therapist',
            error: error.message
        });
    }
}));

/**
 * @route   PUT /api/lsa/therapists/:therapistId/approve
 * @desc    Approve therapist request
 * @access  Private (Admin)
 */
router.put('/therapists/:therapistId/approve', asyncHandler(async (req, res) => {
    try {
        const { therapistId } = req.params;
        const { admin_comments } = req.body;

        const result = await TherapistModel.approveTherapist(therapistId, admin_comments);

        res.json({
            success: true,
            message: 'Therapist approved successfully',
            data: result
        });

    } catch (error) {
        console.error('Approve therapist error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to approve therapist',
            error: error.message
        });
    }
}));

/**
 * @route   PUT /api/lsa/therapists/:therapistId/reject
 * @desc    Reject therapist request
 * @access  Private (Admin)
 */
router.put('/therapists/:therapistId/reject', asyncHandler(async (req, res) => {
    try {
        const { therapistId } = req.params;
        const { rejection_reason, admin_comments } = req.body;

        if (!rejection_reason) {
            return res.status(400).json({
                success: false,
                message: 'Rejection reason is required'
            });
        }

        const result = await TherapistModel.rejectTherapist(therapistId, rejection_reason, admin_comments);

        res.json({
            success: true,
            message: 'Therapist rejected successfully',
            data: result
        });

    } catch (error) {
        console.error('Reject therapist error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reject therapist',
            error: error.message
        });
    }
}));

/**
 * @route   PUT /api/lsa/therapists/:therapistId/remove-termination
 * @desc    Remove termination and change status to resigned
 * @access  Private (Admin)
 */
router.put('/therapists/:therapistId/remove-termination', asyncHandler(async (req, res) => {
    try {
        const { therapistId } = req.params;

        console.log('🔄 Removing termination for therapist:', therapistId);

        // Update therapist status from terminated to resigned
        const [result] = await db.execute(
            `UPDATE therapists 
             SET status = 'resigned', 
                 terminate_reason = NULL, 
                 police_report_path = NULL,
                 updated_at = NOW() 
             WHERE id = ? AND status = 'terminated'`,
            [therapistId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Therapist not found or not in terminated status'
            });
        }

        console.log('✅ Therapist status changed from terminated to resigned');

        res.json({
            success: true,
            message: 'Termination removed successfully. Status changed to resigned.',
            data: {
                therapist_id: therapistId,
                new_status: 'resigned'
            }
        });

    } catch (error) {
        console.error('Remove termination error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to remove termination',
            error: error.message
        });
    }
}));

/**
 * @route   PUT /api/lsa/therapists/:therapistId/status
 * @desc    Update therapist status
 * @access  Private (Admin)
 */
router.put('/therapists/:therapistId/status', asyncHandler(async (req, res) => {
    try {
        const { therapistId } = req.params;
        const { status, reason } = req.body;

        if (!['active', 'inactive', 'suspended', 'terminated'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status'
            });
        }

        const result = await TherapistModel.updateTherapistStatus(therapistId, status, reason);

        res.json({
            success: true,
            message: 'Therapist status updated successfully',
            data: result
        });

    } catch (error) {
        console.error('Update therapist status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update therapist status',
            error: error.message
        });
    }
}));

/**
 * @route   GET /api/lsa/therapists/:therapistId/document/:documentType
 * @desc    View or download therapist document
 * @access  Private (Admin)
 */
router.get('/therapists/:therapistId/document/:documentType', asyncHandler(async (req, res) => {
    try {
        const { therapistId, documentType } = req.params;
        const { action = 'view' } = req.query; // 'view' or 'download'

        // Validate document type
        const validDocuments = ['nic_attachment', 'medical_certificate', 'spa_center_certificate', 'therapist_image'];
        if (!validDocuments.includes(documentType)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid document type'
            });
        }

        // Get therapist document path from database
        const [therapist] = await db.execute(
            `SELECT ${documentType} FROM therapists WHERE id = ?`,
            [therapistId]
        );

        if (!therapist || therapist.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Therapist not found'
            });
        }

        const documentPath = therapist[0][documentType];
        if (!documentPath) {
            return res.status(404).json({
                success: false,
                message: 'Document not found'
            });
        }

        const fs = require('fs');
        const path = require('path');

        // Normalize the document path (replace backslashes with forward slashes)
        const normalizedPath = documentPath.replace(/\\/g, '/');

        // Construct full file path
        let fullPath;
        if (normalizedPath.startsWith('/uploads/')) {
            // Path starts with /uploads/, construct from backend directory
            fullPath = path.join(__dirname, '..', normalizedPath.substring(1));
        } else if (normalizedPath.startsWith('uploads/')) {
            // Path starts with uploads/, construct from backend directory
            fullPath = path.join(__dirname, '..', normalizedPath);
        } else {
            // Assume it's a relative path from uploads directory
            fullPath = path.join(__dirname, '..', 'uploads', normalizedPath);
        }

        console.log('📁 Original path from DB:', documentPath);
        console.log('📁 Normalized path:', normalizedPath);
        console.log('📁 Looking for document at:', fullPath);

        // Check if file exists
        if (!fs.existsSync(fullPath)) {
            return res.status(404).json({
                success: false,
                message: 'Document file not found on server'
            });
        }

        // Get file info
        const stat = fs.statSync(fullPath);
        const fileExtension = path.extname(fullPath).toLowerCase();

        // Set content type based on file extension
        let contentType = 'application/octet-stream';
        if (['.jpg', '.jpeg'].includes(fileExtension)) {
            contentType = 'image/jpeg';
        } else if (fileExtension === '.png') {
            contentType = 'image/png';
        } else if (fileExtension === '.pdf') {
            contentType = 'application/pdf';
        } else if (['.doc', '.docx'].includes(fileExtension)) {
            contentType = 'application/msword';
        }

        // Set appropriate headers
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Length', stat.size);

        if (action === 'download') {
            // Force download
            const filename = `therapist_${therapistId}_${documentType}${fileExtension}`;
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        } else {
            // Display inline (for images and PDFs)
            res.setHeader('Content-Disposition', 'inline');
        }

        // Stream the file
        const readStream = fs.createReadStream(fullPath);
        readStream.pipe(res);

        readStream.on('error', (error) => {
            console.error('❌ Error streaming document:', error);
            if (!res.headersSent) {
                res.status(500).json({
                    success: false,
                    message: 'Error streaming document'
                });
            }
        });

    } catch (error) {
        console.error('❌ Get document error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve document',
            error: error.message
        });
    }
}));

// ==================== REPORTS AND ANALYTICS ROUTES ====================

/**
 * @route   GET /api/lsa/reports/spas
 * @desc    Get spa analytics and reports
 * @access  Private (Admin)
 */
router.get('/reports/spas', asyncHandler(async (req, res) => {
    try {
        const { period = '30', type = 'overview' } = req.query;

        const reports = await SpaModel.getSpaReports({
            period: parseInt(period),
            type
        });

        res.json({
            success: true,
            data: reports
        });

    } catch (error) {
        console.error('Get spa reports error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch spa reports',
            error: error.message
        });
    }
}));

/**
 * @route   GET /api/lsa/reports/therapists
 * @desc    Get therapist analytics and reports
 * @access  Private (Admin)
 */
router.get('/reports/therapists', asyncHandler(async (req, res) => {
    try {
        const { period = '30', type = 'overview' } = req.query;

        const reports = await TherapistModel.getTherapistReports({
            period: parseInt(period),
            type
        });

        res.json({
            success: true,
            data: reports
        });

    } catch (error) {
        console.error('Get therapist reports error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch therapist reports',
            error: error.message
        });
    }
}));

// ==================== SYSTEM MANAGEMENT ROUTES ====================

/**
 * @route   GET /api/lsa/activity-logs
 * @desc    Get system-wide activity logs
 * @access  Private (Admin)
 */
router.get('/activity-logs', asyncHandler(async (req, res) => {
    try {
        const {
            user_type,
            action_type,
            entity_type,
            start_date,
            end_date,
            page = 1,
            limit = 50
        } = req.query;

        const filters = {
            user_type,
            action_type,
            entity_type,
            start_date,
            end_date,
            page: parseInt(page),
            limit: parseInt(limit)
        };

        const logs = await SpaModel.getSystemLogs(filters);

        res.json({
            success: true,
            data: logs
        });

    } catch (error) {
        console.error('Get system logs error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch system logs',
            error: error.message
        });
    }
}));

/**
 * @route   GET /api/lsa/notifications
 * @desc    Get system notifications
 * @access  Private (Admin)
 */
router.get('/notifications', asyncHandler(async (req, res) => {
    try {
        const { type, priority, read_status } = req.query;

        const notifications = await SpaModel.getAdminNotifications({
            type,
            priority,
            read_status
        });

        res.json({
            success: true,
            data: notifications
        });

    } catch (error) {
        console.error('Get admin notifications error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch notifications',
            error: error.message
        });
    }
}));

/**
 * @route   GET /api/lsa/notifications/unread
 * @desc    Get unread notification count
 * @access  Private (Admin)
 */
router.get('/notifications/unread', asyncHandler(async (req, res) => {
    try {
        const count = await SpaModel.getUnreadNotificationCount();

        res.json({
            success: true,
            data: { count }
        });

    } catch (error) {
        console.error('Get unread notifications error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch unread notification count',
            error: error.message
        });
    }
}));

// ==================== ERROR HANDLING ====================

// Global error handler for this router
router.use((error, req, res, next) => {
    console.error('AdminLSA Routes Error:', error);

    if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
            success: false,
            message: 'File too large. Maximum size is 50MB.'
        });
    }

    if (error.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({
            success: false,
            message: 'Too many files uploaded.'
        });
    }

    if (error.message.includes('file type')) {
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }

    res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
    });
});

// ==================== ENHANCED FEATURES ====================

// Middleware to verify AdminLSA authentication
const verifyAdminLSA = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ success: false, error: 'Access denied. No token provided.' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');

        // Verify user exists and is AdminLSA
        const [user] = await db.execute(
            'SELECT * FROM admin_users WHERE id = ? AND role = "admin_lsa" AND is_active = 1',
            [decoded.id]
        );

        if (user.length === 0) {
            return res.status(403).json({ success: false, error: 'Access denied. AdminLSA role required.' });
        }

        req.user = user[0];
        next();
    } catch (error) {
        res.status(401).json({ success: false, error: 'Invalid token.' });
    }
};

// Enhanced Dashboard Statistics
router.get('/enhanced/dashboard/stats', verifyAdminLSA, async (req, res) => {
    try {
        const [stats] = await db.execute(`
      SELECT 
        (SELECT COUNT(*) FROM spas WHERE status = 'pending') as pending_spas,
        (SELECT COUNT(*) FROM spas WHERE status = 'verified') as verified_spas,
        (SELECT COUNT(*) FROM spas WHERE status = 'rejected') as rejected_spas,
        (SELECT COUNT(*) FROM spas WHERE blacklist_reason IS NOT NULL) as blacklisted_spas,
        (SELECT COUNT(*) FROM therapists WHERE status = 'pending') as pending_therapists,
        (SELECT COUNT(*) FROM therapists WHERE status = 'approved') as approved_therapists,
        (SELECT COUNT(*) FROM admin_users WHERE role = 'government_officer' AND is_active = 1) as active_officers,
        (SELECT COUNT(*) FROM payments WHERE status = 'pending' AND payment_method = 'bank_transfer') as pending_bank_transfers,
        (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'completed' AND MONTH(created_at) = MONTH(CURDATE())) as monthly_revenue
    `);

        res.json({
            success: true,
            data: stats[0]
        });
    } catch (error) {
        console.error('Error fetching enhanced dashboard stats:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch dashboard statistics' });
    }
});

// Financial Dashboard - Monthly Reports
router.get('/enhanced/financial/monthly', async (req, res) => {
    try {
        const { year = new Date().getFullYear() } = req.query;

        // Only fetch annual payment data for the financial dashboard
        const [financialData] = await db.execute(`
      SELECT 
        MONTH(created_at) as month,
        SUM(CASE WHEN payment_type = 'annual' THEN amount ELSE 0 END) as annual_fees,
        COUNT(CASE WHEN payment_type = 'annual' THEN 1 END) as total_payments
      FROM payments 
      WHERE payment_status = 'completed' AND YEAR(created_at) = ? AND payment_type = 'annual'
      GROUP BY MONTH(created_at)
      ORDER BY month
    `, [year]);

        // Fill in missing months with zero values
        const monthlyData = Array.from({ length: 12 }, (_, index) => {
            const month = index + 1;
            const existingData = financialData.find(d => d.month === month);
            return existingData || {
                month,
                annual_fees: 0,
                total_payments: 0
            };
        });

        res.json({
            success: true,
            data: {
                year: parseInt(year),
                monthly_data: monthlyData,
                summary: {
                    total_annual: monthlyData.reduce((sum, m) => sum + parseFloat(m.annual_fees || 0), 0),
                    total_payments: monthlyData.reduce((sum, m) => sum + (m.total_payments || 0), 0)
                }
            }
        });
    } catch (error) {
        console.error('Error fetching financial data:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch financial data' });
    }
});

// Enhanced Spa Management - Blacklist functionality
router.post('/enhanced/spas/:id/blacklist', verifyAdminLSA, async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        if (!reason) {
            return res.status(400).json({ success: false, error: 'Blacklist reason is compulsory' });
        }

        await db.execute(`
      UPDATE spas SET 
        blacklist_reason = ?,
        blacklisted_at = NOW(),
        status = 'rejected'
      WHERE id = ?
    `, [reason, id]);

        res.json({ success: true, message: 'Spa blacklisted successfully' });
    } catch (error) {
        console.error('Error blacklisting spa:', error);
        res.status(500).json({ success: false, error: 'Failed to blacklist spa' });
    }
});

// Third-Party Login Management
router.get('/enhanced/third-party/accounts', verifyAdminLSA, async (req, res) => {
    try {
        const [accounts] = await db.execute(`
      SELECT id, username, email, full_name, department, is_temporary, expires_at, created_at, last_login, is_active
      FROM admin_users 
      WHERE role = 'government_officer'
      ORDER BY created_at DESC
    `);

        res.json({ success: true, data: accounts });
    } catch (error) {
        console.error('Error fetching third-party accounts:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch accounts' });
    }
});

// Create temporary third-party login
router.post('/enhanced/third-party/create', verifyAdminLSA, async (req, res) => {
    try {
        const { username, email, full_name, department, duration_hours = 8 } = req.body;

        // Generate temporary password
        const tempPassword = Math.random().toString(36).slice(-10) + Math.random().toString(36).slice(-10);
        const hashedPassword = await bcrypt.hash(tempPassword, 10);

        // Calculate expiry time
        const expiresAt = new Date(Date.now() + (duration_hours * 60 * 60 * 1000));

        const [result] = await db.execute(`
      INSERT INTO admin_users (
        username, email, password_hash, role, full_name, department, 
        is_temporary, expires_at, created_by, is_active
      ) VALUES (?, ?, ?, 'government_officer', ?, ?, 1, ?, ?, 1)
    `, [username, email, hashedPassword, full_name, department, expiresAt, req.user.id]);

        res.status(201).json({
            success: true,
            message: 'Temporary account created successfully',
            data: {
                id: result.insertId,
                username,
                temporary_password: tempPassword,
                expires_at: expiresAt,
                login_url: '/third-party-login'
            }
        });
    } catch (error) {
        console.error('Error creating third-party account:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            res.status(400).json({ success: false, error: 'Username or email already exists' });
        } else {
            res.status(500).json({ success: false, error: 'Failed to create account' });
        }
    }
});

// Delete third-party account
router.delete('/enhanced/third-party/:id', verifyAdminLSA, async (req, res) => {
    try {
        const { id } = req.params;

        const [result] = await db.execute(`
      DELETE FROM admin_users 
      WHERE id = ? AND role = 'government_officer'
    `, [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: 'Account not found' });
        }

        res.json({ success: true, message: 'Account deleted successfully' });
    } catch (error) {
        console.error('Error deleting third-party account:', error);
        res.status(500).json({ success: false, error: 'Failed to delete account' });
    }
});

// Bank Transfer Approval
router.get('/enhanced/payments/bank-transfers', async (req, res) => {
    try {
        const [payments] = await db.execute(`
      SELECT p.*, s.name as spa_name, s.reference_number, s.owner_fname, s.owner_lname,
      CASE 
        WHEN p.bank_slip_path IS NOT NULL THEN 
            CASE 
                WHEN REPLACE(p.bank_slip_path, '\\\\', '/') LIKE '/uploads/%' THEN CONCAT('http://localhost:3001', REPLACE(p.bank_slip_path, '\\\\', '/'))
                WHEN REPLACE(p.bank_slip_path, '\\\\', '/') LIKE 'uploads/%' THEN CONCAT('http://localhost:3001/', REPLACE(p.bank_slip_path, '\\\\', '/'))
                ELSE CONCAT('http://localhost:3001/', REPLACE(p.bank_slip_path, '\\\\', '/'))
            END
        ELSE NULL
      END as bank_slip_path
      FROM payments p
      JOIN spas s ON p.spa_id = s.id
      WHERE p.payment_method = 'bank_transfer' 
        AND p.payment_status = 'pending_approval' 
        AND p.payment_type = 'annual'
      ORDER BY p.created_at DESC
    `);

        res.json({ success: true, data: payments });
    } catch (error) {
        console.error('Error fetching bank transfers:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch bank transfers' });
    }
});

// Get payment history with detailed information
router.get('/enhanced/payments/history', async (req, res) => {
    try {
        const { limit = 50, offset = 0, payment_type, status, year, month } = req.query;

        const limitValue = parseInt(limit) || 50;
        const offsetValue = parseInt(offset) || 0;

        // Filter only annual payments and fix bank slip path
        const [payments] = await db.execute(`
            SELECT 
                p.*,
                s.name as spa_name,
                s.reference_number as spa_reference,
                s.owner_fname,
                s.owner_lname,
                s.email as owner_email,
                CASE 
                    WHEN p.bank_slip_path IS NOT NULL THEN 
                        CASE 
                            WHEN REPLACE(p.bank_slip_path, '\\\\', '/') LIKE '/uploads/%' THEN CONCAT('http://localhost:3001', REPLACE(p.bank_slip_path, '\\\\', '/'))
                            WHEN REPLACE(p.bank_slip_path, '\\\\', '/') LIKE 'uploads/%' THEN CONCAT('http://localhost:3001/', REPLACE(p.bank_slip_path, '\\\\', '/'))
                            ELSE CONCAT('http://localhost:3001/', REPLACE(p.bank_slip_path, '\\\\', '/'))
                        END
                    ELSE NULL
                END as bank_slip_path,
                CASE 
                    WHEN p.payment_method = 'bank_transfer' THEN 
                        CASE WHEN p.payment_status = 'completed' THEN 'Approved' 
                             WHEN p.payment_status = 'pending_approval' THEN 'Pending Approval'
                             ELSE p.payment_status END
                    ELSE 'Card Payment'
                END as approval_status
            FROM payments p
            JOIN spas s ON p.spa_id = s.id
            WHERE p.payment_type = 'annual'
            ORDER BY p.created_at DESC 
            LIMIT ${limitValue} OFFSET ${offsetValue}
        `);

        console.log('📊 Payment history query executed successfully (filtered for annual payments only)');

        // Get total count for annual payments only
        const countQuery = `SELECT COUNT(*) as total FROM payments p JOIN spas s ON p.spa_id = s.id WHERE p.payment_type = 'annual'`;
        const [countResult] = await db.execute(countQuery);

        res.json({
            success: true,
            data: payments,
            total: countResult[0].total,
            pagination: {
                limit: limitValue,
                offset: offsetValue,
                hasMore: countResult[0].total > (offsetValue + limitValue)
            }
        });
    } catch (error) {
        console.error('Error fetching payment history:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch payment history' });
    }
});

// Approve bank transfer
router.post('/enhanced/payments/:id/approve', async (req, res) => {
    try {
        const { id } = req.params;
        const { notes } = req.body;

        // First, get the payment details to check if it's an annual payment
        const [paymentRows] = await db.execute(`
            SELECT * FROM payments 
            WHERE id = ? AND payment_method = 'bank_transfer'
        `, [id]);

        if (paymentRows.length === 0) {
            return res.status(404).json({ success: false, error: 'Payment not found' });
        }

        const payment = paymentRows[0];

        // Update payment status
        await db.execute(`
            UPDATE payments SET 
                payment_status = 'completed',
                approved_at = NOW(),
                approved_by = 1
            WHERE id = ? AND payment_method = 'bank_transfer'
        `, [id]);

        // Get SPA details for email notification
        const [spaDetails] = await db.execute(`
            SELECT s.name, s.email, s.owner_fname, s.owner_lname, s.status
            FROM lsa_spa_management.spas s 
            WHERE s.id = ?
        `, [payment.spa_id]);

        // Only check payment_type === 'annual'
        if (payment.payment_type === 'annual') {
            console.log(`🎯 Annual payment detected for SPA ${payment.spa_id}. Updating status to verified...`);
            // First check if SPA exists
            const [spaCheck] = await db.execute(`
                    SELECT id, status FROM lsa_spa_management.spas WHERE id = ?
                `, [payment.spa_id]);

            if (spaCheck.length === 0) {
                console.log(`❌ SPA with ID ${payment.spa_id} not found in database!`);
                return res.json({ success: true, message: 'Bank transfer approved successfully, but SPA not found for status update' });
            }

            console.log(`📋 SPA found: ID ${payment.spa_id} - Current status: ${spaCheck[0].status}`);
            // Update the status
            const updateResult = await db.execute(`
                    UPDATE lsa_spa_management.spas 
                    SET status = 'verified', updated_at = NOW()
                    WHERE id = ?
                `, [payment.spa_id]);

            console.log(`🔧 Update query executed. Affected rows: ${updateResult[0].affectedRows}`);

            // Verify the update worked
            const [updatedSpa] = await db.execute(`
                    SELECT id, status FROM lsa_spa_management.spas WHERE id = ?
                `, [payment.spa_id]);

            if (updatedSpa.length > 0) {
                console.log(`✅ SPA ${payment.spa_id} status successfully updated to '${updatedSpa[0].status}'`);
            } else {
                console.log(`❌ Failed to verify SPA status update for SPA ID: ${payment.spa_id}`);
            }
        } else {
            console.log(`ℹ️ Non-annual payment approved for SPA ${payment.spa_id}. Status remains unchanged.`);
        }

        // Send email notification to SPA owner
        if (spaDetails.length > 0) {
            const spa = spaDetails[0];
            console.log('📧 Sending payment approval email to:', spa.email);

            const emailResult = await sendPaymentStatusEmail(
                spa.email,
                `${spa.owner_fname} ${spa.owner_lname}`,
                spa.name,
                'approved',
                payment.payment_type,
                payment.amount,
                notes
            );

            if (emailResult.success) {
                console.log('✅ Payment approval email sent successfully');
            } else {
                console.error('❌ Failed to send payment approval email:', emailResult.error);
            }
        }

        res.json({ success: true, message: 'Bank transfer approved successfully' });
    } catch (error) {
        console.error('Error approving bank transfer:', error);
        res.status(500).json({ success: false, error: 'Failed to approve bank transfer' });
    }
});

// Reject bank transfer
router.post('/enhanced/payments/:id/reject', async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        // First, get the payment details
        const [paymentRows] = await db.execute(`
            SELECT * FROM payments 
            WHERE id = ? AND payment_method = 'bank_transfer'
        `, [id]);

        if (paymentRows.length === 0) {
            return res.status(404).json({ success: false, error: 'Payment not found' });
        }

        const payment = paymentRows[0];

        // Update payment status
        await db.execute(`
            UPDATE payments SET 
                payment_status = 'rejected',
                rejection_reason = ?,
                approved_at = NOW(),
                approved_by = 1
            WHERE id = ? AND payment_method = 'bank_transfer'
        `, [reason, id]);

        // Get SPA details for email notification
        const [spaDetails] = await db.execute(`
            SELECT s.name, s.email, s.owner_fname, s.owner_lname
            FROM lsa_spa_management.spas s 
            WHERE s.id = ?
        `, [payment.spa_id]);

        // Send email notification to SPA owner
        if (spaDetails.length > 0) {
            const spa = spaDetails[0];
            console.log('📧 Sending payment rejection email to:', spa.email);

            const emailResult = await sendPaymentStatusEmail(
                spa.email,
                `${spa.owner_fname} ${spa.owner_lname}`,
                spa.name,
                'rejected',
                payment.payment_type,
                payment.amount,
                reason
            );

            if (emailResult.success) {
                console.log('✅ Payment rejection email sent successfully');
            } else {
                console.error('❌ Failed to send payment rejection email:', emailResult.error);
            }
        }

        res.json({ success: true, message: 'Bank transfer rejected successfully' });
    } catch (error) {
        console.error('Error rejecting bank transfer:', error);
        res.status(500).json({ success: false, error: 'Failed to reject bank transfer' });
    }
});

// Manual SPA status update endpoint
router.post('/enhanced/spa/:id/update-status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status, reason } = req.body;

        // Validate status
        const validStatuses = ['verified', 'unverified', 'pending', 'rejected', 'blacklisted'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid status. Must be one of: ' + validStatuses.join(', ')
            });
        }

        // Get current SPA details
        const [currentSpa] = await db.execute(`
            SELECT id, spa_name, status as current_status FROM lsa_spa_management.spas WHERE id = ?
        `, [id]);

        if (currentSpa.length === 0) {
            return res.status(404).json({ success: false, error: 'SPA not found' });
        }

        // Update SPA status
        await db.execute(`
            UPDATE lsa_spa_management.spas 
            SET status = ?, updated_at = NOW()
            WHERE id = ?
        `, [status, id]);

        // Log the status change
        console.log(`🔄 Manual status update: SPA ${id} (${currentSpa[0].spa_name}) changed from '${currentSpa[0].current_status}' to '${status}'${reason ? ` - Reason: ${reason}` : ''}`);

        res.json({
            success: true,
            message: `SPA status updated successfully from '${currentSpa[0].current_status}' to '${status}'`,
            data: {
                spa_id: id,
                spa_name: currentSpa[0].spa_name,
                old_status: currentSpa[0].current_status,
                new_status: status,
                updated_at: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Error updating SPA status:', error);
        res.status(500).json({ success: false, error: 'Failed to update SPA status' });
    }
});

// ==================== THIRD-PARTY GOVERNMENT OFFICER ROUTES ====================

/**
 * @route   POST /api/lsa/third-party/create
 * @desc    Create government officer account
 * @access  Private (Admin)
 */
router.post('/third-party/create', asyncHandler(async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                error: 'Username and password are required'
            });
        }

        // Check if username already exists
        const [existingUser] = await db.execute(
            'SELECT id FROM third_party_users WHERE username = ?',
            [username]
        );

        if (existingUser.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'Username already exists'
            });
        }

        // Hash the provided password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create government officer account
        const [result] = await db.execute(`
            INSERT INTO third_party_users (
                username, password_hash, full_name, role, 
                created_by, is_active
            ) VALUES (?, ?, ?, 'government_officer', ?, true)
        `, [
            username,
            hashedPassword,
            `Officer ${username}`,
            1 // Default admin ID
        ]);

        // Calculate expiration time (8 hours from now)
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 8);

        res.status(201).json({
            success: true,
            message: 'Government officer account created successfully',
            data: {
                id: result.insertId,
                username,
                department: 'Government Office',
                expiresAt,
                status: 'active'
            }
        });

    } catch (error) {
        console.error('Create government officer error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create government officer account'
        });
    }
}));

/**
 * @route   GET /api/lsa/third-party/accounts
 * @desc    Get all government officer accounts
 * @access  Private (Admin)
 */
router.get('/third-party/accounts', asyncHandler(async (req, res) => {
    try {
        const [accounts] = await db.execute(`
            SELECT 
                id, username, full_name, is_active, 
                created_at, last_login,
                CASE 
                    WHEN is_active = false THEN 'inactive'
                    WHEN last_login IS NULL THEN 'never_logged_in'
                    ELSE 'active'
                END as status
            FROM third_party_users 
            WHERE role = 'government_officer'
            ORDER BY created_at DESC
        `);

        res.json({
            success: true,
            data: accounts
        });

    } catch (error) {
        console.error('Fetch government officer accounts error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch accounts'
        });
    }
}));

/**
 * @route   DELETE /api/lsa/third-party/account/:id
 * @desc    Delete government officer account
 * @access  Private (Admin)
 */
router.delete('/third-party/account/:id', asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;

        // Check if account exists
        const [account] = await db.execute(
            'SELECT username FROM third_party_users WHERE id = ? AND role = "government_officer"',
            [id]
        );

        if (account.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Account not found'
            });
        }

        // Delete the account
        await db.execute(
            'DELETE FROM third_party_users WHERE id = ?',
            [id]
        );

        res.json({
            success: true,
            message: `Government officer account '${account[0].username}' deleted successfully`
        });

    } catch (error) {
        console.error('Delete government officer account error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete account'
        });
    }
}));

// ==================== ACCOUNT SETTINGS ROUTES ====================

/**
 * @route   PUT /api/lsa/account/change-credentials
 * @desc    Change admin username and/or password
 * @access  Private (Admin LSA)
 */
router.put('/account/change-credentials', asyncHandler(async (req, res) => {
    try {
        const { admin_id, current_password, new_username, new_email, new_password } = req.body;

        // Validate required fields
        if (!admin_id || !current_password) {
            return res.status(400).json({
                success: false,
                message: 'Admin ID and current password are required'
            });
        }

        // At least one of new_username, new_email or new_password must be provided
        if (!new_username && !new_email && !new_password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide new username, email or password'
            });
        }

        // Validate email format if new email is provided
        if (new_email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(new_email)) {
                return res.status(400).json({
                    success: false,
                    message: 'Please provide a valid email address'
                });
            }
        }

        // Validate password requirements if new password is provided
        if (new_password) {
            const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@#$%!*])[A-Za-z\d@#$%!*]{8,}$/;
            if (!passwordRegex.test(new_password)) {
                return res.status(400).json({
                    success: false,
                    message: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character (@#$%!*)'
                });
            }
        }

        // Get current admin user (support all admin roles)
        const [adminUser] = await db.execute(
            'SELECT id, username, email, password_hash, role FROM admin_users WHERE id = ?',
            [admin_id]
        );

        if (adminUser.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Admin user not found'
            });
        }

        const user = adminUser[0];

        // Verify current password
        let isPasswordValid = false;
        if (user.password_hash.startsWith('$2b$')) {
            // Bcrypt hash
            isPasswordValid = await bcrypt.compare(current_password, user.password_hash);
        } else {
            // Plain text (for development)
            isPasswordValid = (current_password === user.password_hash);
        }

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }

        // Check if new username already exists (if username is being changed)
        if (new_username && new_username !== user.username) {
            const [existingUser] = await db.execute(
                'SELECT id FROM admin_users WHERE username = ? AND id != ?',
                [new_username, admin_id]
            );

            if (existingUser.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Username already exists'
                });
            }
        }

        // Check if new email already exists (if email is being changed)
        if (new_email && new_email !== user.email) {
            const [existingEmail] = await db.execute(
                'SELECT id FROM admin_users WHERE email = ? AND id != ?',
                [new_email, admin_id]
            );

            if (existingEmail.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Email already exists'
                });
            }
        }

        // Prepare update query
        let updateQuery = 'UPDATE admin_users SET ';
        let updateParams = [];
        let updateFields = [];

        // Add username update if provided
        if (new_username) {
            updateFields.push('username = ?');
            updateParams.push(new_username);
        }

        // Add email update if provided
        if (new_email) {
            updateFields.push('email = ?');
            updateParams.push(new_email);
        }

        // Add password update if provided
        if (new_password) {
            const hashedPassword = await bcrypt.hash(new_password, 10);
            updateFields.push('password_hash = ?');
            updateParams.push(hashedPassword);
        }

        // Add timestamp
        updateFields.push('updated_at = CURRENT_TIMESTAMP');

        // Complete the query
        updateQuery += updateFields.join(', ') + ' WHERE id = ?';
        updateParams.push(admin_id);

        // Execute update
        await db.execute(updateQuery, updateParams);

        res.json({
            success: true,
            message: 'Credentials updated successfully',
            data: {
                username: new_username || user.username,
                email: new_email || user.email,
                updated_fields: {
                    username: !!new_username,
                    email: !!new_email,
                    password: !!new_password
                }
            }
        });

    } catch (error) {
        console.error('Change credentials error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update credentials',
            error: error.message
        });
    }
}));

module.exports = router;