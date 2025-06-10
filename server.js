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

const UPLOAD_DIR = process.env.UPLOAD_DIR || 'D:/uploads';
const PORT = process.env.PORT || 3000;

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const { zone = 'default_zone', supervisor = 'default_supervisor' } = req.body;

        const uploadPath = path.join(UPLOAD_DIR, zone, supervisor);
        fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({ storage });

app.post('/upload', upload.single('file'), (req, res) => {
    res.send({
        message: 'File uploaded successfully',
        savedAs: req.file.filename,
        path: req.file.path
    });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
