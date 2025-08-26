const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');

const generateProductQR = async (productData) => {
  try {
    const qrData = {
      product_id: productData.product_id,
      name: productData.name,
      type: productData.type,
      size: productData.size,
      color: productData.color,
      timestamp: new Date().toISOString()
    };

    const qrString = JSON.stringify(qrData);

    // Generate QR code as base64 data URL
    const dataURL = await QRCode.toDataURL(qrString, {
      errorCorrectionLevel: 'H',
      type: 'png',
      width: 300,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    return {
      dataURL: dataURL,
      base64: dataURL.split(',')[1], // Extract just the base64 part
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