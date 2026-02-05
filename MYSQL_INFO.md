# Información de MySQL en Railway

Las variables de conexión están disponibles en Railway:
- MYSQL_URL (URL de conexión privada)
- MYSQL_PUBLIC_URL (URL de conexión pública)
- MYSQL_ROOT_PASSWORD
- MYSQL_DATABASE
- MYSQLHOST
- MYSQLPORT
- MYSQLUSER
- MYSQLPASSWORD

Para ejecutar la migración, necesitamos usar MYSQL_PUBLIC_URL o conectarnos desde el servicio web.

La mejor opción es ejecutar la migración SQL directamente desde la aplicación desplegada o usar el CLI de Railway.
