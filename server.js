require('dotenv').config();
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const { v2: cloudinary } = require('cloudinary');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const upload = multer({ dest: 'temp_uploads/' }); // Local temp storage

app.post('/upload', upload.single('image'), async (req, res) => {
    const { zone = 'default_zone', supervisor = 'default_supervisor' } = req.body;

    if (!req.file) return res.status(400).send({ message: 'No file received' });

    try {
        const result = await cloudinary.uploader.upload(req.file.path, {
            folder: `${zone}/${supervisor}`,
        });

        console.log('☁️ Cloudinary URL:', result.secure_url);

        // Optional: auto-download to PC
        const downloadDir = path.join(__dirname, 'downloads', zone, supervisor);
        fs.mkdirSync(downloadDir, { recursive: true });

        const fileName = `${Date.now()}-${path.basename(result.secure_url)}`;
        const filePath = path.join(downloadDir, fileName);

        const https = require('https');
        const file = fs.createWriteStream(filePath);
        https.get(result.secure_url, (response) => {
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                console.log('📥 Downloaded to PC:', filePath);
            });
        });

        res.send({
            message: 'Uploaded to cloud and downloaded to PC',
            url: result.secure_url,
        });
    } catch (error) {
        console.error('❌ Upload failed:', error);
        res.status(500).send({ message: 'Upload failed', error });
    } finally {
        fs.unlinkSync(req.file.path); // Clean up temp file
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
});
