const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure all upload directories exist
const ensureDirectories = () => {
  const dirs = [
    path.join(__dirname, '../uploads'),
    path.join(__dirname, '../uploads/BlogIMG'),
    path.join(__dirname, '../uploads/spas'),
    path.join(__dirname, '../uploads/spas/nic'),
    path.join(__dirname, '../uploads/spas/business'),
    path.join(__dirname, '../uploads/spas/form1'),
    path.join(__dirname, '../uploads/spas/misc'),
    path.join(__dirname, '../uploads/spas/banners'),
    path.join(__dirname, '../uploads/spas/facility'),
    path.join(__dirname, '../uploads/spas/certifications'),
    path.join(__dirname, '../uploads/spas/general'),
    path.join(__dirname, '../uploads/therapists')
  ];

  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

// Initialize directories
ensureDirectories();

// Configure storage for different file types
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let uploadPath = path.join(__dirname, '../uploads/');

    // Determine upload path based on file field
    if (file.fieldname.includes('facility_photos') || file.fieldname.includes('facilityPhotos')) {
      uploadPath = path.join(__dirname, '../uploads/spas/facility/');
    } else if (file.fieldname.includes('professional_certifications') || file.fieldname.includes('professionalCertifications')) {
      uploadPath = path.join(__dirname, '../uploads/spas/certifications/');
    } else if (file.fieldname.startsWith('nic_') || file.fieldname.startsWith('nic') || file.fieldname === 'nicFront' || file.fieldname === 'nicBack') {
      uploadPath = path.join(__dirname, '../uploads/spas/nic/');
    } else if (file.fieldname.includes('br_') || file.fieldname === 'brAttachment') {
      uploadPath = path.join(__dirname, '../uploads/spas/business/');
    } else if (file.fieldname.includes('tax_') || file.fieldname === 'taxRegistration') {
      uploadPath = path.join(__dirname, '../uploads/spas/misc/');
    } else if (file.fieldname.includes('other_doc') || file.fieldname === 'otherDocument') {
      uploadPath = path.join(__dirname, '../uploads/spas/misc/');
    } else if (file.fieldname.includes('form1') || file.fieldname === 'form1Certificate') {
      uploadPath = path.join(__dirname, '../uploads/spas/form1/');
    } else if (file.fieldname.includes('banner') || file.fieldname === 'spaPhotosBanner') {
      uploadPath = path.join(__dirname, '../uploads/spas/banners/');
    } else if (file.fieldname.includes('therapist') || file.fieldname.includes('medical') || file.fieldname.includes('certificate')) {
      uploadPath = path.join(__dirname, '../uploads/therapists/');
    } else if (file.fieldname === 'media') {
      uploadPath = path.join(__dirname, '../uploads/BlogIMG/');
    } else {
      uploadPath = path.join(__dirname, '../uploads/spas/');
    }

    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    const baseName = file.fieldname + '-' + uniqueSuffix;
    cb(null, baseName + extension);
  }
});

// File filter for different file types
const fileFilter = (req, file, cb) => {
  const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png'];
  const allowedDocTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  const allowedMediaTypes = ['image/jpeg', 'image/jpg', 'image/png', 'video/mp4', 'video/avi', 'video/mov', 'audio/mp3', 'audio/wav'];

  // Blog media files
  if (file.fieldname === 'media') {
    if (allowedMediaTypes.includes(file.mimetype) || file.originalname.endsWith('.mp3')) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type. Please upload image, video, or audio files.'), false);
    }
  }
  // Image files (photos, NIC images, therapist images)
  else if (file.fieldname.includes('photo') || file.fieldname.includes('image') || file.fieldname.includes('nic_front') || file.fieldname.includes('nic_back')) {
    if (allowedImageTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, JPG, and PNG image files are allowed for photos!'), false);
    }
  }
  // Document files (certificates, attachments)
  else if (file.fieldname.includes('attachment') || file.fieldname.includes('certificate') || file.fieldname.includes('br_') || file.fieldname.includes('tax_') || file.fieldname.includes('doc')) {
    if ([...allowedImageTypes, ...allowedDocTypes].includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, DOC, DOCX, JPEG, JPG, and PNG files are allowed for documents!'), false);
    }
  }
  else {
    cb(null, true);
  }
};

// Configure multer with enhanced settings
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    files: 20 // Maximum 20 files per request
  }
});

// Specific upload configurations
const spaUpload = upload.fields([
  { name: 'nic_front', maxCount: 1 },
  { name: 'nic_back', maxCount: 1 },
  { name: 'br_attachment', maxCount: 1 },
  { name: 'tax_registration', maxCount: 1 },
  { name: 'other_doc', maxCount: 1 },
  { name: 'facility_photos', maxCount: 10 },
  { name: 'professional_certifications', maxCount: 5 },
  // For resubmission (camelCase field names from frontend)
  { name: 'nicFront', maxCount: 1 },
  { name: 'nicBack', maxCount: 1 },
  { name: 'brAttachment', maxCount: 1 },
  { name: 'taxRegistration', maxCount: 1 },
  { name: 'otherDocument', maxCount: 1 },
  { name: 'facilityPhotos', maxCount: 10 },
  { name: 'professionalCertifications', maxCount: 5 }
]);

const therapistUpload = upload.fields([
  { name: 'nic_attachment', maxCount: 1 },
  { name: 'medical_certificate', maxCount: 1 },
  { name: 'spa_certificate', maxCount: 1 },
  { name: 'therapist_image', maxCount: 1 },
  // AdminSPA compatible field names
  { name: 'nicFile', maxCount: 1 },
  { name: 'medicalFile', maxCount: 1 },
  { name: 'certificate', maxCount: 1 },
  { name: 'certificateFile', maxCount: 1 },
  { name: 'profileImage', maxCount: 1 }
]);

// Blog media upload (maintaining existing functionality)
const blogUpload = upload.single('media');

module.exports = {
  upload,
  spaUpload,
  therapistUpload,
  blogUpload,
  ensureDirectories
};