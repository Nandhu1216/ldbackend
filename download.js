require('dotenv').config();
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const https = require('https');
const path = require('path');
const cron = require('node-cron');

// ☁️ Cloudinary configuration
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// 🔁 Root folder in Cloudinary and base local directory
const cloudRoot = 'Zones';
const baseDir = 'D:/Zones';

// 📥 Helper: Download a file
function downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        https.get(url, (response) => {
            response.pipe(file);
            file.on('finish', () => {
                file.close(() => {
                    console.log(`✅ Downloaded: ${dest}`);
                    resolve();
                });
            });
        }).on('error', (err) => {
            if (fs.existsSync(dest)) fs.unlinkSync(dest);
            console.error(`❌ Failed to download: ${dest}`, err.message);
            reject(err);
        });
    });
}

// 🔍 Extract folder info from Cloudinary public_id
function extractFolderInfo(publicId) {
    // New format: Zones/zone/supervisor/ward/date/category/filename
    const parts = publicId.split('/');
    return {
        zone: parts[1] || 'unknown-zone',
        supervisor: parts[2] || 'unknown-supervisor',
        ward: parts[3] || 'unknown-ward',
        date: parts[4] || 'unknown-date',
        category: parts[5] || 'unknown-category',
        filename: parts[6] || 'image'
    };
}

// 🔁 Download and store images in two locations
async function downloadAllImages() {
    try {
        const result = await cloudinary.search
            .expression(`folder:${cloudRoot}/*`)
            .max_results(500)
            .execute();

        const resources = result.resources;
        if (!resources || resources.length === 0) {
            console.log('⚠️ No resources found under Zones/');
            return;
        }

        for (const resource of resources) {
            const url = resource.secure_url;
            const publicId = resource.public_id;
            const ext = path.extname(url.split('?')[0]) || '.jpg';

            const { zone, supervisor, ward, date, category, filename } = extractFolderInfo(publicId);

            // 📁 Full folder: D:/Zones/zone/supervisor/ward/date/category/filename.jpg
            const fullPath = path.join(baseDir, zone, supervisor, ward, date, category);
            const fullFile = path.join(fullPath, `${filename}${ext}`);

            // 📁 Dailywork folder: D:/Zones/dailywork/date/category/filename.jpg
            const dailyPath = path.join(baseDir, 'dailywork', date, category);
            const dailyFile = path.join(dailyPath, `${filename}${ext}`);

            // Skip if both files exist
            if (fs.existsSync(fullFile) && fs.existsSync(dailyFile)) {
                console.log(`⏭️ Skipped (already exists): ${filename}`);
                continue;
            }

            fs.mkdirSync(fullPath, { recursive: true });
            fs.mkdirSync(dailyPath, { recursive: true });

            await downloadFile(url, fullFile);
            await downloadFile(url, dailyFile);
        }
    } catch (err) {
        console.error('❌ Error downloading from Cloudinary:', err.message);
    }
}

// 🚀 Run now and every hour
function syncNow() {
    console.log(`🕒 Sync started at ${new Date().toLocaleString()}`);
    downloadAllImages();
}

syncNow();
cron.schedule('0 * * * *', syncNow); // Every hour
