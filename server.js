require('dotenv').config(); // Load .env variables

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Use /tmp/uploads for Render (temp storage works there)
const UPLOAD_DIR = process.env.UPLOAD_DIR || '/tmp/uploads';
const PORT = process.env.PORT || 3000;

// Log the upload path for debug
console.log(`Uploads will be saved to: ${UPLOAD_DIR}`);

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const { zone = 'default_zone', supervisor = 'default_supervisor' } = req.body;
        const uploadPath = path.join(UPLOAD_DIR, zone, supervisor);

        try {
            fs.mkdirSync(uploadPath, { recursive: true });
            cb(null, uploadPath);
        } catch (err) {
            console.error('Failed to create upload path:', err);
            cb(err, uploadPath);
        }
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({ storage });

app.post('/upload', upload.single('image'), (req, res) => {
    console.log('Upload endpoint hit');
    console.log('Request body:', req.body);
    console.log('Uploaded file:', req.file);

    if (!req.file) {
        return res.status(400).send({ message: 'No file received' });
    }

    res.send({
        message: 'File uploaded successfully',
        savedAs: req.file.filename,
        path: req.file.path
    });
});

app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
});
