import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

/**
 * Servicio de envío de emails usando AWS SES
 * Requiere las siguientes variables de entorno:
 * - AWS_SES_REGION: Región de AWS (ej: us-east-1)
 * - AWS_SES_ACCESS_KEY_ID: Access Key ID de AWS
 * - AWS_SES_SECRET_ACCESS_KEY: Secret Access Key de AWS
 * - AWS_SES_FROM_EMAIL: Email verificado en SES para enviar desde
 */

interface EmailOptions {
  to: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
}

let sesClient: SESClient | null = null;

function getSESClient(): SESClient | null {
  if (!process.env.AWS_SES_REGION || 
      !process.env.AWS_SES_ACCESS_KEY_ID || 
      !process.env.AWS_SES_SECRET_ACCESS_KEY) {
    console.warn("[Email Service] AWS SES credentials not configured");
    return null;
  }

  if (!sesClient) {
    sesClient = new SESClient({
      region: process.env.AWS_SES_REGION,
      credentials: {
        accessKeyId: process.env.AWS_SES_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SES_SECRET_ACCESS_KEY,
      },
    });
  }

  return sesClient;
}

/**
 * Envía un email usando AWS SES
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  const client = getSESClient();
  
  if (!client) {
    console.warn("[Email Service] SES client not available, email not sent");
    console.log("[Email Service] Would have sent:", {
      to: options.to,
      subject: options.subject,
    });
    return false;
  }

  const fromEmail = process.env.AWS_SES_FROM_EMAIL;
  if (!fromEmail) {
    console.error("[Email Service] AWS_SES_FROM_EMAIL not configured");
    return false;
  }

  try {
    const command = new SendEmailCommand({
      Source: fromEmail,
      Destination: {
        ToAddresses: [options.to],
      },
      Message: {
        Subject: {
          Data: options.subject,
          Charset: "UTF-8",
        },
        Body: {
          Html: {
            Data: options.htmlBody,
            Charset: "UTF-8",
          },
          Text: options.textBody
            ? {
                Data: options.textBody,
                Charset: "UTF-8",
              }
            : undefined,
        },
      },
    });

    const response = await client.send(command);
    console.log("[Email Service] Email sent successfully:", response.MessageId);
    return true;
  } catch (error) {
    console.error("[Email Service] Error sending email:", error);
    return false;
  }
}

/**
 * Genera el HTML para el email de recuperación de contraseña
 */
export function generatePasswordResetEmailHTML(resetLink: string, expirationMinutes: number = 15): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recuperar Contraseña - ContaFácil</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f4f4f4;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
      padding: 40px 20px;
      text-align: center;
    }
    .logo {
      width: 80px;
      height: 80px;
      background: white;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 32px;
      font-weight: bold;
      color: #1e3a8a;
      margin-bottom: 16px;
    }
    .header h1 {
      color: white;
      margin: 0;
      font-size: 28px;
    }
    .content {
      padding: 40px 30px;
    }
    .content h2 {
      color: #1e3a8a;
      margin-top: 0;
    }
    .content p {
      margin: 16px 0;
      color: #666;
    }
    .button {
      display: inline-block;
      padding: 14px 32px;
      background: #1e3a8a;
      color: white !important;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      margin: 24px 0;
      transition: background 0.3s;
    }
    .button:hover {
      background: #1e40af;
    }
    .warning {
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 16px;
      margin: 24px 0;
      border-radius: 4px;
    }
    .warning p {
      margin: 0;
      color: #92400e;
    }
    .footer {
      background: #f9fafb;
      padding: 24px 30px;
      text-align: center;
      border-top: 1px solid #e5e7eb;
    }
    .footer p {
      margin: 8px 0;
      font-size: 14px;
      color: #6b7280;
    }
    .link {
      color: #3b82f6;
      word-break: break-all;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">CF</div>
      <h1>ContaFácil</h1>
    </div>
    <div class="content">
      <h2>Recuperación de Contraseña</h2>
      <p>Hola,</p>
      <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta en ContaFácil.</p>
      <p>Haz clic en el siguiente botón para crear una nueva contraseña:</p>
      <center>
        <a href="${resetLink}" class="button">Restablecer Contraseña</a>
      </center>
      <p>O copia y pega este enlace en tu navegador:</p>
      <p class="link">${resetLink}</p>
      <div class="warning">
        <p><strong>⚠️ Importante:</strong> Este enlace expirará en ${expirationMinutes} minutos por seguridad.</p>
      </div>
      <p>Si no solicitaste restablecer tu contraseña, puedes ignorar este email de forma segura.</p>
    </div>
    <div class="footer">
      <p><strong>ContaFácil</strong></p>
      <p>Sistema de gestión empresarial</p>
      <p style="font-size: 12px; color: #9ca3af;">Este es un email automático, por favor no respondas a este mensaje.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Genera el texto plano para el email de recuperación
 */
export function generatePasswordResetEmailText(resetLink: string, expirationMinutes: number = 15): string {
  return `
ContaFácil - Recuperación de Contraseña

Hola,

Recibimos una solicitud para restablecer la contraseña de tu cuenta en ContaFácil.

Para crear una nueva contraseña, visita el siguiente enlace:
${resetLink}

IMPORTANTE: Este enlace expirará en ${expirationMinutes} minutos por seguridad.

Si no solicitaste restablecer tu contraseña, puedes ignorar este email de forma segura.

---
ContaFácil
Sistema de gestión empresarial
  `.trim();
}

/**
 * Envía el email de recuperación de contraseña
 */
export async function sendPasswordResetEmail(
  email: string,
  resetLink: string,
  expirationMinutes: number = 15
): Promise<boolean> {
  const htmlBody = generatePasswordResetEmailHTML(resetLink, expirationMinutes);
  const textBody = generatePasswordResetEmailText(resetLink, expirationMinutes);

  return await sendEmail({
    to: email,
    subject: "Recupera tu contraseña - ContaFácil",
    htmlBody,
    textBody,
  });
}
