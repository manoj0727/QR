const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs').promises;
const path = require('path');

const generateProductQR = async (productData) => {
  try {
    const qrDir = path.join(__dirname, 'qr_codes');
    
    try {
      await fs.access(qrDir);
    } catch {
      await fs.mkdir(qrDir, { recursive: true });
    }

    const qrData = {
      product_id: productData.product_id,
      name: productData.name,
      type: productData.type,
      size: productData.size,
      color: productData.color,
      timestamp: new Date().toISOString()
    };

    const qrString = JSON.stringify(qrData);
    const fileName = `${productData.product_id}.png`;
    const filePath = path.join(qrDir, fileName);

    await QRCode.toFile(filePath, qrString, {
      errorCorrectionLevel: 'H',
      type: 'png',
      width: 300,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    const dataURL = await QRCode.toDataURL(qrString);

    return {
      filePath: filePath,
      fileName: fileName,
      dataURL: dataURL,
      qrData: qrString
    };
  } catch (error) {
    throw new Error(`Failed to generate QR code: ${error.message}`);
  }
};

const generateUniqueProductId = (type, size) => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 7);
  const prefix = `${type.substring(0, 3).toUpperCase()}-${size}-`;
  return `${prefix}${timestamp}-${random}`.toUpperCase();
};

module.exports = { generateProductQR, generateUniqueProductId };