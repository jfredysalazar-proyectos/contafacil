/**
 * Convierte una URL de imagen a base64 para usar en jsPDF
 * Esto resuelve problemas de CORS al cargar imágenes desde URLs externas
 */
export async function imageUrlToBase64(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous"; // Importante para evitar errores de CORS
    
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("No se pudo obtener el contexto del canvas"));
        return;
      }
      
      ctx.drawImage(img, 0, 0);
      
      try {
        const dataURL = canvas.toDataURL("image/png");
        resolve(dataURL);
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => {
      reject(new Error("Error al cargar la imagen"));
    };
    
    // Agregar timestamp para evitar caché
    img.src = url.includes("?") ? `${url}&t=${Date.now()}` : `${url}?t=${Date.now()}`;
  });
}
