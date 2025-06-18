require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const cloudinary = require('cloudinary').v2;

const app = express();
app.use(cors());
app.use(express.json());

// 🔧 Cloudinary configuration
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ⚙️ Temp file storage setup
const upload = multer({ dest: 'temp/' });

// 🚀 Upload endpoint
app.post('/upload', upload.single('image'), async (req, res) => {
    const { zone, supervisor, ward, date } = req.body;
    const file = req.file;

    if (!zone || !supervisor || !ward || !date || !file) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    // 👇 Construct Cloudinary path and public_id
    const folderPath = `Zones/${zone}/${supervisor}/${ward}/${date}`;
    const filename = path.parse(file.originalname).name;
    const publicId = `${folderPath}/${filename}`;

    try {
        // ⬆️ Upload to Cloudinary with explicit public_id
        const result = await cloudinary.uploader.upload(file.path, {
            public_id: publicId, // 🔑 Ensures proper folder structure
        });

        // 🧹 Clean up temp file
        fs.unlinkSync(file.path);

        res.status(200).json({
            message: '✅ Upload successful',
            url: result.secure_url,
            public_id: result.public_id,
            folder: folderPath,
        });
    } catch (error) {
        console.error('❌ Upload error:', error);
        res.status(500).json({ error: 'Cloudinary upload failed', details: error });
    }
});

// ▶️ Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
