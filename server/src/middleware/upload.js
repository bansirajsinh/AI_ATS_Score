const multer = require('multer');
const path = require('path');
const { AppError } = require('./errorHandler');

const ALLOWED_MIMES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
];

const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.txt'];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();

  if (!ALLOWED_MIMES.includes(file.mimetype)) {
    return cb(
      new AppError(415, 'UNSUPPORTED_FILE_TYPE',
        `Unsupported file type: ${file.mimetype}. Only PDF, DOCX, and TXT files are accepted.`),
      false
    );
  }

  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return cb(
      new AppError(415, 'UNSUPPORTED_FILE_EXTENSION',
        `Unsupported file extension: ${ext}. Only .pdf, .docx, and .txt files are accepted.`),
      false
    );
  }

  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },
});

module.exports = { upload, ALLOWED_MIMES, ALLOWED_EXTENSIONS, MAX_FILE_SIZE };