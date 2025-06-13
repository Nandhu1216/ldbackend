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

// 🔁 Define folders to sync (match your Flutter upload path)
const foldersToDownload = [
    'org/zone-1/John',
    'org/zone-1/Alex',
    'org/zone-2/Maya',
    'org/zone-2/Ravi',
    'org/zone-3/Priya',
    'org/zone-3/David',
    'org/zone-4/Sara',
    'org/zone-4/Arun',
];

// ✅ Change baseDir to D: drive
const baseDir = 'D:/org';

async function downloadImages(folderName) {
    try {
        const { resources } = await cloudinary.search
            .expression(`folder:${folderName}`)
            .sort_by('created_at', 'desc')
            .max_results(100)
            .execute();

        for (const resource of resources) {
            const url = resource.secure_url;
            const filename = path.basename(url);

            // 🛣️ Adjust folder path to D:/org/zone-x/Supervisor/
            const relativePath = folderName.replace('org/', '');
            const localFolder = path.join(baseDir, relativePath);
            const localPath = path.join(localFolder, filename);

            if (fs.existsSync(localPath)) {
                console.log(`⏩ Already exists: ${filename}`);
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
        console.error(`❌ Error in ${folderName}:`, err.message);
    }
}

function syncAllFolders() {
    console.log(`🕒 Sync started at ${new Date().toLocaleString()}`);
    foldersToDownload.forEach((folder) => downloadImages(folder));
}

// ⏱️ Run every hour on the hour
cron.schedule('0 * * * *', syncAllFolders);

// ▶️ Run immediately on startup too
syncAllFolders();
