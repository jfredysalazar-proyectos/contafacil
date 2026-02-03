import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { uploadImageToCloudinary, deleteImageFromCloudinary } from "./cloudinary-service";

export const uploadRouter = router({
  /**
   * Sube una imagen a Cloudinary
   */
  uploadImage: protectedProcedure
    .input(
      z.object({
        image: z.string(), // Base64 string
        folder: z.string().optional().default("contafacil/products"),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const result = await uploadImageToCloudinary(input.image, input.folder);
        return {
          success: true,
          url: result.url,
          publicId: result.publicId,
        };
      } catch (error) {
        throw new Error("Error al subir la imagen");
      }
    }),

  /**
   * Elimina una imagen de Cloudinary
   */
  deleteImage: protectedProcedure
    .input(
      z.object({
        publicId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        await deleteImageFromCloudinary(input.publicId);
        return { success: true };
      } catch (error) {
        throw new Error("Error al eliminar la imagen");
      }
    }),
});
