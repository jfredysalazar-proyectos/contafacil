# Guía Completa: Configuración de AWS SES para ContaFácil

Esta guía te llevará paso a paso por el proceso de registro en AWS, configuración de AWS SES (Simple Email Service) y obtención de las credenciales necesarias para que ContaFácil pueda enviar emails automáticamente.

---

## ¿Qué es AWS SES?

**AWS SES (Simple Email Service)** es un servicio de Amazon Web Services que permite enviar emails transaccionales y de marketing de forma confiable y económica. ContaFácil lo utiliza para:

- Enviar emails de recuperación de contraseña
- Enviar alertas de inventario bajo
- Notificar sobre deudas próximas a vencer
- Enviar confirmaciones de ventas importantes

---

## Costos de AWS SES

AWS SES tiene una **capa gratuita** muy generosa:

- **Primeros 62,000 emails al mes**: Completamente GRATIS (si envías desde EC2)
- **Sin EC2**: 1,000 emails gratis al mes
- **Después de la capa gratuita**: $0.10 USD por cada 1,000 emails

Para un negocio pequeño o mediano, **probablemente nunca pagarás nada** o pagarás centavos al mes.

---

## Paso 1: Crear una Cuenta de AWS

### 1.1 Ir al sitio web de AWS

1. Abre tu navegador y ve a: **https://aws.amazon.com**
2. Haz clic en el botón **"Crear una cuenta de AWS"** (esquina superior derecha)

### 1.2 Completar el formulario de registro

Necesitarás proporcionar:

- **Dirección de email**: Usa un email al que tengas acceso permanente
- **Contraseña**: Crea una contraseña segura (guárdala en un lugar seguro)
- **Nombre de cuenta de AWS**: Puedes usar el nombre de tu negocio

### 1.3 Información de contacto

Selecciona el tipo de cuenta:

- **Personal**: Si es para tu negocio pequeño
- **Profesional**: Si es para una empresa registrada

Completa:
- Nombre completo
- Número de teléfono (con código de país +57 para Colombia)
- Dirección completa en Colombia

### 1.4 Información de pago

**IMPORTANTE**: AWS requiere una tarjeta de crédito o débito para verificar tu identidad, pero:

- ✅ **NO te cobrarán** si te mantienes dentro de la capa gratuita
- ✅ Puedes configurar **alertas de facturación** para evitar sorpresas
- ✅ La mayoría de usuarios de ContaFácil nunca pagarán nada

Ingresa los datos de tu tarjeta:
- Número de tarjeta
- Fecha de vencimiento
- Nombre del titular
- Dirección de facturación

### 1.5 Verificación de identidad

AWS te llamará o enviará un SMS para verificar tu identidad:

1. Ingresa tu número de teléfono
2. Recibirás un código de 4 dígitos
3. Ingresa el código en la pantalla

### 1.6 Seleccionar plan de soporte

Selecciona **"Plan de soporte básico"** (es GRATIS y suficiente para ContaFácil)

### 1.7 Confirmación

¡Felicidades! Tu cuenta de AWS está creada. Recibirás un email de confirmación.

---

## Paso 2: Acceder a la Consola de AWS

### 2.1 Iniciar sesión

1. Ve a: **https://console.aws.amazon.com**
2. Haz clic en **"Sign In to the Console"**
3. Selecciona **"Root user"** (usuario raíz)
4. Ingresa tu email y contraseña
5. Haz clic en **"Sign In"**

### 2.2 Seleccionar región

**MUY IMPORTANTE**: AWS SES no está disponible en todas las regiones.

1. En la esquina superior derecha, verás el nombre de una región (ej: "N. Virginia")
2. Haz clic en el nombre de la región
3. Selecciona una de estas regiones recomendadas:
   - **US East (N. Virginia)** - `us-east-1` ⭐ RECOMENDADA
   - **US West (Oregon)** - `us-west-2`
   - **EU (Ireland)** - `eu-west-1`

**Nota**: Anota la región que seleccionaste, la necesitarás más adelante.

---

## Paso 3: Configurar AWS SES

### 3.1 Abrir el servicio SES

1. En la barra de búsqueda superior, escribe: **"SES"**
2. Haz clic en **"Amazon Simple Email Service"**

### 3.2 Verificar tu dirección de email

AWS SES requiere que verifiques el email desde el cual enviarás mensajes.

1. En el menú lateral izquierdo, haz clic en **"Verified identities"** (Identidades verificadas)
2. Haz clic en el botón naranja **"Create identity"** (Crear identidad)
3. Selecciona **"Email address"** (Dirección de email)
4. Ingresa tu dirección de email (ej: `tunegocio@gmail.com`)
5. Haz clic en **"Create identity"**

### 3.3 Verificar el email

1. Revisa tu bandeja de entrada (y spam) del email que ingresaste
2. Busca un email de **"Amazon Web Services"** con asunto: *"Amazon SES Address Verification Request"*
3. Haz clic en el enlace de verificación dentro del email
4. Verás una página que dice: **"Congratulations! You've successfully verified..."**

### 3.4 Confirmar verificación

1. Regresa a la consola de AWS SES
2. Refresca la página (F5)
3. Tu email debería aparecer con estado **"Verified"** (Verificado) ✅

---

## Paso 4: Salir del Modo Sandbox (IMPORTANTE)

Por defecto, AWS SES está en **"Sandbox mode"** (modo de prueba), lo que significa que:

- ❌ Solo puedes enviar emails a direcciones verificadas
- ❌ No puedes enviar emails a tus clientes

**Debes solicitar salir del Sandbox para uso en producción.**

### 4.1 Solicitar salida del Sandbox

1. En el menú lateral izquierdo, haz clic en **"Account dashboard"** (Panel de cuenta)
2. Busca la sección **"Sending statistics"**
3. Verás un mensaje: *"Your account is in the sandbox"*
4. Haz clic en el botón **"Request production access"** (Solicitar acceso a producción)

### 4.2 Completar el formulario de solicitud

**Tipo de correo**:
- Selecciona: **"Transactional"** (Transaccional)

**Descripción del caso de uso** (en inglés):
```
I am building a business management system called ContaFácil for small businesses in Colombia. 
The system needs to send transactional emails for:
- Password recovery emails
- Low inventory alerts
- Payment reminders
- Sales confirmations

We will only send emails to users who have registered on our platform and have opted in to receive notifications.
We comply with all anti-spam regulations and provide unsubscribe options.
```

**Traducción**:
> Estoy construyendo un sistema de gestión empresarial llamado ContaFácil para pequeños negocios en Colombia. El sistema necesita enviar emails transaccionales para: recuperación de contraseña, alertas de inventario bajo, recordatorios de pago y confirmaciones de ventas. Solo enviaremos emails a usuarios registrados que han aceptado recibir notificaciones. Cumplimos con todas las regulaciones anti-spam y proporcionamos opciones para darse de baja.

**Sitio web** (opcional):
- Si tienes un sitio web, ingrésalo. Si no, puedes dejarlo en blanco.

**Proceso para manejar bounces y quejas**:
```
We monitor bounce and complaint rates through AWS SES dashboard.
Hard bounces are automatically removed from our mailing list.
Users can unsubscribe at any time through links in emails.
We maintain bounce rates below 5% and complaint rates below 0.1%.
```

**Traducción**:
> Monitoreamos tasas de rebote y quejas a través del panel de AWS SES. Los rebotes permanentes se eliminan automáticamente de nuestra lista. Los usuarios pueden darse de baja en cualquier momento. Mantenemos tasas de rebote por debajo del 5% y quejas por debajo del 0.1%.

### 4.3 Enviar solicitud

1. Haz clic en **"Submit request"** (Enviar solicitud)
2. AWS revisará tu solicitud en **24-48 horas** (usualmente menos)
3. Recibirás un email cuando sea aprobada

**Mientras tanto**, puedes continuar con los siguientes pasos y probar el sistema enviando emails a direcciones verificadas.

---

## Paso 5: Crear Credenciales de Acceso (IAM)

Para que ContaFácil pueda enviar emails, necesitas crear credenciales de acceso.

### 5.1 Abrir IAM

1. En la barra de búsqueda superior, escribe: **"IAM"**
2. Haz clic en **"IAM"** (Identity and Access Management)

### 5.2 Crear un nuevo usuario

1. En el menú lateral izquierdo, haz clic en **"Users"** (Usuarios)
2. Haz clic en el botón **"Create user"** (Crear usuario)
3. Nombre de usuario: **`contafacil-ses-user`**
4. **NO** marques la casilla "Provide user access to the AWS Management Console"
5. Haz clic en **"Next"** (Siguiente)

### 5.3 Asignar permisos

1. Selecciona **"Attach policies directly"** (Adjuntar políticas directamente)
2. En la barra de búsqueda, escribe: **"SES"**
3. Marca la casilla junto a: **"AmazonSESFullAccess"**
4. Haz clic en **"Next"** (Siguiente)
5. Revisa la información y haz clic en **"Create user"** (Crear usuario)

### 5.4 Crear Access Keys

1. Haz clic en el usuario que acabas de crear (**contafacil-ses-user**)
2. Haz clic en la pestaña **"Security credentials"** (Credenciales de seguridad)
3. Desplázate hacia abajo hasta **"Access keys"** (Claves de acceso)
4. Haz clic en **"Create access key"** (Crear clave de acceso)
5. Selecciona: **"Application running outside AWS"** (Aplicación ejecutándose fuera de AWS)
6. Marca la casilla de confirmación en la parte inferior
7. Haz clic en **"Next"** (Siguiente)
8. Descripción (opcional): **"ContaFácil SES credentials"**
9. Haz clic en **"Create access key"** (Crear clave de acceso)

### 5.5 Guardar las credenciales

**⚠️ IMPORTANTE**: Esta es la ÚNICA vez que podrás ver la **Secret Access Key**.

Verás dos valores:

1. **Access Key ID**: Algo como `AKIAIOSFODNN7EXAMPLE`
2. **Secret Access Key**: Algo como `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY`

**Opciones para guardar**:

- Haz clic en **"Download .csv file"** (Descargar archivo CSV) ⭐ RECOMENDADO
- O copia y pega ambos valores en un lugar seguro (como un gestor de contraseñas)

**⚠️ NUNCA compartas estas credenciales con nadie ni las subas a GitHub/repositorios públicos.**

---

## Paso 6: Configurar ContaFácil con las Credenciales

Ahora que tienes las credenciales, debes configurarlas en ContaFácil.

### 6.1 Información que necesitas

Reúne la siguiente información:

1. **AWS_SES_REGION**: La región que seleccionaste en el Paso 2.2 (ej: `us-east-1`)
2. **AWS_SES_ACCESS_KEY_ID**: El Access Key ID del Paso 5.5
3. **AWS_SES_SECRET_ACCESS_KEY**: El Secret Access Key del Paso 5.5
4. **AWS_SES_FROM_EMAIL**: El email verificado en el Paso 3.2 (ej: `tunegocio@gmail.com`)

### 6.2 Configurar variables de entorno en Manus

1. Ve al panel de gestión de ContaFácil en Manus
2. Haz clic en **"Settings"** (Configuración) en el menú lateral
3. Haz clic en **"Secrets"** (Secretos)
4. Agrega las siguientes variables de entorno:

| Variable | Valor de ejemplo | Tu valor |
|----------|------------------|----------|
| `AWS_SES_REGION` | `us-east-1` | _(tu región)_ |
| `AWS_SES_ACCESS_KEY_ID` | `AKIAIOSFODNN7EXAMPLE` | _(tu access key)_ |
| `AWS_SES_SECRET_ACCESS_KEY` | `wJalrXUtnFEMI/...` | _(tu secret key)_ |
| `AWS_SES_FROM_EMAIL` | `tunegocio@gmail.com` | _(tu email verificado)_ |

5. Haz clic en **"Save"** (Guardar) para cada variable

### 6.3 Reiniciar el servidor

1. En el panel de Manus, haz clic en **"Dashboard"**
2. Haz clic en el botón de **"Restart"** (Reiniciar) para aplicar las nuevas variables de entorno

---

## Paso 7: Probar el Envío de Emails

### 7.1 Probar recuperación de contraseña

1. Cierra sesión en ContaFácil
2. En la página de login, haz clic en **"¿Olvidaste tu contraseña?"**
3. Ingresa tu email
4. Haz clic en **"Enviar enlace de recuperación"**
5. Revisa tu bandeja de entrada (y spam)
6. Deberías recibir un email con el enlace de recuperación ✅

### 7.2 Verificar en AWS SES

1. Regresa a la consola de AWS SES
2. En el menú lateral, haz clic en **"Account dashboard"**
3. En **"Sending statistics"**, deberías ver:
   - **Emails sent**: 1 (o más)
   - **Bounce rate**: 0%
   - **Complaint rate**: 0%

---

## Solución de Problemas

### Problema: "Email address is not verified"

**Solución**: Verifica que el email en `AWS_SES_FROM_EMAIL` sea exactamente el mismo que verificaste en AWS SES (Paso 3).

### Problema: "The security token included in the request is invalid"

**Solución**: Las credenciales son incorrectas. Verifica que:
- `AWS_SES_ACCESS_KEY_ID` esté correcto
- `AWS_SES_SECRET_ACCESS_KEY` esté correcto (sin espacios extra)

### Problema: "User is not authorized to perform: ses:SendEmail"

**Solución**: El usuario IAM no tiene permisos. Regresa al Paso 5.3 y asegúrate de haber asignado la política **AmazonSESFullAccess**.

### Problema: "MessageRejected: Email address is not verified"

**Solución**: Tu cuenta está en Sandbox mode y estás intentando enviar a un email no verificado. Opciones:
1. Verifica el email de destino en AWS SES (Paso 3)
2. O solicita salir del Sandbox (Paso 4)

### Problema: No recibo emails

**Solución**:
1. Revisa tu carpeta de **spam/correo no deseado**
2. Verifica que el email en `AWS_SES_FROM_EMAIL` esté verificado en AWS SES
3. Revisa los logs del servidor de ContaFácil para ver errores

---

## Monitoreo y Mejores Prácticas

### Configurar alertas de facturación

Para evitar sorpresas en tu factura de AWS:

1. En la consola de AWS, haz clic en tu nombre (esquina superior derecha)
2. Haz clic en **"Billing and Cost Management"**
3. En el menú lateral, haz clic en **"Budgets"**
4. Haz clic en **"Create budget"**
5. Selecciona **"Zero spend budget"** (Presupuesto de gasto cero)
6. Ingresa tu email para recibir alertas
7. Haz clic en **"Create budget"**

### Monitorear métricas de SES

Revisa regularmente:

- **Bounce rate** (tasa de rebote): Debe estar por debajo del 5%
- **Complaint rate** (tasa de quejas): Debe estar por debajo del 0.1%
- **Emails sent** (emails enviados): Para ver tu uso

### Mantener buena reputación

- ✅ Solo envía emails a usuarios que han dado su consentimiento
- ✅ Incluye siempre un enlace para darse de baja
- ✅ Usa asuntos claros y honestos
- ✅ Mantén tus listas de emails actualizadas
- ❌ Nunca compres listas de emails
- ❌ No envíes spam

---

## Resumen de Credenciales

Al finalizar esta guía, deberías tener configuradas estas 4 variables de entorno en ContaFácil:

| Variable | Descripción | Dónde obtenerla |
|----------|-------------|-----------------|
| `AWS_SES_REGION` | Región de AWS | Paso 2.2 |
| `AWS_SES_ACCESS_KEY_ID` | ID de clave de acceso | Paso 5.5 |
| `AWS_SES_SECRET_ACCESS_KEY` | Clave secreta de acceso | Paso 5.5 |
| `AWS_SES_FROM_EMAIL` | Email remitente verificado | Paso 3.2 |

---

## ¿Necesitas Ayuda?

Si tienes problemas durante el proceso:

1. **Revisa la sección "Solución de Problemas"** arriba
2. **Consulta la documentación oficial de AWS SES**: https://docs.aws.amazon.com/ses/
3. **Contacta al soporte de AWS**: Desde la consola de AWS, haz clic en el ícono de interrogación (?) y selecciona "Support Center"

---

## Próximos Pasos

Una vez configurado AWS SES, ContaFácil podrá:

- ✅ Enviar emails de recuperación de contraseña automáticamente
- ✅ Enviar alertas cuando el inventario esté bajo
- ✅ Notificar sobre deudas próximas a vencer
- ✅ Enviar confirmaciones de ventas importantes

¡Tu sistema de gestión empresarial está ahora completamente funcional! 🎉
