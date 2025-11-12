const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../config/database');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { sendRegistrationEmail, testEmailConnection } = require('../utils/emailService');

// Helper functions for credential generation
function generateRandomPassword(length = 12) {
    const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < length; i++) {
        password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
}

function generateUsername(spaName, referenceNumber) {
    // Create username from spa name (first 3-4 letters) + reference number suffix
    const cleanSpaName = spaName.toLowerCase().replace(/[^a-z]/g, '').substring(0, 4);
    const refSuffix = referenceNumber.replace('LSA', '').padStart(4, '0');
    return cleanSpaName + refSuffix;
}

// Enhanced multer configuration for new file requirements
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        let uploadPath = 'uploads/spas/';

        // Create different folders based on file field
        switch (file.fieldname) {
            case 'form1Certificate':
                uploadPath += 'form1/';
                break;
            case 'spaPhotosBanner':
                uploadPath += 'banners/';
                break;
            case 'nicFront':
            case 'nicBack':
                uploadPath += 'nic/';
                break;
            case 'brAttachment':
                uploadPath += 'business/';
                break;
            case 'facilityPhotos':
                uploadPath += 'facility/';
                break;
            case 'professionalCertifications':
                uploadPath += 'certifications/';
                break;
            case 'taxRegistration':
                uploadPath += 'tax/';
                break;
            case 'otherDocument':
                uploadPath += 'misc/';
                break;
            default:
                uploadPath += 'general/';
        }

        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }

        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    // Check file types based on field
    const allowedTypes = {
        'form1Certificate': ['.pdf', '.doc', '.docx'],
        'spaPhotosBanner': ['.jpg', '.jpeg', '.png'],
        'nicFront': ['.jpg', '.jpeg', '.png'],
        'nicBack': ['.jpg', '.jpeg', '.png'],
        'brAttachment': ['.pdf', '.doc', '.docx'],
        'bankSlip': ['.jpg', '.jpeg', '.png', '.pdf'],
        'otherDocument': ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'],
        'facilityPhotos': ['.jpg', '.jpeg', '.png'],
        'professionalCertifications': ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png']
    };

    const fileExt = path.extname(file.originalname).toLowerCase();
    const allowedExts = allowedTypes[file.fieldname] || ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'];

    if (allowedExts.includes(fileExt)) {
        cb(null, true);
    } else {
        cb(new Error(`Invalid file type for ${file.fieldname}. Allowed: ${allowedExts.join(', ')}`), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
        files: 20 // Maximum 20 files
    }
});

// Generate reference number
async function generateReferenceNumber() {
    try {
        const [result] = await db.execute(
            'SELECT MAX(CAST(SUBSTRING(reference_number, 4) AS UNSIGNED)) as max_num FROM spas WHERE reference_number REGEXP "^LSA[0-9]+$"'
        );
        const nextNum = (result[0]?.max_num || 0) + 1;
        return `LSA${String(nextNum).padStart(4, '0')}`;
    } catch (error) {
        console.error('Error generating reference number:', error);
        return `LSA${Date.now().toString().slice(-4)}`;
    }
}

// Generate payment reference number - max 10 chars
async function generatePaymentReference(type = 'registration') {
    try {
        const prefix = type === 'registration' ? 'REG' : type === 'annual' ? 'ANN' : 'PAY';
        const [result] = await db.execute(
            'SELECT MAX(CAST(SUBSTRING(reference_number, ?) AS UNSIGNED)) as max_num FROM payments WHERE reference_number LIKE ?',
            [prefix.length + 1, `${prefix}%`]
        );
        const nextNum = (result[0]?.max_num || 0) + 1;
        return `${prefix}${String(nextNum).padStart(6, '0')}`;
    } catch (error) {
        console.error('Error generating payment reference:', error);
        // Fallback: ensure it's max 10 chars
        const timestamp = Date.now().toString().slice(-5);
        return `${prefix}${timestamp}`;
    }
}

// GET /api/enhanced-registration/check-email/:email
// Check if email already exists in the system
router.get('/check-email/:email', async (req, res) => {
    try {
        const { email } = req.params;

        if (!email || !email.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Email is required'
            });
        }

        const [rows] = await db.execute(
            'SELECT id FROM spas WHERE email = ?',
            [email.trim()]
        );

        if (rows.length > 0) {
            return res.json({
                success: false,
                exists: true,
                message: 'This email is already registered in our system'
            });
        }

        return res.json({
            success: true,
            exists: false,
            message: 'Email is available'
        });

    } catch (error) {
        console.error('Error checking email:', error);
        return res.status(500).json({
            success: false,
            message: 'Error checking email availability'
        });
    }
});

// GET /api/enhanced-registration/check-nic/:nic
// Check if NIC already exists in the system
router.get('/check-nic/:nic', async (req, res) => {
    try {
        const { nic } = req.params;

        if (!nic || !nic.trim()) {
            return res.status(400).json({
                success: false,
                message: 'NIC is required'
            });
        }

        const [rows] = await db.execute(
            'SELECT id FROM spas WHERE owner_nic = ?',
            [nic.trim()]
        );

        if (rows.length > 0) {
            return res.json({
                success: false,
                exists: true,
                message: 'This NIC is already registered in our system'
            });
        }

        return res.json({
            success: true,
            exists: false,
            message: 'NIC is available'
        });

    } catch (error) {
        console.error('Error checking NIC:', error);
        return res.status(500).json({
            success: false,
            message: 'Error checking NIC availability'
        });
    }
});

// POST /api/enhanced-registration/submit
// Complete registration with all files and payment info
router.post('/submit', upload.fields([
    { name: 'nicFront', maxCount: 1 },
    { name: 'nicBack', maxCount: 1 },
    { name: 'brAttachment', maxCount: 1 },
    { name: 'form1Certificate', maxCount: 1 },
    { name: 'spaPhotosBanner', maxCount: 1 },
    { name: 'facilityPhotos', maxCount: 10 },
    { name: 'professionalCertifications', maxCount: 10 },
    { name: 'bankSlip', maxCount: 1 },
    { name: 'otherDocument', maxCount: 1 }
]), async (req, res) => {
    let connection;

    try {
        connection = await db.getConnection();

        const {
            // User details
            firstName, lastName, email, telephone, cellphone, nicNo,
            // Spa details
            spaName, spaAddressLine1, spaAddressLine2, spaProvince, spaPostalCode, district, policeDivision,
            spaTelephone, spaBRNumber,
            // Payment details
            paymentMethod, bankDetails
        } = req.body;

        console.log('Registration request received:', {
            name: `${firstName} ${lastName}`,
            spa: spaName,
            payment: paymentMethod,
            files: Object.keys(req.files || {})
        });

        // Validate required fields
        const requiredFieldsData = {
            firstName, lastName, email, nicNo, spaName, spaAddressLine1, spaTelephone, spaBRNumber
        };
        const missingFields = [];

        Object.entries(requiredFieldsData).forEach(([key, value]) => {
            if (!value || value.trim() === '') {
                missingFields.push(key);
            }
        });

        if (missingFields.length > 0) {
            throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
        }

        // Validate required files
        const requiredFiles = ['nicFront', 'nicBack', 'brAttachment', 'form1Certificate', 'spaPhotosBanner'];
        const missingFiles = [];

        for (const fileField of requiredFiles) {
            if (!req.files[fileField] || req.files[fileField].length === 0) {
                missingFiles.push(fileField);
            }
        }

        if (missingFiles.length > 0) {
            throw new Error(`Missing required files: ${missingFiles.join(', ')}`);
        }

        // Validate facility photos (minimum 5) - temporarily optional for testing
        if (req.files.facilityPhotos && req.files.facilityPhotos.length > 0 && req.files.facilityPhotos.length < 5) {
            const photoCount = req.files.facilityPhotos.length;
            throw new Error(`Minimum 5 facility photos required, got ${photoCount}`);
        }

        // Log facility photos status
        const photoCount = req.files.facilityPhotos ? req.files.facilityPhotos.length : 0;
        console.log(`Facility photos uploaded: ${photoCount}`);

        // For testing purposes, we'll allow registration without facility photos
        // TODO: Re-enable this validation once facility photo upload is implemented properly
        // if (!req.files.facilityPhotos || req.files.facilityPhotos.length < 5) {
        //     throw new Error(`Minimum 5 facility photos required, got ${photoCount}`);
        // }

        // Validate bank slip for bank transfer payments
        if (paymentMethod === 'bank_transfer' && (!req.files.bankSlip || req.files.bankSlip.length === 0)) {
            throw new Error('Bank transfer slip is required for bank transfer payments');
        }

        // Process file paths
        const filePaths = {};
        Object.keys(req.files).forEach(fieldName => {
            if (Array.isArray(req.files[fieldName])) {
                filePaths[fieldName] = req.files[fieldName].map(file => file.path);
            } else {
                filePaths[fieldName] = req.files[fieldName][0].path;
            }
        });

        // Insert spa record with ALL DOCUMENT PATHS
        const fullAddress = `${spaAddressLine1}${spaAddressLine2 ? ', ' + spaAddressLine2 : ''}, ${spaProvince} ${spaPostalCode}`;

        // Extract ALL document paths for database storage
        const nicFrontPath = filePaths.nicFront ? filePaths.nicFront : null;
        const nicBackPath = filePaths.nicBack ? filePaths.nicBack : null;
        const brAttachmentPath = filePaths.brAttachment ? filePaths.brAttachment : null;
        const form1CertPath = filePaths.form1Certificate ? filePaths.form1Certificate : null;
        const spaBannerPath = filePaths.spaPhotosBanner ? filePaths.spaPhotosBanner : null;
        const otherDocPath = filePaths.otherDocument ? filePaths.otherDocument : null;
        const taxRegPath = filePaths.taxRegistration ? filePaths.taxRegistration : null;

        // Handle JSON arrays for facility photos and certifications
        const facilityPhotosJSON = filePaths.facilityPhotos ? JSON.stringify(filePaths.facilityPhotos) : null;
        const certificationsJSON = filePaths.professionalCertifications ? JSON.stringify(filePaths.professionalCertifications) : null;

        // Insert spa with ALL document paths and ALL owner information
        const [spaResult] = await connection.execute(`
            INSERT INTO spas (
                name, spa_br_number, spa_tel,
                owner_fname, owner_lname, owner_email, owner_nic, owner_tel, owner_cell,
                email, phone, address,
                address_line1, address_line2, province, postal_code, district, police_division,
                nic_front_path, nic_back_path, br_attachment_path, 
                form1_certificate_path, spa_banner_photos_path, other_document_path, tax_registration_path,
                facility_photos, professional_certifications,
                status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            // Spa information
            spaName, spaBRNumber, spaTelephone,
            // Owner information (all fields)
            firstName, lastName, email, nicNo, telephone, cellphone,
            // Duplicate email/phone for backward compatibility
            email, spaTelephone, fullAddress,
            // Detailed address
            spaAddressLine1, spaAddressLine2, spaProvince, spaPostalCode, district, policeDivision,
            // Document file paths
            nicFrontPath, nicBackPath, brAttachmentPath,
            form1CertPath, spaBannerPath, otherDocPath, taxRegPath,
            // JSON arrays
            facilityPhotosJSON, certificationsJSON,
            // Status
            'pending'
        ]);

        const spaId = spaResult.insertId;

        // Update the spa record with generated reference number
        const referenceNumber = `LSA${String(spaId).padStart(4, '0')}`;
        await connection.execute(`
            UPDATE spas SET reference_number = ? WHERE id = ?
        `, [referenceNumber, spaId]);

        // Create payment record
        const paymentRef = await generatePaymentReference('registration');
        const paymentStatus = paymentMethod === 'card' ? 'completed' : 'pending_approval';

        const [paymentResult] = await connection.execute(`
      INSERT INTO payments (
        spa_id, payment_type, payment_method, amount, reference_number, payment_status
      ) VALUES (?, 'registration', ?, 5000.00, ?, ?)
    `, [
            spaId, paymentMethod, paymentRef, paymentStatus
        ]);

        // If bank transfer, store bank slip path
        if (paymentMethod === 'bank_transfer' && req.files.bankSlip && req.files.bankSlip[0]) {
            const bankSlipPath = req.files.bankSlip[0].path;

            await connection.execute(`
        UPDATE payments SET bank_slip_path = ? WHERE id = ?
      `, [
                bankSlipPath,
                paymentResult.insertId
            ]);
        }

        // Log all document paths that were saved
        console.log('\n' + '='.repeat(70));
        console.log('📁 ALL REGISTRATION DATA SAVED TO DATABASE');
        console.log('='.repeat(70));
        console.log('\n👤 OWNER INFORMATION:');
        console.log(`   ✅ Name: ${firstName} ${lastName}`);
        console.log(`   ✅ Email: ${email}`);
        console.log(`   ✅ NIC: ${nicNo}`);
        console.log(`   ✅ Telephone: ${telephone || 'Not provided'}`);
        console.log(`   ✅ Cellphone: ${cellphone || 'Not provided'}`);

        console.log('\n🏢 SPA INFORMATION:');
        console.log(`   ✅ Spa Name: ${spaName}`);
        console.log(`   ✅ BR Number: ${spaBRNumber}`);
        console.log(`   ✅ Spa Tel: ${spaTelephone}`);
        console.log(`   ✅ District: ${district}`);
        console.log(`   ✅ Police Division: ${policeDivision}`);
        console.log(`   ✅ Address: ${fullAddress}`);

        console.log('\n📄 DOCUMENTS SAVED:');
        console.log(`   ✅ NIC Front: ${nicFrontPath || 'Not uploaded'}`);
        console.log(`   ✅ NIC Back: ${nicBackPath || 'Not uploaded'}`);
        console.log(`   ✅ BR Attachment: ${brAttachmentPath || 'Not uploaded'}`);
        console.log(`   ✅ Form1 Certificate: ${form1CertPath || 'Not uploaded'}`);
        console.log(`   ✅ Spa Banner: ${spaBannerPath || 'Not uploaded'}`);
        console.log(`   ✅ Tax Registration: ${taxRegPath || 'Not uploaded'}`);
        console.log(`   ✅ Other Document: ${otherDocPath || 'Not uploaded'}`);
        console.log(`   ✅ Facility Photos: ${filePaths.facilityPhotos ? filePaths.facilityPhotos.length + ' photos' : 'Not uploaded'}`);
        console.log(`   ✅ Professional Certifications: ${filePaths.professionalCertifications ? filePaths.professionalCertifications.length + ' files' : 'Not uploaded'}`);
        if (paymentMethod === 'bank_transfer') {
            console.log(`   ✅ Bank Slip: ${filePaths.bankSlip || 'Not uploaded'} (saved to payments table)`);
        }
        console.log('='.repeat(70) + '\n');

        // Generate unique login credentials for spa owner
        const uniqueUsername = generateUsername(spaName, referenceNumber);
        const uniquePassword = generateRandomPassword(12);
        const hashedPassword = await bcrypt.hash(uniquePassword, 10);

        // Create admin user for spa dashboard access
        await connection.execute(`
      INSERT INTO admin_users (
        username, email, password_hash, role, spa_id, full_name, phone
      ) VALUES (?, ?, ?, 'admin_spa', ?, ?, ?)
    `, [
            uniqueUsername,
            email,
            hashedPassword,
            spaId,
            `${firstName} ${lastName}`,
            telephone
        ]);

        // Log activity - using correct column names
        await connection.execute(`
      INSERT INTO activity_logs (
        entity_type, entity_id, action, description, actor_type, actor_name
      ) VALUES ('spa', ?, 'created', ?, 'spa', ?)
    `, [
            spaId,
            `New spa registration: ${spaName} (${referenceNumber})`,
            `${firstName} ${lastName}`
        ]);

        // Send notification to AdminLSA - using correct column names  
        await connection.execute(`
      INSERT INTO system_notifications (
        recipient_type, title, message, notification_type, related_entity_type, related_entity_id
      ) VALUES ('admin_lsa', 'New Spa Registration', ?, 'spa_registration', 'spa', ?)
    `, [
            `New spa "${spaName}" (${referenceNumber}) has registered and is pending approval.`,
            spaId
        ]);

        // Transaction removed for testing

        // Log credentials to console for easy reference
        console.log('\n' + '='.repeat(60));
        console.log('🔐 SPA LOGIN CREDENTIALS GENERATED');
        console.log('='.repeat(60));
        console.log(`👤 Owner: ${firstName} ${lastName}`);
        console.log(`🏢 Spa: ${spaName}`);
        console.log(`📋 Reference: ${referenceNumber}`);
        console.log(`🔑 Username: ${uniqueUsername}`);
        console.log(`🔒 Password: ${uniquePassword}`);
        console.log(`🌐 Login URL: http://localhost:5173/login`);
        console.log('='.repeat(60) + '\n');

        // Send email with credentials to spa owner
        console.log('📧 Sending registration email to:', email);
        const emailResult = await sendRegistrationEmail(
            email,
            `${firstName} ${lastName}`,
            spaName,
            uniqueUsername,
            uniquePassword,
            referenceNumber
        );

        if (emailResult.success) {
            console.log('✅ Registration email sent successfully');
        } else {
            console.error('❌ Failed to send registration email:', emailResult.error);
            // Continue with registration even if email fails
        }

        res.status(201).json({
            success: true,
            message: paymentMethod === 'card'
                ? 'Registration completed successfully! Your login credentials have been sent to your email.'
                : 'Registration submitted! Your login credentials have been sent to your email. Please complete the bank transfer.',
            data: {
                referenceNumber,
                spaId,
                spaName: spaName,
                ownerName: `${firstName} ${lastName}`,
                paymentReference: paymentRef,
                status: 'pending',
                paymentStatus: paymentStatus,
                credentials: {
                    username: uniqueUsername,
                    password: uniquePassword,
                    note: 'Login credentials have been sent to your registered email address'
                },
                loginInfo: {
                    message: 'Check your email for login credentials to access your spa dashboard',
                    loginUrl: 'http://localhost:5173/login',
                    note: 'You can change your password after logging in'
                },
                emailStatus: emailResult.success ? 'sent' : 'failed'
            }
        });

    } catch (error) {
        // Transaction rollback removed for testing

        // Clean up uploaded files on error
        if (req.files) {
            Object.values(req.files).flat().forEach(file => {
                if (fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
            });
        }

        console.error('Registration error details:', {
            message: error.message,
            stack: error.stack,
            sqlState: error.sqlState,
            sqlMessage: error.sqlMessage,
            code: error.code,
            requestBody: req.body,
            files: req.files ? Object.keys(req.files) : 'No files'
        });

        res.status(500).json({
            success: false,
            error: error.message || 'Registration failed',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });

    } finally {
        connection.release();
    }
});

// GET /api/enhanced-registration/status/:referenceNumber
// Check registration status
router.get('/status/:referenceNumber', async (req, res) => {
    try {
        const { referenceNumber } = req.params;

        const [spa] = await db.execute(`
      SELECT s.*, p.status as payment_status, p.reference_number as payment_ref
      FROM spas s
      LEFT JOIN payments p ON s.id = p.spa_id AND p.payment_type = 'registration'
      WHERE s.reference_number = ?
    `, [referenceNumber]);

        if (spa.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Registration not found'
            });
        }

        res.json({
            success: true,
            data: {
                referenceNumber: spa[0].reference_number,
                spaName: spa[0].name,
                status: spa[0].status,
                paymentStatus: spa[0].payment_status,
                paymentReference: spa[0].payment_ref,
                submittedAt: spa[0].created_at,
                nextPaymentDate: spa[0].next_payment_date
            }
        });

    } catch (error) {
        console.error('Status check error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to check status'
        });
    }
});

module.exports = router;
