const sharp = require('sharp');

async function createIcon() {
  try {
    await sharp('public/banner.jpg')
      .resize({
        width: 512,
        height: 512,
        fit: 'contain',
        background: { r: 255, g: 102, b: 0, alpha: 1 } // #ff6600
      })
      .toFile('public/logo.png');
      
    console.log('Successfully created logo.png');
  } catch (err) {
    console.error('Error:', err);
  }
}

createIcon();
