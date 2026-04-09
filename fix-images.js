const sharp = require('sharp');
const path = require('path');

const images = [
  'walmart.png',
  'lcbo.png',
  'freshco.png',
  'nofrills.png'
];

async function fixImages() {
  for (const img of images) {
    const filePath = path.join(__dirname, 'assets/images', img);
    try {
      await sharp(filePath)
        .png()
        .toFile(filePath + '.tmp');
      require('fs').renameSync(filePath + '.tmp', filePath);
      console.log(`Fixed: ${img}`);
    } catch (e) {
      console.log(`Error fixing ${img}:`, e.message);
    }
  }
}

fixImages();