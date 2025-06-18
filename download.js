require('dotenv').config();
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const https = require('https');
const path = require('path');
const cron = require('node-cron');

// 🛠️ Cloudinary config
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const cloudRoot = 'Zones';           // Cloud root folder
const baseDir = 'D:/Zones';          // Local root folder

// ⬇️ File download helper
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
            console.error(`❌ Download failed: ${dest}`, err.message);
            reject(err);
        });
    });
}

// 📥 Sync from Cloudinary
async function downloadAllImagesUnderOrg() {
    try {
        const result = await cloudinary.search
            .expression(`folder:${cloudRoot}/*`)
            .max_results(500)
            .execute();

        const resources = result.resources;
        if (!resources || resources.length === 0) {
            console.log('⚠️ No resources found under Zones/*');
            return;
        }

        for (const resource of resources) {
            const url = resource.secure_url;
            const publicId = resource.public_id; // e.g., Zones/Zone-1/Rahul/1/date/photo
            const relativePath = publicId.replace(`${cloudRoot}/`, '');
            const cloudFileName = path.basename(relativePath);
            const ext = path.extname(url.split('?')[0]) || '.jpg'; // from URL
            const localFolder = path.join(baseDir, path.dirname(relativePath));
            const localPath = path.join(localFolder, `${cloudFileName}${ext}`);

            if (fs.existsSync(localPath)) {
                console.log(`⏭️ Skipped (already exists): ${localPath}`);
                continue;
            }

            fs.mkdirSync(localFolder, { recursive: true });
            await downloadFile(url, localPath);
        }
    } catch (err) {
        console.error('❌ Error fetching from Cloudinary:', err.message);
    }
}

// 🔁 Start now and schedule hourly
function syncNow() {
    console.log(`🕒 Sync started at ${new Date().toLocaleString()}`);
    downloadAllImagesUnderOrg();
}

syncNow();
cron.schedule('0 * * * *', syncNow); // Every hour
