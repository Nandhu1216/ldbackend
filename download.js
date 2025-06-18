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
            console.error(`❌ Failed to download: ${dest}`, err.message);
            reject(err);
        });
    });
}

async function downloadAllImagesUnderOrg() {
    try {
        const { resources } = await cloudinary.search
            .expression(`public_id:${cloudRoot}/*`)
            .max_results(500)
            .execute();

        if (resources.length === 0) {
            console.log('⚠️ No resources found under Zones/');
            return;
        }

        for (const resource of resources) {
            const url = resource.secure_url;
            const publicId = resource.public_id; // Zones/Zone-1/Rahul/1/date/filename
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
        console.error(`❌ Error during sync:`, err.message);
    }
}

function syncNow() {
    console.log(`🕒 Sync started at ${new Date().toLocaleString()}`);
    downloadAllImagesUnderOrg();
}

syncNow();
cron.schedule('0 * * * *', syncNow);
