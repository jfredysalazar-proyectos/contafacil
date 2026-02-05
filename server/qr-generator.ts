import QRCode from 'qrcode';

/**
 * Genera un código QR en formato base64 (data URL)
 * @param data - Datos a codificar en el QR (ej: SKU, referencia, URL)
 * @returns Promise con el QR en formato data URL
 */
export async function generateQRCode(data: string): Promise<string> {
  try {
    // Opciones para el QR
    const options = {
      errorCorrectionLevel: 'M' as const,
      type: 'image/png' as const,
      quality: 0.92,
      margin: 1,
      width: 300,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    };

    // Generar QR como data URL (base64)
    const qrDataURL = await QRCode.toDataURL(data, options);
    return qrDataURL;
  } catch (error) {
    console.error('Error generando QR:', error);
    throw new Error('No se pudo generar el código QR');
  }
}

/**
 * Genera un código QR para un producto basado en su SKU o ID
 * @param sku - SKU del producto
 * @param productId - ID del producto (fallback si no hay SKU)
 * @param productName - Nombre del producto
 * @returns Promise con el QR en formato data URL
 */
export async function generateProductQRCode(
  sku: string | null,
  productId: number,
  productName: string
): Promise<string> {
  // Usar SKU si existe, sino usar ID del producto
  const qrData = sku || `PROD-${productId}`;
  
  // Generar el QR con la referencia del producto
  return generateQRCode(qrData);
}
