import { router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import * as dbQueries from "./db-queries";
import { storagePut } from "./storage";

export const pdfRouter = router({
  generateReceipt: protectedProcedure
    .input(z.object({ saleId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const sale = await dbQueries.getSaleById(input.saleId, ctx.user.id);
      
      if (!sale) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Venta no encontrada",
        });
      }

      // En el cliente se generará el PDF con jsPDF
      // Aquí solo retornamos los datos necesarios
      return {
        sale,
        user: ctx.user,
        generatedAt: new Date(),
      };
    }),

  generateReport: protectedProcedure
    .input(
      z.object({
        type: z.enum(["sales", "expenses", "inventory", "debts"]),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      let data: any;

      switch (input.type) {
        case "sales":
          data = await dbQueries.getSalesByUserId(
            ctx.user.id,
            input.startDate,
            input.endDate
          );
          break;
        case "expenses":
          data = await dbQueries.getExpensesByUserId(
            ctx.user.id,
            input.startDate,
            input.endDate
          );
          break;
        case "inventory":
          data = await dbQueries.getInventoryByUserId(ctx.user.id);
          break;
        case "debts":
          const receivables = await dbQueries.getReceivablesByUserId(ctx.user.id);
          const payables = await dbQueries.getPayablesByUserId(ctx.user.id);
          data = { receivables, payables };
          break;
      }

      return {
        type: input.type,
        data,
        user: ctx.user,
        startDate: input.startDate,
        endDate: input.endDate,
        generatedAt: new Date(),
      };
    }),

  saveToStorage: protectedProcedure
    .input(
      z.object({
        fileName: z.string(),
        fileContent: z.string(), // Base64 encoded PDF
        type: z.enum(["receipt", "report"]),
        referenceId: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Convertir base64 a buffer
      const buffer = Buffer.from(input.fileContent, "base64");
      
      // Generar key único para S3
      const timestamp = Date.now();
      const fileKey = `${ctx.user.id}/pdfs/${input.type}/${timestamp}-${input.fileName}`;
      
      // Subir a S3
      const { url } = await storagePut(fileKey, buffer, "application/pdf");
      
      // Guardar registro en base de datos
      if (input.type === "receipt" && input.referenceId) {
        // Aquí podrías guardar en una tabla de comprobantes
      }
      
      return {
        success: true,
        url,
        fileKey,
      };
    }),
});
