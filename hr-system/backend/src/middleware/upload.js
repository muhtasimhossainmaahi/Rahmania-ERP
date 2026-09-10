const fs = require('fs');
const path = require('path');
const multer = require('multer');

const UPLOAD_ROOT = path.join(__dirname, '..', '..', process.env.UPLOAD_DIR || 'uploads');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function storageFor(subdir) {
  const dir = path.join(UPLOAD_ROOT, subdir);
  ensureDir(dir);
  return multer.diskStorage({
    destination: (req, file, cb) => cb(null, dir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const safeExt = /^\.[a-z0-9]{1,10}$/.test(ext) ? ext : '';
      cb(null, `${req.params.id || 'file'}-${Date.now()}${safeExt}`);
    },
  });
}

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);

function fileFilter(req, file, cb) {
  if (!ALLOWED_MIME.has(file.mimetype)) {
    return cb(new Error('Unsupported file type'));
  }
  cb(null, true);
}

const uploadPhoto = multer({
  storage: storageFor('photos'),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

const uploadDocument = multer({
  storage: storageFor('documents'),
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

function publicUrl(absolutePath) {
  const relative = path.relative(UPLOAD_ROOT, absolutePath).split(path.sep).join('/');
  return `/uploads/${relative}`;
}

module.exports = { uploadPhoto, uploadDocument, publicUrl, UPLOAD_ROOT };
