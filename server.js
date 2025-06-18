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

// 📂 Multer config - store temp files
const upload = multer({ dest: 'temp/' });

// ☁️ Cloudinary config from .env
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// 📤 Upload endpoint
app.post('/upload', upload.single('image'), async (req, res) => {
    const { zone, supervisor, ward, category, date } = req.body;
    const file = req.file;

    // 🛑 Validate required fields
    if (!zone || !supervisor || !ward || !category || !date || !file) {
        console.error('❌ Missing required fields:', {
            zone, supervisor, ward, category, date, file: file?.originalname,
        });
        return res.status(400).json({ error: 'Missing required fields' });
    }

    // 📁 Folder structure: Zones/Zone/Supervisor/Ward/Date/Category
    const folderPath = `Zones/${zone}/${supervisor}/${ward}/${date}/${category}`;
    console.log('📥 Upload request received:');
    console.log('  Folder Path:', folderPath);
    console.log('  Original Filename:', file.originalname);

    try {
        const originalName = path.parse(file.originalname).name;

        // ☁️ Upload to Cloudinary with fixed path and name
        const result = await cloudinary.uploader.upload(file.path, {
            folder: folderPath,
            public_id: `${originalName}_${Date.now()}`,
            overwrite: false,
        });

        // 🧹 Clean up temp file
        fs.unlinkSync(file.path);

        // ✅ Respond with uploaded file info
        res.status(200).json({
            message: '✅ Upload successful',
            url: result.secure_url,
            cloudinary_path: result.public_id,
        });

    } catch (err) {
        console.error('❌ Upload error:', err);
        res.status(500).json({ error: 'Upload failed' });
    }
});

// 🚀 Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
