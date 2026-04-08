// Upload Controller
const path = require('path');
const { sendSuccess, sendError } = require('../utils/response');

// Handles file upload and returns the accessible path
exports.uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return sendError(res, 'No file uploaded', 400);
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    sendSuccess(res, { path: fileUrl }, 'File uploaded successfully', 201);
  } catch (error) {
    console.error('Upload file error:', error);
    sendError(res, 'Failed to upload file', 500);
  }
};
