/**
 * Fix Registration Database Structure
 * This script will:
 * 1. Check all fields being collected from registration form
 * 2. Verify database columns
 * 3. Add missing columns
 * 4. Report unwanted/duplicate columns
 * 5. Fix the INSERT query to save all data properly
 */

const db = require('./backend/config/database');

async function analyzeAndFixDatabase() {
    console.log('🔍 Analyzing Registration Database Structure...\n');

    try {
        // Step 1: Get current spas table structure
        console.log('📊 Current spas table structure:');
        const [columns] = await db.execute('DESCRIBE spas');
        console.log('Total columns:', columns.length);

        const existingColumns = columns.map(col => col.Field);
        console.log('\nExisting columns:', existingColumns.join(', '));

        // Step 2: Define all fields collected from registration form
        console.log('\n\n📝 Fields being collected from registration form:');
        const formFields = {
            // User/Owner details
            'firstName': 'owner_fname',
            'lastName': 'owner_lname',
            'email': 'email',
            'telephone': 'owner_tel',
            'cellphone': 'owner_cell',
            'nicNo': 'owner_nic',

            // Spa details
            'spaName': 'name',
            'spaAddressLine1': 'address_line1',
            'spaAddressLine2': 'address_line2',
            'spaProvince': 'province',
            'spaPostalCode': 'postal_code',
            'district': 'district',
            'policeDivision': 'police_division',
            'spaTelephone': 'spa_tel',
            'spaBRNumber': 'spa_br_number',

            // Document files
            'nicFront': 'nic_front_path',
            'nicBack': 'nic_back_path',
            'brAttachment': 'br_attachment_path',
            'form1Certificate': 'form1_certificate_path',
            'spaPhotosBanner': 'spa_banner_photos_path',
            'otherDocument': 'other_document_path',
            'facilityPhotos': 'facility_photos',  // JSON array
            'professionalCertifications': 'professional_certifications',  // JSON array
            'taxRegistration': 'tax_registration_path',  // MISSING!
            'bankSlip': 'bank_slip_path'  // Goes to payments table
        };

        console.log('Form fields:', Object.keys(formFields).length);

        // Step 3: Check for missing columns
        console.log('\n\n🔍 Checking for missing columns:');
        const missingColumns = [];

        for (const [formField, dbColumn] of Object.entries(formFields)) {
            if (dbColumn === 'bank_slip_path') continue; // This goes to payments table

            if (!existingColumns.includes(dbColumn)) {
                missingColumns.push({ formField, dbColumn });
                console.log(`❌ MISSING: ${dbColumn} (from form field: ${formField})`);
            } else {
                console.log(`✅ EXISTS: ${dbColumn}`);
            }
        }

        // Step 4: Add missing columns
        if (missingColumns.length > 0) {
            console.log(`\n\n🔧 Adding ${missingColumns.length} missing columns...\n`);

            for (const { formField, dbColumn } of missingColumns) {
                let columnDef;

                // Determine column type based on field name
                if (dbColumn.includes('_path')) {
                    columnDef = `${dbColumn} VARCHAR(500)`;
                } else if (dbColumn === 'facility_photos' || dbColumn === 'professional_certifications') {
                    columnDef = `${dbColumn} JSON`;
                } else {
                    columnDef = `${dbColumn} VARCHAR(255)`;
                }

                try {
                    await db.execute(`ALTER TABLE spas ADD COLUMN ${columnDef}`);
                    console.log(`✅ Added column: ${columnDef}`);
                } catch (error) {
                    if (error.code === 'ER_DUP_FIELDNAME') {
                        console.log(`⚠️  Column ${dbColumn} already exists`);
                    } else {
                        console.error(`❌ Error adding ${dbColumn}:`, error.message);
                    }
                }
            }
        } else {
            console.log('\n✅ All required columns exist!');
        }

        // Step 5: Identify duplicate/unwanted columns
        console.log('\n\n🗑️  Potential duplicate/unwanted columns:');
        const unwantedColumns = [
            { column: 'certificate_path', reason: 'Redundant - we have form1_certificate_path' },
            { column: 'phone', reason: 'Redundant - we have spa_tel, owner_tel, owner_cell' },
            { column: 'address', reason: 'Redundant - we have address_line1, address_line2' },
            { column: 'spa_photos_banner', reason: 'Duplicate - we have spa_banner_photos_path' },
            { column: 'spa_photos_banner_path', reason: 'Duplicate - we have spa_banner_photos_path' },
            { column: 'payment_method', reason: 'Should be in payments table only' },
            { column: 'payment_status', reason: 'Should be in payments table only' },
            { column: 'annual_payment_status', reason: 'Should be in payments table only' },
            { column: 'next_payment_date', reason: 'Should be in payments table only' },
            { column: 'annual_fee_paid', reason: 'Should be in payments table only' },
            { column: 'verification_status', reason: 'Duplicate of status column' }
        ];

        unwantedColumns.forEach(({ column, reason }) => {
            if (existingColumns.includes(column)) {
                console.log(`⚠️  ${column}: ${reason}`);
            }
        });

        // Step 6: Check payments table structure
        console.log('\n\n💳 Checking payments table structure:');
        const [paymentColumns] = await db.execute('DESCRIBE payments');
        const paymentColumnNames = paymentColumns.map(col => col.Field);
        console.log('Payment columns:', paymentColumnNames.join(', '));

        if (!paymentColumnNames.includes('bank_slip_path')) {
            console.log('\n🔧 Adding bank_slip_path to payments table...');
            await db.execute('ALTER TABLE payments ADD COLUMN bank_slip_path VARCHAR(500)');
            console.log('✅ Added bank_slip_path to payments table');
        }

        // Step 7: Show the correct INSERT query structure
        console.log('\n\n📋 CORRECT INSERT QUERY FOR REGISTRATION:\n');
        console.log(`
INSERT INTO spas (
    -- Spa Information
    name, spa_br_number, spa_tel,
    
    -- Owner Information  
    owner_fname, owner_lname, owner_email, owner_nic, owner_tel, owner_cell,
    
    -- Address
    address_line1, address_line2, province, postal_code, district, police_division,
    
    -- Documents - File Paths
    nic_front_path, nic_back_path, br_attachment_path,
    form1_certificate_path, spa_banner_photos_path, other_document_path,
    tax_registration_path,
    
    -- Documents - JSON Arrays
    facility_photos, professional_certifications,
    
    -- Status
    status, reference_number
    
) VALUES (
    ?, ?, ?,              -- Spa info
    ?, ?, ?, ?, ?, ?,     -- Owner info
    ?, ?, ?, ?, ?, ?,     -- Address
    ?, ?, ?,              -- NIC & BR docs
    ?, ?, ?,              -- Certificate & banner & other
    ?,                    -- Tax registration
    ?, ?,                 -- JSON arrays
    'pending', ?          -- Status & reference
)
        `);

        // Step 8: Test current registration data
        console.log('\n\n🧪 Testing current registration records:');
        const [spas] = await db.execute(`
            SELECT id, name, reference_number, 
                   owner_fname, owner_lname, owner_email, owner_nic,
                   nic_front_path, nic_back_path, br_attachment_path,
                   form1_certificate_path, spa_banner_photos_path,
                   facility_photos, professional_certifications,
                   tax_registration_path,
                   status, created_at
            FROM spas 
            ORDER BY id DESC 
            LIMIT 5
        `);

        console.log(`Found ${spas.length} recent registrations:`);
        spas.forEach(spa => {
            console.log(`\n📋 ${spa.reference_number} - ${spa.name}`);
            console.log(`   Owner: ${spa.owner_fname} ${spa.owner_lname}`);
            console.log(`   Email: ${spa.owner_email || 'NOT SAVED ❌'}`);
            console.log(`   NIC: ${spa.owner_nic || 'NOT SAVED ❌'}`);
            console.log(`   Documents:`);
            console.log(`     - NIC Front: ${spa.nic_front_path ? '✅' : '❌'}`);
            console.log(`     - NIC Back: ${spa.nic_back_path ? '✅' : '❌'}`);
            console.log(`     - BR: ${spa.br_attachment_path ? '✅' : '❌'}`);
            console.log(`     - Form1: ${spa.form1_certificate_path ? '✅' : '❌'}`);
            console.log(`     - Banner: ${spa.spa_banner_photos_path ? '✅' : '❌'}`);
            console.log(`     - Tax Reg: ${spa.tax_registration_path ? '✅' : '❌'}`);
            console.log(`     - Facility Photos: ${spa.facility_photos ? '✅ ' + JSON.parse(spa.facility_photos).length + ' photos' : '❌'}`);
            console.log(`     - Certifications: ${spa.professional_certifications ? '✅ ' + JSON.parse(spa.professional_certifications).length + ' files' : '❌'}`);
        });

        console.log('\n\n✅ Database analysis complete!');
        console.log('\n📝 Summary:');
        console.log(`   - Total columns in spas table: ${columns.length}`);
        console.log(`   - Missing columns added: ${missingColumns.length}`);
        console.log(`   - Potential unwanted columns: ${unwantedColumns.filter(u => existingColumns.includes(u.column)).length}`);
        console.log(`   - Recent registrations checked: ${spas.length}`);

    } catch (error) {
        console.error('❌ Error analyzing database:', error);
    } finally {
        process.exit(0);
    }
}

// Run the analysis
analyzeAndFixDatabase();
