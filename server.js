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

const upload = multer({ dest: 'temp/' });

// Cloudinary Config
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// 📤 Upload Endpoint
app.post('/upload', upload.single('image'), async (req, res) => {
    const { zone, supervisor, ward, category, date } = req.body;
    const file = req.file;

    // 🛑 Check required fields
    if (!zone || !supervisor || !ward || !category || !date || !file) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    // 📁 Build folder structure
    const folderPath = `Zones/${zone}/${supervisor}/${ward}/${category}/${date}`;

    try {
        // ☁️ Upload to Cloudinary
        const result = await cloudinary.uploader.upload(file.path, {
            folder: folderPath,
            use_filename: true,
            unique_filename: true,
            overwrite: false,
        });

        // 🧹 Clean up temp file
        fs.unlinkSync(file.path);

        // ✅ Respond
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

// 🚀 Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
