const express = require('express');
const router = express.Router();
const NotificationModel = require('../models/NotificationModel');
const ActivityLogModel = require('../models/ActivityLogModel');
const db = require('../config/database');
const multer = require('multer');
const path = require('path');
const jwt = require('jsonwebtoken');
const fs = require('fs');

// Configure multer for payment transfer slip uploads
const uploadDir = path.join(__dirname, '../../uploads/payment-slips');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'transfer-slip-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
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

// Middleware to verify AdminSPA authentication
const verifyAdminSPA = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ success: false, error: 'Access denied. No token provided.' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production');

        // Verify user exists and is AdminSPA
        const [user] = await db.execute(
            'SELECT * FROM admin_users WHERE id = ? AND role = "admin_spa" AND is_active = 1',
            [decoded.id]
        );

        if (user.length === 0) {
            return res.status(403).json({ success: false, error: 'Access denied. AdminSPA role required.' });
        }

        req.user = user[0];
        next();
    } catch (error) {
        res.status(401).json({ success: false, error: 'Invalid token.' });
    }
};

// Check payment status and overdue
router.get('/payment-status', verifyAdminSPA, async (req, res) => {
    try {
        if (!req.user.spa_id) {
            return res.status(400).json({ success: false, error: 'No spa associated with this account' });
        }

        // Get spa information and latest payment details
        const [spa] = await db.execute(`
      SELECT 
        s.*,
        p.payment_status,
        p.payment_plan,
        p.payment_method,
        p.created_at as payment_date,
        CASE 
          WHEN s.next_payment_date < CURDATE() AND s.payment_status != 'paid' THEN true
          ELSE false
        END as is_overdue
      FROM spas s
      LEFT JOIN payments p ON s.id = p.spa_id 
      WHERE s.id = ?
      ORDER BY p.created_at DESC
      LIMIT 1
    `, [req.user.spa_id]);

        if (spa.length === 0) {
            return res.status(404).json({ success: false, error: 'Spa not found' });
        }

        const spaData = spa[0];

        // Check if payment can be made based on next payment date
        // Users can make payments only when current date >= next_payment_date
        let canMakePayment = true;

        if (spaData.next_payment_date) {
            const nextPaymentDate = new Date(spaData.next_payment_date);
            const currentDate = new Date();
            canMakePayment = currentDate >= nextPaymentDate;
        }

        // Check if payment is overdue (5+ days past next payment date)
        let isOverdue = false;
        if (spaData.next_payment_date) {
            const nextPaymentDate = new Date(spaData.next_payment_date);
            const currentDate = new Date();
            const daysPastDue = (currentDate - nextPaymentDate) / (1000 * 60 * 60 * 24);
            isOverdue = daysPastDue > 5;

            // Auto-update spa status to unverified if 5+ days overdue
            if (isOverdue && spaData.status === 'verified') {
                await db.execute(`
                    UPDATE spas SET status = 'unverified' WHERE id = ?
                `, [req.user.spa_id]);
                spaData.status = 'unverified'; // Update local data
            }
        }



        res.json({
            success: true,
            data: {
                spa_id: spaData.id,
                spa_name: spaData.name,
                reference_number: spaData.reference_number,
                status: spaData.status,
                payment_status: spaData.payment_status,
                currentPlan: spaData.payment_plan,
                next_payment_date: spaData.next_payment_date,
                can_make_payment: canMakePayment,
                is_overdue: isOverdue,
                access_restricted: isOverdue,
                payment_method: spaData.payment_method,
                payment_date: spaData.payment_date
            }
        });

    } catch (error) {
        console.error('Error checking payment status:', error);
        res.status(500).json({ success: false, error: 'Failed to check payment status' });
    }
});

// Get payment plans with enhanced options
router.get('/payment-plans', verifyAdminSPA, async (req, res) => {
    try {
        const plans = [
            {
                id: 'monthly',
                name: 'Monthly',
                price: 5000,
                currency: 'LKR',
                duration: '1 Month',
                description: 'Perfect for startups',
                features: [
                    'Unlimited Therapist Management',
                    'Basic Analytics',
                    'Email Support',
                    'Mobile App Access',
                    'Standard Processing'
                ],
                popular: false
            },
            {
                id: 'quarterly',
                name: 'Quarterly',
                price: 14000,
                currency: 'LKR',
                duration: '3 Months',
                description: 'Balanced growth solution',
                original_price: 15000,
                savings: 1000,
                features: [
                    'Everything in Monthly',
                    'Advanced Analytics',
                    'Priority Support',
                    'Bulk Operations',
                    'Custom Reports'
                ],
                popular: false
            },
            {
                id: 'half-yearly',
                name: 'Half-Yearly',
                price: 25000,
                currency: 'LKR',
                duration: '6 Months',
                description: 'Seasonal growth boost',
                original_price: 30000,
                savings: 5000,
                features: [
                    'Everything in Quarterly',
                    'Advanced Integrations',
                    'Dedicated Support',
                    'API Access',
                    'Training Sessions'
                ],
                popular: false
            },
            {
                id: 'annual',
                name: 'Annual',
                price: 45000,
                currency: 'LKR',
                duration: '12 Months',
                description: 'Best value with premium features',
                original_price: 60000,
                savings: 15000,
                discount_percentage: 25,
                features: [
                    'Everything in Half-Yearly',
                    'Premium Analytics Dashboard',
                    '24/7 Priority Support',
                    'White-label Options',
                    'Advanced Automation',
                    'Compliance Tools'
                ],
                popular: true,
                badge: 'MOST POPULAR'
            }
        ];

        res.json({
            success: true,
            data: plans
        });

    } catch (error) {
        console.error('Error fetching payment plans:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch payment plans' });
    }
});

// Process card payment (JSON)
router.post('/process-card-payment', verifyAdminSPA, async (req, res) => {
    try {
        console.log('💳 Card payment request received');
        console.log('📋 Request body:', req.body);

        const { plan_id, payment_method, card_details } = req.body;

        if (!req.user.spa_id) {
            return res.status(400).json({ success: false, error: 'No spa associated with this account' });
        }

        if (!plan_id || payment_method !== 'card') {
            return res.status(400).json({
                success: false,
                error: 'Invalid card payment request'
            });
        }

        // Check if payment is allowed based on next payment date
        const [spaCheck] = await db.execute(`
            SELECT next_payment_date FROM spas WHERE id = ?
        `, [req.user.spa_id]);

        if (spaCheck.length > 0 && spaCheck[0].next_payment_date) {
            const nextPaymentDate = new Date(spaCheck[0].next_payment_date);
            const currentDate = new Date();
            if (currentDate < nextPaymentDate) {
                const nextDateFormatted = nextPaymentDate.toLocaleDateString('en-GB', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });

                return res.status(400).json({
                    success: false,
                    error: 'Payment not available before next payment date',
                    details: {
                        message: 'You cannot make another payment until your next payment date arrives.',
                        next_payment_date: nextDateFormatted,
                        current_date: currentDate.toLocaleDateString('en-GB'),
                        days_remaining: Math.ceil((nextPaymentDate - currentDate) / (1000 * 60 * 60 * 24))
                    }
                });
            }
        }

        // Get plan details - using only allowed payment_type enum values
        const planPrices = {
            'monthly': { amount: 5000, duration_months: 1, type: 'annual', plan: 'Monthly' },
            'quarterly': { amount: 14000, duration_months: 3, type: 'annual', plan: 'Quarterly' },
            'half-yearly': { amount: 25000, duration_months: 6, type: 'annual', plan: 'Half-Yearly' },
            'annual': { amount: 45000, duration_months: 12, type: 'annual', plan: 'Annual' }
        };

        const plan = planPrices[plan_id];
        if (!plan) {
            return res.status(400).json({ success: false, error: 'Invalid plan selected' });
        }

        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            // Create payment record
            const [paymentResult] = await connection.execute(`
                INSERT INTO payments (
                    spa_id, reference_number, payment_type, payment_plan, payment_method, 
                    amount, payment_status, bank_transfer_approved
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                req.user.spa_id,
                `CARD_${Date.now()}`,
                plan.type,
                plan.plan,
                payment_method,
                plan.amount,
                'completed',
                true
            ]);

            const paymentId = paymentResult.insertId;

            // For card payments, update spa payment status immediately
            const nextPaymentDate = new Date();
            nextPaymentDate.setMonth(nextPaymentDate.getMonth() + plan.duration_months);

            await connection.execute(`
                UPDATE spas SET 
                    payment_status = 'paid',
                    next_payment_date = ?,
                    annual_fee_paid = true
                WHERE id = ?
            `, [nextPaymentDate, req.user.spa_id]);

            await connection.commit();

            res.json({
                success: true,
                message: `${plan.plan} plan payment processed successfully! Your payment plan is now fixed for the complete year.`,
                data: {
                    payment_id: paymentId,
                    status: 'completed',
                    amount: plan.amount,
                    payment_plan: plan.plan,
                    next_payment_date: nextPaymentDate,
                    access_restored: true
                }
            });

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }

    } catch (error) {
        console.error('Error processing card payment:', error);
        res.status(500).json({ success: false, error: 'Failed to process card payment' });
    }
});

// Process bank transfer payment (Form Data)
router.post('/process-bank-transfer', verifyAdminSPA, upload.single('transfer_proof'), async (req, res) => {
    try {
        console.log('🏦 Bank transfer request received');
        console.log('📋 Request body:', req.body);
        console.log('📁 File uploaded:', req.file ? req.file.filename : 'No file');
        console.log('👤 User SPA ID:', req.user.spa_id);

        const { plan_id, payment_method } = req.body;

        if (!req.user.spa_id) {
            return res.status(400).json({ success: false, error: 'No spa associated with this account' });
        }

        if (!plan_id || payment_method !== 'bank_transfer') {
            return res.status(400).json({
                success: false,
                error: 'Invalid bank transfer request'
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'Bank transfer slip file is required'
            });
        }

        // Check if payment is allowed based on next payment date
        const [spaCheck] = await db.execute(`
            SELECT next_payment_date FROM spas WHERE id = ?
        `, [req.user.spa_id]);

        if (spaCheck.length > 0 && spaCheck[0].next_payment_date) {
            const nextPaymentDate = new Date(spaCheck[0].next_payment_date);
            const currentDate = new Date();
            if (currentDate < nextPaymentDate) {
                const nextDateFormatted = nextPaymentDate.toLocaleDateString('en-GB', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });

                return res.status(400).json({
                    success: false,
                    error: 'Payment not available before next payment date',
                    details: {
                        message: 'You cannot make another payment until your next payment date arrives.',
                        next_payment_date: nextDateFormatted,
                        current_date: currentDate.toLocaleDateString('en-GB'),
                        days_remaining: Math.ceil((nextPaymentDate - currentDate) / (1000 * 60 * 60 * 24))
                    }
                });
            }
        }

        // Get plan details - using only allowed payment_type enum values  
        const planPrices = {
            'monthly': { amount: 5000, duration_months: 1, type: 'annual', plan: 'Monthly' },
            'quarterly': { amount: 14000, duration_months: 3, type: 'annual', plan: 'Quarterly' },
            'half-yearly': { amount: 25000, duration_months: 6, type: 'annual', plan: 'Half-Yearly' },
            'annual': { amount: 45000, duration_months: 12, type: 'annual', plan: 'Annual' }
        };

        const plan = planPrices[plan_id];
        if (!plan) {
            console.log('❌ Invalid plan selected:', plan_id);
            return res.status(400).json({ success: false, error: 'Invalid plan selected' });
        }

        console.log('📋 Plan details:', plan);
        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            // Create payment record with file
            let transferSlipPath = null;
            if (req.file) {
                transferSlipPath = `uploads/payment-slips/${req.file.filename}`;
            }

            const [paymentResult] = await connection.execute(`
                INSERT INTO payments (
                    spa_id, reference_number, payment_type, payment_plan, payment_method, 
                    amount, payment_status, bank_slip_path, bank_transfer_approved
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                req.user.spa_id,
                `BANK_${Date.now()}`,
                plan.type,
                plan.plan,
                payment_method,
                plan.amount,
                'pending_approval',
                transferSlipPath,
                false
            ]);

            const paymentId = paymentResult.insertId;

            // For bank transfer payments, also set the next_payment_date to lock the plan
            // even though it's pending approval
            const nextPaymentDate = new Date();
            nextPaymentDate.setMonth(nextPaymentDate.getMonth() + plan.duration_months);

            await connection.execute(`
                UPDATE spas SET 
                    next_payment_date = ?
                WHERE id = ?
            `, [nextPaymentDate.toISOString().split('T')[0], req.user.spa_id]);

            await connection.commit();

            res.json({
                success: true,
                message: `Bank transfer payment submitted for ${plan.plan} plan. Your payment plan is now fixed for the complete year. Awaiting LSA approval.`,
                data: {
                    payment_id: paymentId,
                    status: 'pending_approval',
                    amount: plan.amount,
                    payment_plan: plan.plan,
                    transfer_slip_uploaded: !!transferSlipPath,
                    bank_details: {
                        bank_name: 'Bank of Ceylon',
                        account_name: 'Lanka Spa Association',
                        account_number: '123-456-789-001',
                        branch: 'Colombo Main Branch',
                        reference: `SPA${req.user.spa_id}_${paymentId}`
                    },
                    instructions: [
                        'Your bank transfer slip has been uploaded successfully',
                        'Payment plan is fixed for the complete year',
                        'Payment verification usually takes 1-2 business days',
                        'You will receive email confirmation once approved',
                        'Your spa access will be activated upon approval'
                    ]
                }
            });

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }

    } catch (error) {
        console.error('Error processing bank transfer:', error);
        res.status(500).json({ success: false, error: 'Failed to process bank transfer' });
    }
});

// Get payment history
router.get('/payment-history', verifyAdminSPA, async (req, res) => {
    try {
        if (!req.user.spa_id) {
            return res.status(400).json({ success: false, error: 'No spa associated with this account' });
        }

        const [payments] = await db.execute(`
      SELECT 
        id,
        payment_type,
        payment_method,
        amount,
        status,
        bank_transfer_approved,
        approval_date,
        approved_by,
        created_at,
        reference_number
      FROM payments
      WHERE spa_id = ?
      ORDER BY created_at DESC
    `, [req.user.spa_id]);

        res.json({
            success: true,
            data: payments
        });

    } catch (error) {
        console.error('Error fetching payment history:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch payment history' });
    }
});

// Request annual payment approval (for bank transfers)
router.post('/request-annual-payment-approval', verifyAdminSPA, async (req, res) => {
    try {
        const { payment_id, bank_slip_reference } = req.body;

        if (!req.user.spa_id) {
            return res.status(400).json({ success: false, error: 'No spa associated with this account' });
        }

        // Update payment with bank slip reference
        const [result] = await db.execute(`
      UPDATE payments SET 
        bank_slip_path = ?,
        updated_at = NOW()
      WHERE id = ? AND spa_id = ? AND payment_method = 'bank_transfer'
    `, [bank_slip_reference, payment_id, req.user.spa_id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: 'Payment not found' });
        }

        // Create notification for AdminLSA
        await db.execute(`
      INSERT INTO system_notifications (
        recipient_type, title, message, type, related_entity_type, related_entity_id
      ) VALUES (?, ?, ?, ?, ?, ?)
    `, [
            'lsa',
            'New Bank Transfer Payment Approval Request',
            `Spa ${req.user.spa_id} has submitted annual payment via bank transfer for approval`,
            'info',
            'payment',
            payment_id
        ]);

        res.json({
            success: true,
            message: 'Annual payment approval request submitted successfully'
        });

    } catch (error) {
        console.error('Error submitting payment approval request:', error);
        res.status(500).json({ success: false, error: 'Failed to submit approval request' });
    }
});

// Get spa dashboard stats
router.get('/dashboard/stats', verifyAdminSPA, async (req, res) => {
    try {
        if (!req.user.spa_id) {
            return res.status(400).json({ success: false, error: 'No spa associated with this account' });
        }

        const [stats] = await db.execute(`
      SELECT 
        (SELECT COUNT(*) FROM therapists WHERE spa_id = ? AND status = 'approved') as approved_therapists,
        (SELECT COUNT(*) FROM therapists WHERE spa_id = ? AND status = 'pending') as pending_therapists,
        (SELECT COUNT(*) FROM therapists WHERE spa_id = ? AND status = 'rejected') as rejected_therapists,
        (SELECT COUNT(*) FROM therapists WHERE spa_id = ? AND status IN ('resigned', 'terminated')) as inactive_therapists
    `, [req.user.spa_id, req.user.spa_id, req.user.spa_id, req.user.spa_id]);

        res.json({
            success: true,
            data: stats[0]
        });

    } catch (error) {
        console.error('Error fetching spa dashboard stats:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch dashboard stats' });
    }
});

// Check access restrictions based on payment status
router.get('/access-check', verifyAdminSPA, async (req, res) => {
    try {
        if (!req.user.spa_id) {
            return res.status(400).json({ success: false, error: 'No spa associated with this account' });
        }

        const [spa] = await db.execute(`
      SELECT 
        next_payment_date,
        payment_status,
        CASE 
          WHEN next_payment_date < CURDATE() AND payment_status != 'paid' THEN true
          ELSE false
        END as is_overdue
      FROM spas
      WHERE id = ?
    `, [req.user.spa_id]);

        if (spa.length === 0) {
            return res.status(404).json({ success: false, error: 'Spa not found' });
        }

        const spaData = spa[0];
        const isOverdue = spaData.is_overdue;

        res.json({
            success: true,
            data: {
                access_allowed: !isOverdue,
                is_overdue: isOverdue,
                payment_status: spaData.payment_status,
                next_payment_date: spaData.next_payment_date,
                restricted_message: isOverdue ? 'Payment is overdue. Please complete payment to restore full access.' : null,
                allowed_sections: isOverdue ? ['payment'] : ['dashboard', 'therapists', 'payment', 'profile', 'settings']
            }
        });

    } catch (error) {
        console.error('Error checking access:', error);
        res.status(500).json({ success: false, error: 'Failed to check access' });
    }
});

// Get rejected payments for resubmission
router.get('/rejected-payments', verifyAdminSPA, async (req, res) => {
    try {
        if (!req.user.spa_id) {
            return res.status(400).json({ success: false, error: 'No spa associated with this account' });
        }

        const [rejectedPayments] = await db.execute(`
            SELECT 
                id,
                payment_type,
                payment_method,
                payment_plan,
                amount,
                payment_status,
                rejection_reason,
                bank_slip_path,
                created_at,
                updated_at
            FROM payments 
            WHERE spa_id = ? 
                AND payment_type = 'annual' 
                AND payment_status = 'rejected' 
                AND payment_method = 'bank_transfer'
            ORDER BY updated_at DESC
        `, [req.user.spa_id]);

        res.json({
            success: true,
            data: rejectedPayments
        });

    } catch (error) {
        console.error('Error fetching rejected payments:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch rejected payments' });
    }
});

// Resubmit rejected bank transfer payment
router.post('/resubmit-payment', verifyAdminSPA, upload.single('transfer_proof'), async (req, res) => {
    try {
        console.log('🔄 Payment resubmission request received');
        console.log('📋 Request body:', req.body);
        console.log('📁 File uploaded:', req.file ? req.file.filename : 'No file');

        const { payment_id } = req.body;

        if (!req.user.spa_id) {
            return res.status(400).json({ success: false, error: 'No spa associated with this account' });
        }

        if (!payment_id) {
            return res.status(400).json({ success: false, error: 'Payment ID is required' });
        }

        if (!req.file) {
            return res.status(400).json({ success: false, error: 'New bank transfer slip is required' });
        }

        // Verify the payment belongs to this spa and is rejected
        const [existingPayment] = await db.execute(`
            SELECT * FROM payments 
            WHERE id = ? AND spa_id = ? AND payment_type = 'annual' 
                AND payment_status = 'rejected' AND payment_method = 'bank_transfer'
        `, [payment_id, req.user.spa_id]);

        if (existingPayment.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Rejected annual bank transfer payment not found'
            });
        }

        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            // Update the payment with new slip and reset status to pending_approval
            let newSlipPath = null;
            if (req.file) {
                newSlipPath = `uploads/payment-slips/${req.file.filename}`;
            }

            const [updateResult] = await connection.execute(`
                UPDATE payments SET 
                    bank_slip_path = ?,
                    payment_status = 'pending_approval',
                    rejection_reason = NULL,
                    updated_at = NOW()
                WHERE id = ? AND spa_id = ?
            `, [newSlipPath, payment_id, req.user.spa_id]);

            if (updateResult.affectedRows === 0) {
                throw new Error('Failed to update payment');
            }

            await connection.commit();

            res.json({
                success: true,
                message: `Payment resubmitted successfully! Your ${existingPayment[0].payment_plan} plan payment is now pending approval again.`,
                data: {
                    payment_id: payment_id,
                    status: 'pending_approval',
                    new_slip_uploaded: !!newSlipPath,
                    payment_plan: existingPayment[0].payment_plan,
                    amount: existingPayment[0].amount
                }
            });

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }

    } catch (error) {
        console.error('Error resubmitting payment:', error);
        res.status(500).json({ success: false, error: 'Failed to resubmit payment' });
    }
});

module.exports = router;