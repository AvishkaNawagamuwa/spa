const express = require('express');
const router = express.Router();
const TherapistModel = require('../models/TherapistModel');
const { therapistUpload } = require('../middleware/upload');

// Error handler middleware
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// ==================== THERAPIST REQUEST ROUTES ====================

/**
 * @route   POST /api/therapists/apply
 * @desc    Submit therapist application
 * @access  Public
 */
router.post('/apply', therapistUpload, asyncHandler(async (req, res) => {
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
            added_by_admin: false
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
            message: 'Therapist application submitted successfully',
            data: {
                application_id: result.therapist_id,
                status: result.status,
                reference_number: `TH${result.therapist_id.toString().padStart(6, '0')}`
            }
        });

    } catch (error) {
        console.error('Therapist application error:', error);
        res.status(500).json({
            success: false,
            message: 'Application submission failed',
            error: error.message
        });
    }
}));

/**
 * @route   POST /api/therapists/register
 * @desc    Register therapist (AdminSPA compatible endpoint)
 * @access  Public
 */
router.post('/register', therapistUpload, asyncHandler(async (req, res) => {
    try {
        console.log('Therapist registration request received:', req.body);

        // Direct database insertion matching actual table structure
        const db = require('../config/database');
        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            const therapistData = {
                spa_id: req.body.spa_id || 1,
                name: `${req.body.firstName || ''} ${req.body.lastName || ''}`.trim(),
                email: req.body.email || `${(req.body.firstName || '').toLowerCase()}.${(req.body.lastName || '').toLowerCase()}@spa.com`,
                phone: req.body.phone || '',
                address: req.body.address || 'Spa Location',
                experience_years: parseInt(req.body.experience_years) || 0,
                specializations: JSON.stringify(req.body.specializations ? JSON.parse(req.body.specializations) : ['General Therapy']),
                status: 'pending'
            };

            // Handle file uploads
            let certificate_path = null;
            if (req.files) {
                if (req.files.certificate && req.files.certificate.length > 0) {
                    certificate_path = req.files.certificate[0].path;
                }
                if (req.files.certificateFile && req.files.certificateFile.length > 0) {
                    certificate_path = req.files.certificateFile[0].path;
                }
            }

            if (certificate_path) {
                therapistData.certificate_path = certificate_path;
            }

            console.log('Creating therapist with data:', therapistData);

            // Insert directly into database
            const insertQuery = `
                INSERT INTO therapists (spa_id, name, email, phone, address, experience_years, specializations, certificate_path, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            const values = [
                therapistData.spa_id,
                therapistData.name,
                therapistData.email,
                therapistData.phone,
                therapistData.address,
                therapistData.experience_years,
                therapistData.specializations,
                therapistData.certificate_path,
                therapistData.status
            ];

            const [result] = await connection.execute(insertQuery, values);

            // Create notification for LSA admin about new therapist registration
            await connection.execute(
                `INSERT INTO notifications 
                (recipient_id, recipient_type, title, message, type, reference_id, reference_type, is_read) 
                VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
                [
                    1, // LSA admin ID
                    'admin_lsa',
                    'New Therapist Registration',
                    `New therapist "${therapistData.name}" has registered and is pending approval.`,
                    'therapist_registration',
                    result.insertId,
                    'therapist'
                ]
            );

            await connection.commit();

            console.log('Therapist created successfully:', result);

            // Send real-time notification via Socket.io
            const io = req.app.get('io');
            if (io) {
                const notification = {
                    recipient_id: 1,
                    recipient_type: 'admin_lsa',
                    title: 'New Therapist Registration',
                    message: `New therapist "${therapistData.name}" has registered and is pending approval.`,
                    type: 'therapist_registration',
                    reference_id: result.insertId,
                    reference_type: 'therapist',
                    therapist_id: result.insertId
                };

                io.to('lsa').emit('newNotification', notification);
            }

            res.status(201).json({
                success: true,
                message: 'Therapist registration submitted successfully',
                data: {
                    id: result.insertId,
                    status: 'pending',
                    reference_number: `TH${result.insertId.toString().padStart(6, '0')}`
                }
            });

        } catch (dbError) {
            await connection.rollback();
            throw dbError;
        } finally {
            connection.release();
        }

    } catch (error) {
        console.error('Therapist registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Registration failed: ' + error.message,
            error: error.message
        });
    }
}));

/**
 * @route   GET /api/therapists/application/:applicationId
 * @desc    Get therapist application status
 * @access  Public
 */
router.get('/application/:applicationId', asyncHandler(async (req, res) => {
    try {
        const { applicationId } = req.params;
        const application = await TherapistModel.getTherapistById(applicationId);

        if (!application) {
            return res.status(404).json({
                success: false,
                message: 'Application not found'
            });
        }

        // Return limited information for privacy
        const publicData = {
            application_id: application.therapist_id,
            reference_number: `TH${application.therapist_id.toString().padStart(6, '0')}`,
            status: application.status,
            submitted_date: application.created_at,
            last_updated: application.updated_at,
            first_name: application.first_name,
            last_name: application.last_name,
            spa_name: application.spa_name,
            admin_comments: application.admin_comments,
            rejection_reason: application.rejection_reason
        };

        res.json({
            success: true,
            data: publicData
        });

    } catch (error) {
        console.error('Get application status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch application status',
            error: error.message
        });
    }
}));

/**
 * @route   PUT /api/therapists/application/:applicationId
 * @desc    Update therapist application (before approval)
 * @access  Public
 */
router.put('/application/:applicationId', therapistUpload, asyncHandler(async (req, res) => {
    try {
        const { applicationId } = req.params;

        // Check if application exists and is in pending status
        const existing = await TherapistModel.getTherapistById(applicationId);
        if (!existing) {
            return res.status(404).json({
                success: false,
                message: 'Application not found'
            });
        }

        if (existing.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'Cannot update application after it has been processed'
            });
        }

        const updateData = { ...req.body };

        // Parse JSON fields
        if (updateData.specialization) updateData.specialization = JSON.parse(updateData.specialization);
        if (updateData.languages_spoken) updateData.languages_spoken = JSON.parse(updateData.languages_spoken);
        if (updateData.certifications) updateData.certifications = JSON.parse(updateData.certifications);
        if (updateData.availability) updateData.availability = JSON.parse(updateData.availability);
        if (updateData.experience_years) updateData.experience_years = parseInt(updateData.experience_years);
        if (updateData.hourly_rate) updateData.hourly_rate = parseFloat(updateData.hourly_rate);

        // Handle file uploads
        if (req.files) {
            if (req.files.nic_attachment) updateData.nic_attachment = req.files.nic_attachment[0].path;
            if (req.files.medical_certificate) updateData.medical_certificate = req.files.medical_certificate[0].path;
            if (req.files.spa_certificate) updateData.spa_certificate = req.files.spa_certificate[0].path;
            if (req.files.therapist_image) updateData.therapist_image = req.files.therapist_image[0].path;
        }

        const result = await TherapistModel.updateTherapist(applicationId, updateData);

        res.json({
            success: true,
            message: 'Application updated successfully',
            data: result
        });

    } catch (error) {
        console.error('Update application error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update application',
            error: error.message
        });
    }
}));

// ==================== THERAPIST PROFILE MANAGEMENT ====================

/**
 * @route   GET /api/therapists/profile/:therapistId
 * @desc    Get therapist profile (for approved therapists)
 * @access  Private
 */
router.get('/profile/:therapistId', asyncHandler(async (req, res) => {
    try {
        const { therapistId } = req.params;
        const therapist = await TherapistModel.getTherapistById(therapistId);

        if (!therapist) {
            return res.status(404).json({
                success: false,
                message: 'Therapist not found'
            });
        }

        if (therapist.status !== 'approved') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Therapist not approved.'
            });
        }

        res.json({
            success: true,
            data: therapist
        });

    } catch (error) {
        console.error('Get therapist profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch therapist profile',
            error: error.message
        });
    }
}));

/**
 * @route   PUT /api/therapists/profile/:therapistId
 * @desc    Update therapist profile (for approved therapists)
 * @access  Private
 */
router.put('/profile/:therapistId', therapistUpload, asyncHandler(async (req, res) => {
    try {
        const { therapistId } = req.params;

        // Check if therapist exists and is approved
        const existing = await TherapistModel.getTherapistById(therapistId);
        if (!existing) {
            return res.status(404).json({
                success: false,
                message: 'Therapist not found'
            });
        }

        if (existing.status !== 'approved') {
            return res.status(400).json({
                success: false,
                message: 'Cannot update profile. Therapist not approved.'
            });
        }

        const updateData = { ...req.body };

        // Parse JSON fields
        if (updateData.specialization) updateData.specialization = JSON.parse(updateData.specialization);
        if (updateData.languages_spoken) updateData.languages_spoken = JSON.parse(updateData.languages_spoken);
        if (updateData.certifications) updateData.certifications = JSON.parse(updateData.certifications);
        if (updateData.availability) updateData.availability = JSON.parse(updateData.availability);
        if (updateData.experience_years) updateData.experience_years = parseInt(updateData.experience_years);
        if (updateData.hourly_rate) updateData.hourly_rate = parseFloat(updateData.hourly_rate);

        // Handle file uploads
        if (req.files) {
            if (req.files.nic_attachment) updateData.nic_attachment = req.files.nic_attachment[0].path;
            if (req.files.medical_certificate) updateData.medical_certificate = req.files.medical_certificate[0].path;
            if (req.files.spa_certificate) updateData.spa_certificate = req.files.spa_certificate[0].path;
            if (req.files.therapist_image) updateData.therapist_image = req.files.therapist_image[0].path;
        }

        const result = await TherapistModel.updateTherapist(therapistId, updateData);

        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: result
        });

    } catch (error) {
        console.error('Update therapist profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update profile',
            error: error.message
        });
    }
}));

/**
 * @route   POST /api/therapists/:therapistId/resign
 * @desc    Submit therapist resignation
 * @access  Private
 */
router.post('/:therapistId/resign', asyncHandler(async (req, res) => {
    try {
        const { therapistId } = req.params;
        const { resignation_reason, last_working_date } = req.body;

        if (!resignation_reason || !last_working_date) {
            return res.status(400).json({
                success: false,
                message: 'Resignation reason and last working date are required'
            });
        }

        const result = await TherapistModel.resignTherapist(therapistId, resignation_reason, last_working_date);

        res.json({
            success: true,
            message: 'Resignation submitted successfully',
            data: result
        });

    } catch (error) {
        console.error('Therapist resignation error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to submit resignation',
            error: error.message
        });
    }
}));

// ==================== PUBLIC THERAPIST DIRECTORY ====================

/**
 * @route   GET /api/therapists/directory
 * @desc    Get public therapist directory (approved therapists only)
 * @access  Public
 */
router.get('/directory', asyncHandler(async (req, res) => {
    try {
        const {
            spa_id,
            specialization,
            experience_level,
            city,
            language,
            page = 1,
            limit = 12
        } = req.query;

        const filters = {
            status: 'approved', // Only show approved therapists
            spa_id,
            specialization,
            experience_level,
            city,
            language,
            page: parseInt(page),
            limit: parseInt(limit)
        };

        const therapists = await TherapistModel.getPublicTherapists(filters);

        res.json({
            success: true,
            data: therapists
        });

    } catch (error) {
        console.error('Get therapist directory error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch therapist directory',
            error: error.message
        });
    }
}));

/**
 * @route   GET /api/therapists/directory/:therapistId
 * @desc    Get public therapist profile
 * @access  Public
 */
router.get('/directory/:therapistId', asyncHandler(async (req, res) => {
    try {
        const { therapistId } = req.params;
        const therapist = await TherapistModel.getPublicTherapistProfile(therapistId);

        if (!therapist) {
            return res.status(404).json({
                success: false,
                message: 'Therapist not found or not available'
            });
        }

        res.json({
            success: true,
            data: therapist
        });

    } catch (error) {
        console.error('Get public therapist profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch therapist profile',
            error: error.message
        });
    }
}));

// ==================== SEARCH AND FILTER ROUTES ====================

/**
 * @route   GET /api/therapists/search
 * @desc    Search therapists by various criteria
 * @access  Public
 */
router.get('/search', asyncHandler(async (req, res) => {
    try {
        const {
            query,
            filters,
            sort_by = 'relevance',
            page = 1,
            limit = 12
        } = req.query;

        const searchParams = {
            query,
            filters: filters ? JSON.parse(filters) : {},
            sort_by,
            page: parseInt(page),
            limit: parseInt(limit)
        };

        const results = await TherapistModel.searchTherapists(searchParams);

        res.json({
            success: true,
            data: results
        });

    } catch (error) {
        console.error('Search therapists error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to search therapists',
            error: error.message
        });
    }
}));

/**
 * @route   GET /api/therapists/filters
 * @desc    Get available filter options
 * @access  Public
 */
router.get('/filters', asyncHandler(async (req, res) => {
    try {
        const filters = await TherapistModel.getFilterOptions();

        res.json({
            success: true,
            data: filters
        });

    } catch (error) {
        console.error('Get filter options error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch filter options',
            error: error.message
        });
    }
}));

// ==================== ADMIN ROUTES (AdminLSA) ====================

/**
 * @route   GET /api/therapists/admin/all
 * @desc    Get all therapists for AdminLSA (with optional status filter)
 * @access  Private (AdminLSA only)
 */
router.get('/admin/all', asyncHandler(async (req, res) => {
    try {
        const { status } = req.query;
        console.log('🔍 Fetching therapists with status:', status || 'all');

        console.log('🚀 TherapistModel.getAllTherapists called with status:', status);

        // Since we know the direct database query works, let's try that approach
        const db = require('../config/database');
        let therapists;

        try {
            let query = `
                SELECT t.*, s.name as spa_name, s.owner_fname, s.owner_lname 
                FROM therapists t 
                LEFT JOIN spas s ON t.spa_id = s.id
            `;
            const params = [];

            if (status && status !== 'all') {
                query += ' WHERE t.status = ?';
                params.push(status);
            }

            query += ' ORDER BY t.created_at DESC';

            console.log('� Executing query directly:', query);
            console.log('🔍 Query params:', params);

            const [rows] = await db.execute(query, params);
            therapists = rows;

            console.log('� Raw therapists from direct query:', therapists?.length || 0, 'records');

            if (therapists && therapists.length > 0) {
                console.log('📄 First therapist sample:', JSON.stringify(therapists[0], null, 2));
            }

        } catch (queryError) {
            console.error('❌ Direct query error:', queryError);
            console.error('❌ Query error stack:', queryError.stack);
            throw queryError;
        }

        // Ensure therapists is an array
        if (!therapists || !Array.isArray(therapists)) {
            console.log('⚠️ No therapists found or invalid data type');
            return res.json({
                success: true,
                data: {
                    therapists: [],
                    count: 0
                }
            });
        }

        // Add experience years calculation and format data
        const formattedTherapists = therapists.map(therapist => {
            // Parse name field or use first_name/last_name
            let firstName = therapist.first_name;
            let lastName = therapist.last_name;

            // If first_name and last_name are null, try to parse the name field
            if (!firstName && !lastName && therapist.name) {
                const nameParts = therapist.name.trim().split(' ');
                firstName = nameParts[0] || '';
                lastName = nameParts.slice(1).join(' ') || '';
            }

            const experienceYears = therapist.experience_years || 0;

            return {
                ...therapist,
                fname: firstName || '',
                lname: lastName || '',
                full_name: therapist.name || `${firstName} ${lastName}`.trim(),
                contact: `${therapist.email || ''} ${therapist.phone || ''}`.trim(),
                spa_name: therapist.spa_name || 'Unknown Spa',
                experience_years: experienceYears,
                telno: therapist.phone, // Map phone to telno for consistency
                specialty: therapist.specialization || (Array.isArray(therapist.specializations) ? therapist.specializations.join(', ') : '')
            };
        });

        console.log('✅ Sending response with', formattedTherapists.length, 'therapists');
        res.json({
            success: true,
            data: {
                therapists: formattedTherapists,
                count: formattedTherapists.length
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
 * @route   GET /api/therapists/admin/:id
 * @desc    Get therapist details for AdminLSA
 * @access  Private (AdminLSA only)
 */
router.get('/admin/:id', asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;
        const therapist = await TherapistModel.getTherapistById(id);

        if (!therapist) {
            return res.status(404).json({
                success: false,
                message: 'Therapist not found'
            });
        }

        // Format therapist data to match frontend expectations
        let firstName = therapist.first_name;
        let lastName = therapist.last_name;

        if (!firstName && !lastName && therapist.name) {
            const nameParts = therapist.name.trim().split(' ');
            firstName = nameParts[0] || '';
            lastName = nameParts.slice(1).join(' ') || '';
        }

        const formattedTherapist = {
            ...therapist,
            fname: firstName || '',
            lname: lastName || '',
            full_name: therapist.name || `${firstName} ${lastName}`.trim(),
            telno: therapist.phone,
            specialty: therapist.specialization || (Array.isArray(therapist.specializations) ? therapist.specializations.join(', ') : ''),
            // Map document fields to match expected names
            nic_attachment_path: therapist.nic_attachment,
            medical_certificate_path: therapist.medical_certificate,
            spa_certificate_path: therapist.spa_center_certificate,
            therapist_image_path: therapist.therapist_image
        };

        res.json({
            success: true,
            data: formattedTherapist
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
 * @route   PUT /api/therapists/admin/:id/approve
 * @desc    Approve therapist (AdminLSA)
 * @access  Private (AdminLSA only)
 */
router.put('/admin/:id/approve', asyncHandler(async (req, res) => {
    console.log('🚀 APPROVE ROUTE CALLED');
    console.log('📋 Params:', req.params);
    console.log('📋 Body:', req.body);

    try {
        const { id } = req.params;
        const reviewedBy = req.body.reviewed_by || 'AdminLSA';

        console.log('✅ About to call TherapistModel.approveTherapist with:', { id, reviewedBy });

        // For now, let's do a simple database update instead of the complex method
        const db = require('../config/database');
        const updateQuery = `UPDATE therapists SET status = 'approved' WHERE id = ?`;
        await db.execute(updateQuery, [id]);

        console.log('✅ Therapist approved successfully');

        res.json({
            success: true,
            message: 'Therapist approved successfully'
        });

    } catch (error) {
        console.error('🚨 Approve therapist error:', error);
        console.error('🚨 Error stack:', error.stack);
        res.status(500).json({
            success: false,
            message: 'Failed to approve therapist',
            error: error.message
        });
    }
}));

/**
 * @route   PUT /api/therapists/admin/:id/reject
 * @desc    Reject therapist (AdminLSA)
 * @access  Private (AdminLSA only)
 */
/**
 * @route   PUT /api/therapists/:id/resubmit
 * @desc    Resubmit rejected therapist application
 * @access  AdminSPA
 */
router.put('/:id/resubmit', therapistUpload, asyncHandler(async (req, res) => {
    try {
        const therapistId = req.params.id;
        const spaId = req.body.spa_id;

        console.log('🔄 Resubmitting therapist:', therapistId, 'for SPA:', spaId);

        // Prepare therapist data
        const therapistData = {
            fname: req.body.fname,
            lname: req.body.lname,
            birthday: req.body.birthday,
            nic: req.body.nic,
            telno: req.body.telno,
            email: req.body.email,
            specialty: req.body.specialty
        };

        const result = await TherapistModel.resubmitTherapist(therapistId, therapistData, req.files, spaId);

        res.status(200).json({
            success: true,
            message: 'Therapist application resubmitted successfully',
            data: {
                therapist_id: result,
                status: 'pending'
            }
        });

    } catch (error) {
        console.error('Therapist resubmission error:', error);
        res.status(500).json({
            success: false,
            message: 'Resubmission failed',
            error: error.message
        });
    }
}));

router.put('/admin/:id/reject', asyncHandler(async (req, res) => {
    console.log('🚀 REJECT ROUTE CALLED');
    console.log('📋 Params:', req.params);
    console.log('📋 Body:', req.body);

    try {
        const { id } = req.params;
        const { reason, reviewed_by } = req.body;
        const reviewedBy = reviewed_by || 'AdminLSA';

        if (!reason) {
            return res.status(400).json({
                success: false,
                message: 'Rejection reason is required'
            });
        }

        // Simple database update instead of complex method
        const db = require('../config/database');
        const updateQuery = `UPDATE therapists SET status = 'rejected', reject_reason = ? WHERE id = ?`;
        await db.execute(updateQuery, [reason, id]);

        console.log('✅ Therapist rejected successfully');

        res.json({
            success: true,
            message: 'Therapist rejected successfully'
        });

    } catch (error) {
        console.error('🚨 Reject therapist error:', error);
        console.error('🚨 Error stack:', error.stack);
        res.status(500).json({
            success: false,
            message: 'Failed to reject therapist',
            error: error.message
        });
    }
}));

// ==================== ERROR HANDLING ====================

// Global error handler for this router
router.use((error, req, res, next) => {
    console.error('Therapist Routes Error:', error);

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

module.exports = router;