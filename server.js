require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const https = require('https');
const cors = require('cors');
const cron = require('node-cron');
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

// 🌐 Upload to Cloudinary
app.post('/upload', upload.single('image'), async (req, res) => {
    const { zone, supervisor, ward, date, filename } = req.body;
    const file = req.file;

    if (!zone || !supervisor || !ward || !date || !filename || !file) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const folderPath = `Zones/${zone}/${supervisor}/${ward}/${date}`;
    const publicId = `${folderPath}/${filename}`;

    try {
        const result = await cloudinary.uploader.upload(file.path, {
            public_id: publicId,
            overwrite: true,
        });

        fs.unlinkSync(file.path);

        res.status(200).json({
            message: 'Upload successful',
            url: result.secure_url,
            public_id: result.public_id,
        });
    } catch (err) {
        console.error('❌ Upload error:', err);
        res.status(500).json({ error: 'Upload failed' });
    }
});

// 📥 Downloader
const cloudRoot = 'Zones';
const baseDir = 'D:/Zones';

function downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        https.get(url, (response) => {
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                console.log(`✅ Downloaded: ${dest}`);
                resolve();
            });
        }).on('error', (err) => {
            fs.unlinkSync(dest);
            console.error(`❌ Failed: ${dest}`, err.message);
            reject(err);
        });
    });
}

async function downloadAllImages() {
    try {
        const { resources } = await cloudinary.search
            .expression(`public_id:${cloudRoot}/*`)
            .max_results(500)
            .execute();

        if (resources.length === 0) {
            console.log('⚠️ No images found in Cloudinary.');
            return;
        }

        for (const resource of resources) {
            const url = resource.secure_url;
            const publicId = resource.public_id;
            const relativePath = publicId.replace(`${cloudRoot}/`, '');
            const extension = path.extname(url).split('?')[0] || '.jpg';

            const localFolder = path.join(baseDir, path.dirname(relativePath));
            const localFile = path.join(localFolder, path.basename(relativePath) + extension);

            if (fs.existsSync(localFile)) {
                console.log(`⏭️ Already exists: ${localFile}`);
                continue;
            }

            fs.mkdirSync(localFolder, { recursive: true });
            await downloadFile(url, localFile);
        }
    } catch (err) {
        console.error(`❌ Sync error:`, err.message);
    }
}

// 🕒 Run now + every hour
function syncNow() {
    console.log(`🕒 Sync started at ${new Date().toLocaleString()}`);
    downloadAllImages();
}

syncNow();
cron.schedule('0 * * * *', syncNow); // Every hour

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
