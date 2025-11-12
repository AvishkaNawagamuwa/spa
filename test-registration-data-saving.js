/**
 * Test Registration Data Saving
 * This script verifies that all registration form data is being saved to the database
 */

const db = require('./backend/config/database');

async function testRegistrationDataSaving() {
    console.log('🧪 Testing Registration Data Saving...\n');

    try {
        // Get the most recent registration
        console.log('📋 Fetching most recent registration...');
        const [spas] = await db.execute(`
            SELECT 
                -- Spa Information
                id, name, spa_br_number, spa_tel, reference_number,
                
                -- Owner Information (IMPORTANT - Previously missing!)
                owner_fname, owner_lname, owner_email, owner_nic, owner_tel, owner_cell,
                
                -- For backward compatibility
                email, phone,
                
                -- Address
                address, address_line1, address_line2, province, postal_code, district, police_division,
                
                -- Documents - File Paths
                nic_front_path, nic_back_path, br_attachment_path,
                form1_certificate_path, spa_banner_photos_path, 
                tax_registration_path, other_document_path,
                
                -- Documents - JSON Arrays (NEW!)
                facility_photos, professional_certifications,
                
                -- Status & Dates
                status, created_at
            FROM spas 
            ORDER BY id DESC 
            LIMIT 1
        `);

        if (spas.length === 0) {
            console.log('❌ No registrations found in database');
            return;
        }

        const spa = spas[0];
        console.log(`\n✅ Found registration: ${spa.reference_number} - ${spa.name}\n`);

        // Check Owner Information
        console.log('👤 OWNER INFORMATION CHECK:');
        const ownerFields = [
            { field: 'owner_fname', label: 'First Name', value: spa.owner_fname },
            { field: 'owner_lname', label: 'Last Name', value: spa.owner_lname },
            { field: 'owner_email', label: 'Owner Email', value: spa.owner_email },
            { field: 'owner_nic', label: 'Owner NIC', value: spa.owner_nic },
            { field: 'owner_tel', label: 'Owner Tel', value: spa.owner_tel },
            { field: 'owner_cell', label: 'Owner Cell', value: spa.owner_cell }
        ];

        let ownerFieldsOK = 0;
        ownerFields.forEach(({ field, label, value }) => {
            if (value && value.trim() !== '') {
                console.log(`   ✅ ${label}: ${value}`);
                ownerFieldsOK++;
            } else {
                console.log(`   ❌ ${label}: NOT SAVED`);
            }
        });

        // Check Spa Information
        console.log('\n🏢 SPA INFORMATION CHECK:');
        const spaFields = [
            { field: 'name', label: 'Spa Name', value: spa.name },
            { field: 'spa_br_number', label: 'BR Number', value: spa.spa_br_number },
            { field: 'spa_tel', label: 'Spa Tel', value: spa.spa_tel },
            { field: 'district', label: 'District', value: spa.district },
            { field: 'police_division', label: 'Police Division', value: spa.police_division }
        ];

        let spaFieldsOK = 0;
        spaFields.forEach(({ field, label, value }) => {
            if (value && value.trim() !== '') {
                console.log(`   ✅ ${label}: ${value}`);
                spaFieldsOK++;
            } else {
                console.log(`   ❌ ${label}: NOT SAVED`);
            }
        });

        // Check Address
        console.log('\n📍 ADDRESS CHECK:');
        const addressFields = [
            { field: 'address_line1', label: 'Address Line 1', value: spa.address_line1 },
            { field: 'address_line2', label: 'Address Line 2', value: spa.address_line2 },
            { field: 'province', label: 'Province', value: spa.province },
            { field: 'postal_code', label: 'Postal Code', value: spa.postal_code }
        ];

        let addressFieldsOK = 0;
        addressFields.forEach(({ field, label, value }) => {
            if (value && value.trim() !== '') {
                console.log(`   ✅ ${label}: ${value}`);
                addressFieldsOK++;
            } else {
                console.log(`   ⚠️  ${label}: Not provided`);
            }
        });

        // Check Document Files
        console.log('\n📄 DOCUMENT FILES CHECK:');
        const docFields = [
            { field: 'nic_front_path', label: 'NIC Front', value: spa.nic_front_path, required: true },
            { field: 'nic_back_path', label: 'NIC Back', value: spa.nic_back_path, required: true },
            { field: 'br_attachment_path', label: 'BR Attachment', value: spa.br_attachment_path, required: true },
            { field: 'form1_certificate_path', label: 'Form1 Certificate', value: spa.form1_certificate_path, required: true },
            { field: 'spa_banner_photos_path', label: 'Spa Banner', value: spa.spa_banner_photos_path, required: true },
            { field: 'tax_registration_path', label: 'Tax Registration', value: spa.tax_registration_path, required: false },
            { field: 'other_document_path', label: 'Other Document', value: spa.other_document_path, required: false }
        ];

        let docFieldsOK = 0;
        let requiredDocsOK = 0;
        docFields.forEach(({ field, label, value, required }) => {
            if (value && value.trim() !== '') {
                console.log(`   ✅ ${label}: Saved (${value.split('/').pop()})`);
                docFieldsOK++;
                if (required) requiredDocsOK++;
            } else {
                if (required) {
                    console.log(`   ❌ ${label}: NOT SAVED (REQUIRED)`);
                } else {
                    console.log(`   ⚠️  ${label}: Not uploaded (Optional)`);
                }
            }
        });

        // Check JSON Arrays
        console.log('\n📷 MULTIPLE FILES CHECK (JSON Arrays):');

        // Facility Photos
        if (spa.facility_photos) {
            try {
                const facilityPhotos = JSON.parse(spa.facility_photos);
                console.log(`   ✅ Facility Photos: ${facilityPhotos.length} files saved`);
                facilityPhotos.forEach((photo, index) => {
                    console.log(`      ${index + 1}. ${photo.split('/').pop()}`);
                });
            } catch (e) {
                console.log(`   ❌ Facility Photos: Error parsing JSON - ${e.message}`);
            }
        } else {
            console.log(`   ⚠️  Facility Photos: Not uploaded`);
        }

        // Professional Certifications
        if (spa.professional_certifications) {
            try {
                const certifications = JSON.parse(spa.professional_certifications);
                console.log(`   ✅ Professional Certifications: ${certifications.length} files saved`);
                certifications.forEach((cert, index) => {
                    console.log(`      ${index + 1}. ${cert.split('/').pop()}`);
                });
            } catch (e) {
                console.log(`   ❌ Professional Certifications: Error parsing JSON - ${e.message}`);
            }
        } else {
            console.log(`   ⚠️  Professional Certifications: Not uploaded`);
        }

        // Check payment record
        console.log('\n💳 PAYMENT RECORD CHECK:');
        const [payments] = await db.execute(`
            SELECT id, payment_type, payment_method, amount, payment_status, 
                   reference_number, bank_slip_path, created_at
            FROM payments 
            WHERE spa_id = ? 
            ORDER BY id DESC 
            LIMIT 1
        `, [spa.id]);

        if (payments.length > 0) {
            const payment = payments[0];
            console.log(`   ✅ Payment record exists:`);
            console.log(`      - Type: ${payment.payment_type}`);
            console.log(`      - Method: ${payment.payment_method}`);
            console.log(`      - Amount: Rs. ${payment.amount}`);
            console.log(`      - Status: ${payment.payment_status}`);
            console.log(`      - Reference: ${payment.reference_number}`);
            if (payment.bank_slip_path) {
                console.log(`      - Bank Slip: ${payment.bank_slip_path.split('/').pop()}`);
            }
        } else {
            console.log(`   ❌ No payment record found for this spa`);
        }

        // Summary
        console.log('\n' + '='.repeat(70));
        console.log('📊 REGISTRATION DATA COMPLETENESS SUMMARY');
        console.log('='.repeat(70));
        console.log(`   Owner Information: ${ownerFieldsOK}/6 fields saved`);
        console.log(`   Spa Information: ${spaFieldsOK}/5 fields saved`);
        console.log(`   Address: ${addressFieldsOK}/4 fields saved`);
        console.log(`   Required Documents: ${requiredDocsOK}/5 files saved`);
        console.log(`   Optional Documents: ${docFieldsOK - requiredDocsOK}/2 files saved`);
        console.log(`   Payment Record: ${payments.length > 0 ? 'Created ✅' : 'Missing ❌'}`);

        const totalRequired = 6 + 5 + 4 + 5; // Owner + Spa + Address + Required Docs
        const totalSaved = ownerFieldsOK + spaFieldsOK + addressFieldsOK + requiredDocsOK;
        const completeness = ((totalSaved / totalRequired) * 100).toFixed(1);

        console.log(`\n   OVERALL COMPLETENESS: ${completeness}% (${totalSaved}/${totalRequired} required fields)`);

        if (completeness >= 95) {
            console.log('\n✅ EXCELLENT! All required data is being saved correctly!');
        } else if (completeness >= 80) {
            console.log('\n⚠️  GOOD! Most data is being saved, but some fields are missing.');
        } else {
            console.log('\n❌ CRITICAL! Many required fields are NOT being saved!');
        }
        console.log('='.repeat(70));

    } catch (error) {
        console.error('❌ Error testing registration:', error);
    } finally {
        process.exit(0);
    }
}

// Run the test
testRegistrationDataSaving();
