require('dotenv').config();
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const https = require('https');
const path = require('path');
const cron = require('node-cron');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// 🗂️ Root Cloudinary folder
const cloudRoot = 'Zones';
const baseDir = 'D:/Zones'; // ✅ Store locally in D:/org

async function downloadAllImagesUnderOrg() {
    try {
        const { resources } = await cloudinary.search
            .expression(`folder:${cloudRoot}`)
            .with_field('context')
            .max_results(500) // Increase if needed
            .execute();
        console.log(`📦 Found ${resources.length} resources`);
        console.log(JSON.stringify(resources.map(r => r.public_id), null, 2));
        for (const resource of resources) {
            const url = resource.secure_url;
            const publicId = resource.public_id; // e.g., org/zone-1/John/ward-1/2025-06-14/image_xxxx
            const relativePath = publicId.replace(`${cloudRoot}/`, ''); // zone-1/John/ward-1/date/filename

            const filename = path.basename(url);
            const localFolder = path.join(baseDir, path.dirname(relativePath));
            const localPath = path.join(localFolder, filename);

            // Skip if file already exists
            if (fs.existsSync(localPath)) {
                console.log(`⏭️ Already exists: ${localPath}`);
                continue;
            }

            fs.mkdirSync(localFolder, { recursive: true });

            const file = fs.createWriteStream(localPath);
            https.get(url, (response) => {
                response.pipe(file);
                console.log(`✅ Downloaded: ${localPath}`);
            });
        }
    } catch (err) {
        console.error(`❌ Error during sync:`, err.message);
    }
}

function syncNow() {
    console.log(`🕒 Sync started at ${new Date().toLocaleString()}`);
    downloadAllImagesUnderOrg();
}

// Run immediately and then every hour
syncNow();
cron.schedule('0 * * * *', syncNow);

