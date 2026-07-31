const logger = require('../../utils/logger');

/**
 * S3/R2 Client — for file storage.
 *
 * For local dev, we store files on disk instead of calling S3/R2.
 * In production, swap this for the real @aws-sdk/client-s3 implementation.
 */
const fs = require('fs');
const path = require('path');

const UPLOAD_DIR = path.resolve(__dirname, '../../../../uploads');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

/**
 * Upload file buffer to storage (local disk for dev).
 * Returns the file URL/path.
 */
async function uploadFile(buffer, fileName, mimeType) {
  try {
    const safeName = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const filePath = path.join(UPLOAD_DIR, safeName);
    fs.writeFileSync(filePath, buffer);

    logger.info({ fileName: safeName, size: buffer.length }, 'File uploaded to local storage');
    return `/uploads/${safeName}`;
  } catch (err) {
    logger.error({ err }, 'File upload failed');
    throw err;
  }
}

/**
 * Delete a file from storage.
 */
async function deleteFile(fileUrl) {
  try {
    const fileName = path.basename(fileUrl);
    const filePath = path.join(UPLOAD_DIR, fileName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      logger.info({ fileName }, 'File deleted from local storage');
    }
  } catch (err) {
    logger.error({ err }, 'File deletion failed');
  }
}

module.exports = { uploadFile, deleteFile };