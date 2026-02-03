import { v2 as cloudinary } from "cloudinary";
import { ENV } from "./_core/env";

// Configurar Cloudinary
cloudinary.config({
  cloud_name: ENV.cloudinaryCloudName,
  api_key: ENV.cloudinaryApiKey,
  api_secret: ENV.cloudinaryApiSecret,
});

/**
 * Sube una imagen a Cloudinary
 * @param base64Image - Imagen en formato base64
 * @param folder - Carpeta en Cloudinary (opcional)
 * @returns URL de la imagen subida
 */
export async function uploadImageToCloudinary(
  base64Image: string,
  folder: string = "contafacil/products"
): Promise<{ url: string; publicId: string }> {
  try {
    const result = await cloudinary.uploader.upload(base64Image, {
      folder: folder,
      resource_type: "image",
      transformation: [
        { width: 800, height: 800, crop: "limit" }, // Limitar tamaño máximo
        { quality: "auto" }, // Optimización automática
        { fetch_format: "auto" }, // Formato automático (WebP si es soportado)
      ],
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
    };
  } catch (error) {
    console.error("Error al subir imagen a Cloudinary:", error);
    throw new Error("Error al subir la imagen");
  }
}

/**
 * Elimina una imagen de Cloudinary
 * @param publicId - ID público de la imagen en Cloudinary
 */
export async function deleteImageFromCloudinary(
  publicId: string
): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error("Error al eliminar imagen de Cloudinary:", error);
    throw new Error("Error al eliminar la imagen");
  }
}

/**
 * Obtiene la URL optimizada de una imagen
 * @param publicId - ID público de la imagen
 * @param width - Ancho deseado
 * @param height - Alto deseado
 * @returns URL optimizada
 */
export function getOptimizedImageUrl(
  publicId: string,
  width?: number,
  height?: number
): string {
  return cloudinary.url(publicId, {
    width: width,
    height: height,
    crop: "fill",
    quality: "auto",
    fetch_format: "auto",
  });
}

export { cloudinary };
