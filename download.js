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

const cloudRoot = 'Zones'; // Cloud root folder
const baseDir = 'D:/Zones'; // Local base folder

// ⬇️ Download helper
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

// 📥 Download all images from Cloudinary
async function downloadAllImagesUnderOrg() {
    try {
        const { resources } = await cloudinary.search
            .expression(`folder:${cloudRoot}`)
            .max_results(500)
            .execute();

        if (!resources.length) {
            console.log('⚠️ No resources found under Zones/');
            return;
        }

        for (const resource of resources) {
            const url = resource.secure_url;
            const publicId = resource.public_id; // Zones/Zone-1/Rahul/1/date/filename
            const relativePath = publicId.replace(`${cloudRoot}/`, ''); // Remove "Zones/"
            const ext = path.extname(url).split('?')[0] || '.jpg'; // Safe extension
            const filename = path.basename(relativePath) + ext;
            const localFolder = path.join(baseDir, path.dirname(relativePath));
            const localPath = path.join(localFolder, filename);

            if (fs.existsSync(localPath)) {
                console.log(`⏭️ Already exists: ${localPath}`);
                continue;
            }

            fs.mkdirSync(localFolder, { recursive: true });
            await downloadFile(url, localPath);
        }
    } catch (err) {
        console.error('❌ Cloudinary fetch error:', err.message);
    }
}

// 🔁 Run now and every hour
function syncNow() {
    console.log(`🕒 Sync started at ${new Date().toLocaleString()}`);
    downloadAllImagesUnderOrg();
}

syncNow(); // Initial run
cron.schedule('0 * * * *', syncNow); // Hourly
