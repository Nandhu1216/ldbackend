require('dotenv').config();
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const https = require('https');
const path = require('path');
const cron = require('node-cron');

// Cloudinary config
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const cloudRoot = 'Zones';
const baseDir = 'D:/Zones';

// Helper to download a file
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

// Extract full info
function extractFolderInfo(publicId) {
    // Format: Zones/zone-1/supervisor/ward/category/date/image
    const parts = publicId.split('/');
    return {
        zone: parts[1] || 'unknown-zone',
        supervisor: parts[2] || 'unknown-supervisor',
        ward: parts[3] || 'unknown-ward',
        category: parts[4] || 'unknown-category',
        date: parts[5] || 'unknown-date',
        filename: parts[6] || 'image'
    };
}

// Download and store in full + dailywork path
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

            const { zone, supervisor, ward, category, date, filename } = extractFolderInfo(publicId);

            // Full folder: D:/Zones/zone-1/supervisor/ward/category/date/filename.jpg
            const fullPath = path.join(baseDir, zone, supervisor, ward, category, date);
            const fullFile = path.join(fullPath, `${filename}${ext}`);

            // Dailywork folder: D:/Zones/dailywork/category/date/filename.jpg
            const dailyPath = path.join(baseDir, 'dailywork', category, date);
            const dailyFile = path.join(dailyPath, `${filename}${ext}`);

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

// Run now + hourly schedule
function syncNow() {
    console.log(`🕒 Sync started at ${new Date().toLocaleString()}`);
    downloadAllImages();
}

syncNow();
cron.schedule('0 * * * *', syncNow); // every hour
