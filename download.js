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

// 📁 Root cloud folder and local destination
const cloudRoot = 'Zones';
const baseDir = 'D:/Zones';

// 📥 Download helper
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

// 🔍 Extract metadata from Cloudinary public_id
function extractFolderInfo(publicId) {
    const parts = publicId.split('/');
    // Safe fallback if structure is incorrect
    if (parts.length < 7) {
        console.warn(`⚠️ Unexpected path structure: ${publicId}`);
        return null;
    }

    return {
        zone: parts[1],
        supervisor: parts[2],
        ward: parts[3],
        date: parts[4],
        category: parts[5],
        filename: parts[6],
    };
}

// 🔄 Download images to local folders
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

            const info = extractFolderInfo(publicId);
            if (!info) continue;

            const { zone, supervisor, ward, date, category, filename } = info;

            // ✅ Proper local paths
            const fullPath = path.join(baseDir, zone, supervisor, ward, date, category);
            const fullFile = path.join(fullPath, `${filename}${ext}`);

            const dailyPath = path.join(baseDir, 'dailywork', date, category);
            const dailyFile = path.join(dailyPath, `${filename}${ext}`);

            // Skip if already downloaded
            if (fs.existsSync(fullFile) && fs.existsSync(dailyFile)) {
                console.log(`⏭️ Skipped (already exists): ${filename}`);
                continue;
            }

            // Ensure directories
            fs.mkdirSync(fullPath, { recursive: true });
            fs.mkdirSync(dailyPath, { recursive: true });

            // Download both copies
            await downloadFile(url, fullFile);
            await downloadFile(url, dailyFile);
        }
    } catch (err) {
        console.error('❌ Error during download:', err.message);
    }
}

// 🚀 Run once now and hourly
function syncNow() {
    console.log(`🕒 Sync started at ${new Date().toLocaleString()}`);
    downloadAllImages();
}

syncNow();
cron.schedule('0 * * * *', syncNow); // Every hour
