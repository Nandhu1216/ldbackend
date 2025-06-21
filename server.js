require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const cloudinary = require('cloudinary').v2;
const { exec } = require('child_process'); // 👈 Added to trigger download.js

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

        // ☁️ Upload to Cloudinary
        const result = await cloudinary.uploader.upload(file.path, {
            folder: folderPath,
            public_id: `${originalName}_${Date.now()}`,
            overwrite: false,
        });

        fs.unlinkSync(file.path); // 🧹 Delete temp

        // ✅ Trigger download.js after successful upload
        const downloadScript = path.join(__dirname, 'download.js');

        exec(`node "${downloadScript}"`, { env: { ...process.env } }, (err, stdout, stderr) => {
            if (err) {
                console.error('❌ Failed to run download.js:', err.message);
                console.error('stderr:', stderr);
                return;
            }
            console.log('📥 download.js executed successfully:\n', stdout);
        });


        // ✅ Respond to client
        res.status(200).json({
            message: '✅ Upload successful and download triggered',
            url: result.secure_url,
            cloudinary_path: result.public_id,
        });

    } catch (err) {
        console.error('❌ Upload error:', err);
        res.status(500).json({ error: 'Upload failed' });
    }
});

// 🚀 Start server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
