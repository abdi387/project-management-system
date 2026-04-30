const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '../uploads/progress-reports');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log('✅ Created progress report upload directory:', uploadDir);
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `progress-${req.user.id}-${uniqueSuffix}${ext}`);
  }
});

const allowedFileTypes = /pdf|doc|docx|ppt|pptx|xlsx|xls|txt/;

const fileFilter = (req, file, cb) => {
  const extname = allowedFileTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedFileTypes.test(file.mimetype);

  if (extname || mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Only document files are allowed (pdf, doc, docx, ppt, pptx, xls, xlsx, txt).'));
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB limit
    files: 1
  },
  fileFilter
});

module.exports = upload;
