const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { success, error, badRequest } = require('../utils/response');

// Configure multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '..', '..', 'uploads');
    
    // Create uploads directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const userId = req.user.userId;
    const timestamp = Date.now();
    const ext = path.extname(file.originalname).toLowerCase();
    
    // Only allow safe extensions
    const allowedExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf'];
    if (!allowedExts.includes(ext)) {
      return cb(new Error('File type tidak diizinkan. Hanya JPG, PNG, GIF, WebP, dan PDF yang diperbolehkan.'));
    }
    
    // Generate safe filename (truncate if too long)
    const sanitizedName = `user_${userId}_${timestamp}`;
    cb(null, `${sanitizedName}${ext}`);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('File type tidak diizinkan. Hanya JPG, PNG, GIF, WebP, dan PDF yang diperbolehkan.'), false);
  }
};

// Multer configuration
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: fileFilter
});

// Upload file
function uploadFile(req, res) {
  try {
    const uploadSingle = upload.single('file');
    
    uploadSingle(req, res, function (err) {
      if (err) {
        if (err.message.includes('File type')) {
          return badRequest(res, err.message);
        }
        if (err.code === 'LIMIT_FILE_SIZE') {
          return badRequest(res, 'Ukuran file terlalu besar. Maksimal 5MB');
        }
        return error(res, 'Gagal mengupload file', 500);
      }
      
      if (!req.file) {
        return badRequest(res, 'File diperlukan');
      }
      
      const fileUrl = `/uploads/${req.file.filename}`;
      
      return success(res, 'File berhasil diupload', {
        filename: req.file.filename,
        url: fileUrl,
        size: req.file.size,
        mimetype: req.file.mimetype
      }, 201);
    });
  } catch (err) {
    console.error('Upload error:', err.message);
    return error(res, 'Terjadi kesalahan saat mengupload file', 500);
  }
}

module.exports = {
  uploadFile
};
