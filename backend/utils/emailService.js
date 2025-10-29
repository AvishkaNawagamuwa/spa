const nodemailer = require('nodemailer');
require('dotenv').config();

// Create reusable transporter object using SMTP transport
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

/**
 * Send email to spa owner with login credentials after registration
 * @param {string} toEmail - Recipient's email address
 * @param {string} ownerName - Full name of spa owner
 * @param {string} spaName - Name of the spa
 * @param {string} username - Generated username
 * @param {string} password - Generated password
 * @param {string} referenceNumber - Spa reference number
 */
const sendRegistrationEmail = async (toEmail, ownerName, spaName, username, password, referenceNumber) => {
    try {
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: toEmail,
            subject: "SPA Registration Successful - LSA Portal Access",
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h2 style="color: #001F3F; margin: 0;">Lanka Spa Association</h2>
                        <p style="color: #666; margin: 5px 0;">SPA Registration Portal</p>
                    </div>
                    
                    <h3 style="color: #28a745;">Registration Successful!</h3>
                    
                    <p>Dear <strong>${ownerName}</strong>,</p>
                    
                    <p>Congratulations! Your spa registration has been successfully submitted to the Lanka Spa Association portal.</p>
                    
                    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
                        <h4 style="color: #001F3F; margin-top: 0;">Registration Details:</h4>
                        <p><strong>Spa Name:</strong> ${spaName}</p>
                        <p><strong>Reference Number:</strong> ${referenceNumber}</p>
                        <p><strong>Status:</strong> Pending Approval</p>
                    </div>
                    
                    <div style="background-color: #e7f3ff; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #007bff;">
                        <h4 style="color: #001F3F; margin-top: 0;">🔐 Your Login Credentials</h4>
                        <p><strong>Username:</strong> <code style="background: #f1f1f1; padding: 2px 5px; border-radius: 3px;">${username}</code></p>
                        <p><strong>Password:</strong> <code style="background: #f1f1f1; padding: 2px 5px; border-radius: 3px;">${password}</code></p>
                        <p style="color: #dc3545; font-size: 14px; margin-top: 15px;">
                            <strong>⚠️ Important:</strong> Please save these credentials securely. You can change your password after logging in.
                        </p>
                    </div>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="http://localhost:5173/login" 
                           style="background-color: #001F3F; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; display: inline-block;">
                            Login to LSA Portal
                        </a>
                    </div>
                    
                    <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107;">
                        <h4 style="color: #856404; margin-top: 0;">📋 Next Steps:</h4>
                        <ul style="color: #856404; margin: 0; padding-left: 20px;">
                            <li>Your application is currently under review by the LSA administration team</li>
                            <li>You will receive an email notification once your application is approved or if any additional information is required</li>
                            <li>You can track your application status by logging into the portal</li>
                        </ul>
                    </div>
                    
                    <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
                    
                    <p style="color: #666; font-size: 14px;">
                        If you have any questions or need assistance, please contact our support team.<br>
                        This email was sent automatically. Please do not reply to this email.
                    </p>
                    
                    <div style="text-align: center; margin-top: 30px; color: #666; font-size: 12px;">
                        <p>Best regards,<br>
                        <strong>Lanka Spa Association Administration Team</strong></p>
                        <p>© 2025 Lanka Spa Association. All rights reserved.</p>
                    </div>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Registration email sent successfully to:', toEmail);
        console.log('📧 Message ID:', info.messageId);
        return { success: true, messageId: info.messageId };

    } catch (error) {
        console.error('❌ Failed to send registration email:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Send email when spa status is updated (approved/rejected)
 * @param {string} toEmail - Recipient's email address
 * @param {string} ownerName - Full name of spa owner
 * @param {string} spaName - Name of the spa
 * @param {string} status - New status (approved/rejected)
 * @param {string} username - Login username
 * @param {string} password - Login password (for approved spas)
 * @param {string} reason - Reason for rejection (if applicable)
 */
const sendStatusUpdateEmail = async (toEmail, ownerName, spaName, status, username, password, reason = null) => {
    try {
        const isApproved = status.toLowerCase() === 'approved';
        const statusColor = isApproved ? '#28a745' : '#dc3545';
        const statusText = isApproved ? 'Approved' : 'Rejected';

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: toEmail,
            subject: `Spa Registration ${statusText} - LSA Portal`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h2 style="color: #001F3F; margin: 0;">Lanka Spa Association</h2>
                        <p style="color: #666; margin: 5px 0;">SPA Registration Portal</p>
                    </div>
                    
                    <h3 style="color: ${statusColor};">Registration ${statusText}!</h3>
                    
                    <p>Dear <strong>${ownerName}</strong>,</p>
                    
                    <p>Your spa registration application has been <strong style="color: ${statusColor};">${status}</strong>.</p>
                    
                    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
                        <h4 style="color: #001F3F; margin-top: 0;">Spa Details:</h4>
                        <p><strong>Spa Name:</strong> ${spaName}</p>
                        <p><strong>Status:</strong> <span style="color: ${statusColor};">${statusText}</span></p>
                    </div>
                    
                    ${isApproved ? `
                        <div style="background-color: #d4edda; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #28a745;">
                            <h4 style="color: #155724; margin-top: 0;">🎉 Welcome to LSA!</h4>
                            <p style="color: #155724;">Your spa is now approved and you can access all portal features.</p>
                        </div>
                        
                        <div style="background-color: #e7f3ff; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #007bff;">
                            <h4 style="color: #001F3F; margin-top: 0;">🔐 Your Login Credentials</h4>
                            <p><strong>Username:</strong> <code style="background: #f1f1f1; padding: 2px 5px; border-radius: 3px;">${username}</code></p>
                            <p><strong>Password:</strong> <code style="background: #f1f1f1; padding: 2px 5px; border-radius: 3px;">${password}</code></p>
                        </div>
                    ` : `
                        <div style="background-color: #f8d7da; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #dc3545;">
                            <h4 style="color: #721c24; margin-top: 0;">❌ Application Rejected</h4>
                            ${reason ? `<p style="color: #721c24;"><strong>Reason:</strong> ${reason}</p>` : ''}
                            <p style="color: #721c24;">Please review the requirements and resubmit your application if needed.</p>
                        </div>
                    `}
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="http://localhost:5173/login" 
                           style="background-color: #001F3F; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; display: inline-block;">
                            ${isApproved ? 'Access Your Dashboard' : 'Login to Portal'}
                        </a>
                    </div>
                    
                    <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
                    
                    <p style="color: #666; font-size: 14px;">
                        If you have any questions or need assistance, please contact our support team.<br>
                        This email was sent automatically. Please do not reply to this email.
                    </p>
                    
                    <div style="text-align: center; margin-top: 30px; color: #666; font-size: 12px;">
                        <p>Best regards,<br>
                        <strong>Lanka Spa Association Administration Team</strong></p>
                        <p>© 2025 Lanka Spa Association. All rights reserved.</p>
                    </div>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Status update email sent successfully to: ${toEmail}`);
        console.log('📧 Message ID:', info.messageId);
        return { success: true, messageId: info.messageId };

    } catch (error) {
        console.error('❌ Failed to send status update email:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Send payment status notification email to SPA owner
 * @param {string} toEmail - Recipient's email address
 * @param {string} ownerName - Full name of spa owner
 * @param {string} spaName - Name of the spa
 * @param {string} status - Payment status (approved/rejected)
 * @param {string} paymentType - Type of payment (annual/registration)
 * @param {number} amount - Payment amount
 * @param {string} reason - Reason for rejection (if applicable)
 */
const sendPaymentStatusEmail = async (toEmail, ownerName, spaName, status, paymentType, amount, reason = null) => {
    try {
        const isApproved = status.toLowerCase() === 'approved';
        const statusColor = isApproved ? '#28a745' : '#dc3545';
        const statusText = isApproved ? 'Approved' : 'Rejected';

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: toEmail,
            subject: `Payment ${statusText} - ${paymentType.charAt(0).toUpperCase() + paymentType.slice(1)} Payment - LSA Portal`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
                    <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                        
                        <!-- Header -->
                        <div style="text-align: center; margin-bottom: 30px;">
                            <h1 style="color: #001F3F; margin: 0; font-size: 28px;">Lanka Spa Association</h1>
                            <p style="color: #666; margin: 5px 0 0 0; font-size: 16px;">Payment Notification</p>
                        </div>
                        
                        <!-- Greeting -->
                        <div style="margin-bottom: 30px;">
                            <h2 style="color: #333; margin: 0 0 10px 0;">Dear ${ownerName},</h2>
                            <p style="color: #666; line-height: 1.6; margin: 0;">
                                We are writing to inform you about the status of your ${paymentType} payment for ${spaName}.
                            </p>
                        </div>
                        
                        <!-- Payment Details -->
                        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #001F3F;">
                            <h4 style="color: #001F3F; margin-top: 0;">Payment Details:</h4>
                            <p><strong>Spa Name:</strong> ${spaName}</p>
                            <p><strong>Payment Type:</strong> ${paymentType.charAt(0).toUpperCase() + paymentType.slice(1)} Payment</p>
                            <p><strong>Amount:</strong> LKR ${parseFloat(amount).toLocaleString()}</p>
                            <p><strong>Status:</strong> <span style="color: ${statusColor}; font-weight: bold;">${statusText}</span></p>
                        </div>
                        
                        ${isApproved ? `
                            <div style="background-color: #d4edda; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #28a745;">
                                <h4 style="color: #155724; margin-top: 0;">🎉 Payment Approved!</h4>
                                <p style="color: #155724;">Your ${paymentType} payment has been successfully approved and processed. Your services will be activated shortly.</p>
                            </div>
                        ` : `
                            <div style="background-color: #f8d7da; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #dc3545;">
                                <h4 style="color: #721c24; margin-top: 0;">❌ Payment Rejected</h4>
                                ${reason ? `<p style="color: #721c24;"><strong>Reason:</strong> ${reason}</p>` : ''}
                                <p style="color: #721c24;">Please review the reason and submit a corrected payment if needed.</p>
                            </div>
                        `}
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="http://localhost:5173/login" 
                               style="background-color: #001F3F; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; display: inline-block;">
                                Access Your Dashboard
                            </a>
                        </div>
                        
                        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
                        
                        <p style="color: #666; font-size: 14px;">
                            If you have any questions about this payment or need assistance, please contact our support team.<br>
                            This email was sent automatically. Please do not reply to this email.
                        </p>
                        
                        <div style="text-align: center; margin-top: 30px; color: #666; font-size: 12px;">
                            <p>Best regards,<br>
                            <strong>Lanka Spa Association Financial Team</strong></p>
                            <p>© 2025 Lanka Spa Association. All rights reserved.</p>
                        </div>
                    </div>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Payment status email sent successfully to: ${toEmail}`);
        console.log('📧 Message ID:', info.messageId);
        return { success: true, messageId: info.messageId };

    } catch (error) {
        console.error('❌ Failed to send payment status email:', error);
        return { success: false, error: error.message };
    }
};

// Test email connection
const testEmailConnection = async () => {
    try {
        await transporter.verify();
        console.log('✅ Email server connection verified successfully');
        return true;
    } catch (error) {
        console.error('❌ Email server connection failed:', error);
        return false;
    }
};

module.exports = {
    sendRegistrationEmail,
    sendStatusUpdateEmail,
    sendPaymentStatusEmail,
    testEmailConnection
};