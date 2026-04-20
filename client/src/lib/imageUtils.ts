/**
 * Convierte una URL de imagen a base64 para usar en jsPDF.
 * Usa fetch() en lugar de Image + canvas para evitar problemas de CORS
 * con imágenes alojadas en Cloudinary u otros CDNs.
 */
export async function imageUrlToBase64(url: string): Promise<string> {
  // Intentar primero con fetch (más confiable con CORS)
  try {
    const response = await fetch(url, { mode: "cors" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const blob = await response.blob();
    return await blobToBase64(blob);
  } catch (fetchError) {
    // Fallback: intentar con Image + canvas (por si fetch falla)
    return imageElementToBase64(url);
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("FileReader no devolvió string"));
      }
    };
    reader.onerror = () => reject(new Error("Error al leer blob"));
    reader.readAsDataURL(blob);
  });
}

function imageElementToBase64(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";

    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("No se pudo obtener el contexto del canvas"));
        return;
      }

      ctx.drawImage(img, 0, 0);

      try {
        resolve(canvas.toDataURL("image/png"));
      } catch (e) {
        reject(e);
      }
    };

    img.onerror = () => reject(new Error("Error al cargar la imagen"));

    // Evitar caché para que el header CORS se aplique correctamente
    img.src = url.includes("?") ? `${url}&_t=${Date.now()}` : `${url}?_t=${Date.now()}`;
  });
}
