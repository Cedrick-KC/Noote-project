const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const UPLOAD_DIR = path.join(__dirname, "..", "..", "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).slice(0, 10);
    cb(null, `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${ext}`);
  },
});

// Modest defaults — attachments are meant for worksheets/photos, not video.
// Adjust MAX_UPLOAD_MB in .env if you need larger files.
const MAX_MB = Number(process.env.MAX_UPLOAD_MB) || 10;
const ALLOWED_MIME_PREFIXES = ["image/", "application/pdf", "text/plain",
  "application/msword", "application/vnd.openxmlformats-officedocument"];

const upload = multer({
  storage,
  limits: { fileSize: MAX_MB * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = ALLOWED_MIME_PREFIXES.some((p) => file.mimetype.startsWith(p));
    if (!ok) return cb(new Error("That file type isn't supported (images, PDFs, and common documents only)"));
    cb(null, true);
  },
});

module.exports = { upload, UPLOAD_DIR };
