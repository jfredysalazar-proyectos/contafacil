# Crear Usuario Administrador en ContaFacil

Este documento explica cómo crear un usuario administrador para acceder al sistema ContaFacil.

## Opción 1: Ejecutar el script en Railway (Recomendado)

### Pasos:

1. **Accede a tu proyecto en Railway**
   - Ve a: https://railway.com/project/8943ab9e-aec4-4d65-a16f-7cc9d4aef6e1

2. **Abre la terminal del servicio web**
   - Haz clic en el servicio "web"
   - Ve a la pestaña "Deployments"
   - Selecciona el deployment activo
   - Haz clic en "View Logs" y luego en la pestaña "Terminal" o "Shell"

3. **Ejecuta el script**
   ```bash
   node create-admin-user.mjs
   ```

4. **Anota las credenciales**
   El script mostrará las credenciales del usuario administrador creado:
   - **Email:** admin@contafacil.com
   - **Contraseña:** Admin123!

5. **Accede a tu aplicación**
   - Ve a: https://web-production-926df.up.railway.app/
   - Inicia sesión con las credenciales anteriores

## Opción 2: Ejecutar localmente

Si tienes el proyecto clonado en tu máquina local:

### Requisitos:
- Node.js instalado
- Acceso a la base de datos (variable DATABASE_URL configurada)

### Pasos:

1. **Clona el repositorio (si no lo has hecho)**
   ```bash
   git clone https://github.com/jfredysalazar-proyectos/contafacil.git
   cd contafacil
   ```

2. **Instala las dependencias**
   ```bash
   pnpm install
   ```

3. **Configura la variable de entorno**
   Crea un archivo `.env` en la raíz del proyecto con:
   ```
   DATABASE_URL=tu_cadena_de_conexion_mysql
   ```
   
   Obtén la cadena de conexión desde las variables de entorno de Railway.

4. **Ejecuta el script**
   ```bash
   node create-admin-user.mjs
   ```

## Opción 3: Crear manualmente con SQL

Si prefieres crear el usuario directamente en la base de datos:

### Pasos:

1. **Conéctate a tu base de datos MySQL**
   ```bash
   mysql -h TU_HOST \
         -P TU_PUERTO \
         -u TU_USUARIO \
         -p \
         TU_BASE_DE_DATOS \
         --ssl-mode=REQUIRED
   ```
   
   Obtén estos datos desde las variables de entorno de Railway (DATABASE_URL).

2. **Genera un hash bcrypt de la contraseña**
   
   Puedes usar una herramienta online como:
   - https://bcrypt-generator.com/
   - Ingresa la contraseña: `Admin123!`
   - Usa 10 rounds
   - Copia el hash generado

3. **Inserta el usuario en la base de datos**
   ```sql
   INSERT INTO users (email, passwordHash, name, role, createdAt, updatedAt, lastSignedIn)
   VALUES (
     'admin@contafacil.com',
     '$2a$10$TU_HASH_BCRYPT_AQUI',
     'Administrador',
     'admin',
     NOW(),
     NOW(),
     NOW()
   );
   ```

4. **Verifica la creación**
   ```sql
   SELECT id, email, name, role FROM users WHERE role = 'admin';
   ```

## Verificación del acceso

Una vez creado el usuario administrador:

1. Ve a tu aplicación: https://web-production-926df.up.railway.app/
2. Haz clic en "Iniciar sesión" o "Login"
3. Ingresa las credenciales:
   - **Email:** admin@contafacil.com
   - **Contraseña:** Admin123!
4. Deberías poder acceder al panel de administración

## Notas de seguridad

⚠️ **IMPORTANTE:** 

- Cambia la contraseña del administrador inmediatamente después del primer inicio de sesión
- No compartas las credenciales de administrador
- Considera usar contraseñas más seguras en producción
- El script incluye una contraseña temporal que debe ser cambiada

## Solución de problemas

### Error: "La tabla 'users' no existe"
Necesitas ejecutar las migraciones de la base de datos primero:
```bash
npm run db:push
```

### Error: "Ya existe un usuario administrador"
Si ya existe un usuario administrador y quieres crear otro:
```bash
node create-admin-user.mjs --force
```

### Error de conexión a la base de datos
Verifica que:
- La variable DATABASE_URL esté correctamente configurada
- La base de datos esté accesible desde tu ubicación
- Las credenciales sean correctas

## Contacto

Si tienes problemas para crear el usuario administrador, contacta al equipo de soporte o revisa los logs de Railway para más detalles.
