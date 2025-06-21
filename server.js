require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const https = require('https');
const cors = require('cors');
const cloudinary = require('cloudinary').v2;

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ dest: 'temp/' });

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const baseDir = 'D:/Zones';

function downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        https.get(url, (response) => {
            response.pipe(file);
            file.on('finish', () => file.close(resolve));
        }).on('error', (err) => {
            if (fs.existsSync(dest)) fs.unlinkSync(dest);
            console.error(`❌ Download error: ${dest}`, err.message);
            reject(err);
        });
    });
}

function extractFolderInfo(publicId) {
    const parts = publicId.split('/');
    if (parts.length < 7) return null;
    return {
        zone: parts[1],
        supervisor: parts[2],
        ward: parts[3],
        date: parts[4],
        category: parts[5],
        filename: parts[6],
    };
}

app.post('/upload', upload.single('image'), async (req, res) => {
    const { zone, supervisor, ward, category, date } = req.body;
    const file = req.file;

    if (!zone || !supervisor || !ward || !category || !date || !file) {
        console.error('❌ Missing fields:', { zone, supervisor, ward, category, date, file: file?.originalname });
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const folderPath = `Zones/${zone}/${supervisor}/${ward}/${date}/${category}`;
    console.log('📥 Upload request to:', folderPath);

    try {
        const originalName = path.parse(file.originalname).name;
        const result = await cloudinary.uploader.upload(file.path, {
            folder: folderPath,
            public_id: `${originalName}_${Date.now()}`,
            overwrite: false,
        });

        fs.unlinkSync(file.path);

        const info = extractFolderInfo(result.public_id);
        const ext = path.extname(result.secure_url.split('?')[0]) || '.jpg';

        if (info) {
            const { zone, supervisor, ward, date, category, filename } = info;
            const fullPath = path.join(baseDir, zone, supervisor, ward, date, category);
            const fullFile = path.join(fullPath, `${filename}${ext}`);

            const dailyPath = path.join(baseDir, 'dailywork', date, category);
            const dailyFile = path.join(dailyPath, `${filename}${ext}`);

            fs.mkdirSync(fullPath, { recursive: true });
            fs.mkdirSync(dailyPath, { recursive: true });

            await downloadFile(result.secure_url, fullFile);
            await downloadFile(result.secure_url, dailyFile);

            console.log(`✅ Instant download complete for ${filename}`);
        }

        res.status(200).json({
            message: '✅ Upload and download successful',
            url: result.secure_url,
            cloudinary_path: result.public_id,
        });

    } catch (err) {
        console.error('❌ Upload/download error:', err);
        res.status(500).json({ error: 'Upload/download failed' });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
