const express = require('express');
const router = express.Router();
const SpaModel = require('../models/SpaModel');
const { spaUpload } = require('../middleware/upload');

// Error handler middleware
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// ==================== SPA REGISTRATION ROUTES ====================

/**
 * @route   POST /api/spa/register
 * @desc    Register a new spa
 * @access  Public
 */
router.post('/register', spaUpload, asyncHandler(async (req, res) => {
    try {
        const spaData = {
            spa_name: req.body.spa_name,
            owner_name: req.body.owner_name,
            email: req.body.email,
            contact_phone: req.body.contact_phone,
            address: req.body.address,
            city: req.body.city,
            postal_code: req.body.postal_code,
            nic_number: req.body.nic_number,
            br_number: req.body.br_number,
            tax_reg_number: req.body.tax_reg_number,
            spa_type: req.body.spa_type,
            services_offered: req.body.services_offered ? JSON.parse(req.body.services_offered) : [],
            facility_description: req.body.facility_description,
            operating_hours: req.body.operating_hours ? JSON.parse(req.body.operating_hours) : {},
            payment_methods: req.body.payment_methods ? JSON.parse(req.body.payment_methods) : [],
            social_media: req.body.social_media ? JSON.parse(req.body.social_media) : {}
        };

        // Handle file uploads
        if (req.files) {
            if (req.files.nic_front) spaData.nic_front_image = req.files.nic_front[0].path;
            if (req.files.nic_back) spaData.nic_back_image = req.files.nic_back[0].path;
            if (req.files.br_attachment) spaData.br_attachment = req.files.br_attachment[0].path;
            if (req.files.tax_registration) spaData.tax_registration = req.files.tax_registration[0].path;
            if (req.files.other_doc) spaData.other_documents = req.files.other_doc[0].path;

            if (req.files.facility_photos) {
                spaData.facility_photos = req.files.facility_photos.map(file => file.path);
            }

            if (req.files.professional_certifications) {
                spaData.professional_certifications = req.files.professional_certifications.map(file => file.path);
            }
        }

        const result = await SpaModel.createSpa(spaData);

        res.status(201).json({
            success: true,
            message: 'Spa registration submitted successfully',
            data: {
                spa_id: result.spa_id,
                status: result.verification_status
            }
        });

    } catch (error) {
        console.error('Spa registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Registration failed',
            error: error.message
        });
    }
}));

/**
 * @route   GET /api/spa/profile/:spaId
 * @desc    Get spa profile details
 * @access  Private
 */
router.get('/profile/:spaId', asyncHandler(async (req, res) => {
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
        console.error('Get spa profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch spa profile',
            error: error.message
        });
    }
}));

/**
 * @route   PUT /api/spa/profile/:spaId
 * @desc    Update spa profile
 * @access  Private
 */
router.put('/profile/:spaId', spaUpload, asyncHandler(async (req, res) => {
    try {
        const { spaId } = req.params;
        const updateData = { ...req.body };

        // Parse JSON fields
        if (updateData.services_offered) updateData.services_offered = JSON.parse(updateData.services_offered);
        if (updateData.operating_hours) updateData.operating_hours = JSON.parse(updateData.operating_hours);
        if (updateData.payment_methods) updateData.payment_methods = JSON.parse(updateData.payment_methods);
        if (updateData.social_media) updateData.social_media = JSON.parse(updateData.social_media);

        // Handle file uploads
        if (req.files) {
            if (req.files.nic_front) updateData.nic_front_image = req.files.nic_front[0].path;
            if (req.files.nic_back) updateData.nic_back_image = req.files.nic_back[0].path;
            if (req.files.br_attachment) updateData.br_attachment = req.files.br_attachment[0].path;
            if (req.files.tax_registration) updateData.tax_registration = req.files.tax_registration[0].path;
            if (req.files.other_doc) updateData.other_documents = req.files.other_doc[0].path;

            if (req.files.facility_photos) {
                updateData.facility_photos = req.files.facility_photos.map(file => file.path);
            }

            if (req.files.professional_certifications) {
                updateData.professional_certifications = req.files.professional_certifications.map(file => file.path);
            }
        }

        const result = await SpaModel.updateSpa(spaId, updateData);

        res.json({
            success: true,
            message: 'Spa profile updated successfully',
            data: result
        });

    } catch (error) {
        console.error('Update spa profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update spa profile',
            error: error.message
        });
    }
}));

/**
 * @route   PUT /api/spa/resubmit/:spaId
 * @desc    Resubmit rejected spa application with corrections
 * @access  Private
 */
router.put('/resubmit/:spaId', spaUpload, asyncHandler(async (req, res) => {
    try {
        const { spaId } = req.params;

        console.log(`📝 Resubmission request for SPA ID: ${spaId}`);
        console.log(`📎 Files received:`, req.files ? Object.keys(req.files) : 'none');

        // Check if spa exists and is rejected
        const existingSpa = await SpaModel.getSpaById(spaId);
        if (!existingSpa) {
            return res.status(404).json({
                success: false,
                message: 'Spa not found'
            });
        }

        if (existingSpa.status !== 'rejected') {
            return res.status(400).json({
                success: false,
                message: 'Only rejected applications can be resubmitted'
            });
        }

        const updateData = {
            // Personal Information (using current table column names)
            owner_fname: req.body.firstName,
            owner_lname: req.body.lastName,
            email: req.body.email,
            phone: req.body.telephone || req.body.cellphone,

            // Spa Information (simplified to match current table)
            name: req.body.spaName,
            address: `${req.body.spaAddressLine1}, ${req.body.spaAddressLine2 || ''}, ${req.body.spaProvince}, ${req.body.spaPostalCode}`.replace(', ,', ','),

            // Reset status to pending
            status: 'pending',
            reject_reason: null,
            updated_at: new Date()
        };

        // Handle file uploads if provided (using actual table column names)
        // Store paths as JSON arrays to match the initial registration format
        // IMPORTANT: Store RELATIVE paths (not absolute), matching initial registration
        if (req.files) {
            // Helper to convert absolute path to relative (remove backend dir prefix)
            const toRelativePath = (absolutePath) => {
                // multer gives: D:\...\backend\uploads\spas\nic\file.png
                // we need: uploads\spas\nic\file.png
                return absolutePath.replace(/.*[\\\/]backend[\\\/]/, '');
            };

            if (req.files.nicFront && req.files.nicFront[0]) {
                const relativePath = toRelativePath(req.files.nicFront[0].path);
                updateData.nic_front_path = JSON.stringify([relativePath]);
                console.log('📎 NIC Front uploaded:', relativePath);
            }
            if (req.files.nicBack && req.files.nicBack[0]) {
                const relativePath = toRelativePath(req.files.nicBack[0].path);
                updateData.nic_back_path = JSON.stringify([relativePath]);
                console.log('📎 NIC Back uploaded:', relativePath);
            }
            if (req.files.brAttachment && req.files.brAttachment[0]) {
                const relativePath = toRelativePath(req.files.brAttachment[0].path);
                updateData.br_attachment_path = JSON.stringify([relativePath]);
                console.log('📎 BR Attachment uploaded:', relativePath);
            }
            if (req.files.otherDocument && req.files.otherDocument[0]) {
                const relativePath = toRelativePath(req.files.otherDocument[0].path);
                updateData.other_document_path = JSON.stringify([relativePath]);
                console.log('📎 Other Document uploaded:', relativePath);
            }
            if (req.files.form1Certificate && req.files.form1Certificate[0]) {
                const relativePath = toRelativePath(req.files.form1Certificate[0].path);
                updateData.form1_certificate_path = JSON.stringify([relativePath]);
                console.log('📎 Form1 Certificate uploaded:', relativePath);
            }
            if (req.files.spaPhotosBanner && req.files.spaPhotosBanner[0]) {
                const relativePath = toRelativePath(req.files.spaPhotosBanner[0].path);
                updateData.spa_photos_banner_path = JSON.stringify([relativePath]);
                console.log('📎 SPA Banner uploaded:', relativePath);
            }

            // Handle multiple facility photos if provided
            if (req.files.facilityPhotos && req.files.facilityPhotos.length > 0) {
                updateData.facility_photos_path = JSON.stringify(
                    req.files.facilityPhotos.map(file => toRelativePath(file.path))
                );
                console.log('📎 Facility Photos uploaded:', req.files.facilityPhotos.length, 'files');
            }

            // Handle multiple professional certifications if provided
            if (req.files.professionalCertifications && req.files.professionalCertifications.length > 0) {
                updateData.professional_certificates_path = JSON.stringify(
                    req.files.professionalCertifications.map(file => toRelativePath(file.path))
                );
                console.log('📎 Professional Certifications uploaded:', req.files.professionalCertifications.length, 'files');
            }
        }

        console.log(`✅ Update data prepared:`, {
            ...updateData,
            nic_front_path: updateData.nic_front_path ? 'uploaded' : 'not provided',
            nic_back_path: updateData.nic_back_path ? 'uploaded' : 'not provided'
        });

        const result = await SpaModel.resubmitSpa(spaId, updateData);

        res.json({
            success: true,
            message: 'Application resubmitted successfully for review',
            data: result
        });

    } catch (error) {
        console.error('Resubmit spa application error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to resubmit application',
            error: error.message
        });
    }
}));

// ==================== SPA DASHBOARD ROUTES ====================

/**
 * @route   GET /api/spa/dashboard/:spaId
 * @desc    Get spa dashboard statistics
 * @access  Private
 */
router.get('/dashboard/:spaId', asyncHandler(async (req, res) => {
    try {
        const { spaId } = req.params;
        const stats = await SpaModel.getSpaStats(spaId);

        res.json({
            success: true,
            data: stats
        });

    } catch (error) {
        console.error('Get spa dashboard error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch dashboard data',
            error: error.message
        });
    }
}));

/**
 * @route   GET /api/spa/verification-status/:spaId
 * @desc    Get spa verification status
 * @access  Private
 */
router.get('/verification-status/:spaId', asyncHandler(async (req, res) => {
    try {
        const { spaId } = req.params;
        const status = await SpaModel.getVerificationStatus(spaId);

        res.json({
            success: true,
            data: status
        });

    } catch (error) {
        console.error('Get verification status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch verification status',
            error: error.message
        });
    }
}));

// ==================== SPA THERAPIST MANAGEMENT ROUTES ====================

/**
 * @route   GET /api/spa/therapists/:spaId
 * @desc    Get all therapists for a spa
 * @access  Private
 */
router.get('/therapists/:spaId', asyncHandler(async (req, res) => {
    try {
        const { spaId } = req.params;
        const { status, page = 1, limit = 10 } = req.query;

        const therapists = await SpaModel.getSpaTherapists(spaId, {
            status,
            page: parseInt(page),
            limit: parseInt(limit)
        });

        res.json({
            success: true,
            data: therapists
        });

    } catch (error) {
        console.error('Get spa therapists error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch therapists',
            error: error.message
        });
    }
}));

/**
 * @route   GET /api/spa/payments/:spaId
 * @desc    Get payment history and plans for spa
 * @access  Private
 */
router.get('/payments/:spaId', asyncHandler(async (req, res) => {
    try {
        const { spaId } = req.params;
        const payments = await SpaModel.getPaymentHistory(spaId);

        res.json({
            success: true,
            data: payments
        });

    } catch (error) {
        console.error('Get payments error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch payment data',
            error: error.message
        });
    }
}));

/**
 * @route   GET /api/spa/activity-logs/:spaId
 * @desc    Get activity logs for spa
 * @access  Private
 */
router.get('/activity-logs/:spaId', asyncHandler(async (req, res) => {
    try {
        const { spaId } = req.params;
        const { page = 1, limit = 20 } = req.query;

        const logs = await SpaModel.getActivityLogs(spaId, {
            page: parseInt(page),
            limit: parseInt(limit)
        });

        res.json({
            success: true,
            data: logs
        });

    } catch (error) {
        console.error('Get activity logs error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch activity logs',
            error: error.message
        });
    }
}));

/**
 * @route   GET /api/spa/notifications/:spaId
 * @desc    Get notifications for spa
 * @access  Private
 */
router.get('/notifications/:spaId', asyncHandler(async (req, res) => {
    try {
        const { spaId } = req.params;
        const { read_status } = req.query;

        const notifications = await SpaModel.getNotifications(spaId, read_status);

        res.json({
            success: true,
            data: notifications
        });

    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch notifications',
            error: error.message
        });
    }
}));

/**
 * @route   PUT /api/spa/notifications/:notificationId/read
 * @desc    Mark notification as read
 * @access  Private
 */
router.put('/notifications/:notificationId/read', asyncHandler(async (req, res) => {
    try {
        const { notificationId } = req.params;
        await SpaModel.markNotificationRead(notificationId);

        res.json({
            success: true,
            message: 'Notification marked as read'
        });

    } catch (error) {
        console.error('Mark notification read error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to mark notification as read',
            error: error.message
        });
    }
}));

// ==================== ERROR HANDLING ====================

// Global error handler for this router
router.use((error, req, res, next) => {
    console.error('SPA Routes Error:', error);

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
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
});

// ==================== SPA PROFILE ROUTE ====================

/**
 * @route   GET /api/spa/profile/:spa_id
 * @desc    Get spa profile information by spa_id
 * @access  Private (requires authentication)
 */
router.get('/profile/:spa_id', asyncHandler(async (req, res) => {
    try {
        const { spa_id } = req.params;

        console.log('Fetching spa profile for ID:', spa_id);

        // For now, let's use direct database query since we're not sure about the SpaModel
        const db = require('../config/database');
        const connection = await db.getConnection();

        try {
            // Query the spas table for the specific spa
            const [rows] = await connection.execute(
                'SELECT id, name, owner_fname, owner_lname, email, phone, address, status, reference_number FROM spas WHERE id = ?',
                [spa_id]
            );

            if (rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Spa not found'
                });
            }

            const spa = rows[0];
            console.log('Spa profile found:', spa);

            res.json({
                success: true,
                data: spa,
                message: 'Spa profile retrieved successfully'
            });

        } finally {
            connection.release();
        }

    } catch (error) {
        console.error('Error fetching spa profile:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch spa profile',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
}));

module.exports = router;