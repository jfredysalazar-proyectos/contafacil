# ContaFácil - Lista de Tareas

## Autenticación y Usuarios
- [x] Implementar sistema de autenticación independiente (sin Manus OAuth)
- [x] Crear registro de usuarios con email y contraseña
- [x] Implementar login seguro con validación
- [ ] Agregar recuperación de contraseña
- [ ] Crear perfil de usuario editable

## Base de Datos
- [x] Diseñar esquema completo de base de datos
- [x] Crear tabla de productos con variaciones (tallas, colores, etc.)
- [x] Crear tabla de clientes con información de contacto
- [x] Crear tabla de proveedores con datos de contacto
- [x] Crear tabla de ventas con detalles
- [x] Crear tabla de items de venta (productos vendidos)
- [x] Crear tabla de gastos con categorización
- [x] Crear tabla de inventario con stock y alertas
- [x] Crear tabla de deudas por cobrar (clientes)
- [x] Crear tabla de deudas por pagar (proveedores)
- [x] Crear tabla de pagos parciales
- [x] Crear tabla de comprobantes generados
- [x] Crear tabla de reportes generados

## Módulo de Ventas
- [ ] Crear interfaz de registro de ventas
- [ ] Implementar selección de cliente
- [ ] Implementar selección de productos con variaciones
- [ ] Calcular totales automáticamente en COP
- [ ] Guardar venta en base de datos
- [ ] Actualizar inventario automáticamente al registrar venta
- [ ] Mostrar historial de ventas
- [ ] Permitir edición y eliminación de ventas

## Módulo de Gastos
- [ ] Crear interfaz de registro de gastos
- [ ] Implementar categorización de gastos
- [ ] Selección de proveedor
- [ ] Guardar gasto en base de datos
- [ ] Mostrar historial de gastos
- [ ] Permitir edición y eliminación de gastos
- [ ] Filtros por categoría y fecha

## Módulo de Inventario
- [ ] Crear interfaz de gestión de productos
- [ ] Implementar variaciones de productos (tallas, colores, etc.)
- [ ] Control de stock actual
- [ ] Alertas de stock bajo
- [ ] Historial de movimientos de inventario
- [ ] Reporte de productos más vendidos
- [ ] Reporte de rotación de inventario

## Módulo de Clientes
- [ ] Crear interfaz de gestión de clientes
- [ ] Formulario de registro de clientes
- [ ] Información de contacto completa
- [ ] Historial de compras por cliente
- [ ] Control de deudas pendientes por cliente
- [ ] Búsqueda y filtros de clientes

## Módulo de Proveedores
- [ ] Crear interfaz de gestión de proveedores
- [ ] Formulario de registro de proveedores
- [ ] Datos de contacto completos
- [ ] Historial de compras a proveedores
- [ ] Control de pagos pendientes
- [ ] Búsqueda y filtros de proveedores

## Control de Deudas
- [ ] Sistema de deudas por cobrar (clientes)
- [ ] Sistema de deudas por pagar (proveedores)
- [ ] Seguimiento de pagos parciales
- [ ] Control de vencimientos
- [ ] Alertas de deudas próximas a vencer
- [ ] Historial completo de pagos
- [ ] Dashboard de deudas pendientes

## Dashboard y Estadísticas
- [x] Crear dashboard principal
- [x] Gráfico de ventas por período
- [x] Gráfico de productos más vendidos
- [x] Gráfico de gastos por categoría
- [x] Indicador de rentabilidad
- [x] Resumen de deudas pendientes
- [x] Alertas de inventario bajo
- [x] Estadísticas en tiempo real

## Comprobantes PDF
- [ ] Diseñar plantilla de comprobante de venta
- [ ] Incluir información fiscal colombiana
- [ ] Generar PDF con datos de la venta
- [ ] Descargar comprobante
- [ ] Almacenar comprobante en S3
- [ ] Historial de comprobantes generados

## Reportes PDF
- [ ] Reporte de ventas por período
- [ ] Reporte de gastos por período
- [ ] Reporte de inventario actual
- [ ] Reporte de deudas pendientes
- [ ] Reporte de rentabilidad
- [ ] Almacenar reportes en S3
- [ ] Descargar reportes generados

## Almacenamiento S3
- [ ] Configurar integración con S3
- [ ] Subir comprobantes PDF a S3
- [ ] Subir reportes PDF a S3
- [ ] Generar URLs de acceso
- [ ] Gestionar archivos históricos

## Sistema de Alertas
- [ ] Configurar sistema de notificaciones por email
- [ ] Alerta de inventario bajo
- [ ] Alerta de deudas próximas a vencer
- [ ] Alerta de ventas importantes
- [ ] Configuración de umbrales de alertas

## Diseño y UX
- [x] Definir paleta de colores elegante
- [x] Implementar diseño sobrio y profesional
- [ ] Crear layout con navegación lateral
- [ ] Diseñar componentes reutilizables
- [x] Implementar tema consistente
- [ ] Optimizar para responsive design
- [ ] Agregar animaciones sutiles

## Pruebas y Optimización
- [ ] Pruebas de autenticación
- [ ] Pruebas de registro de ventas
- [ ] Pruebas de generación de PDF
- [ ] Pruebas de alertas
- [ ] Optimización de consultas a base de datos
- [ ] Validación de formularios
- [ ] Manejo de errores

## Tareas Prioritarias (Solicitadas por Usuario)
- [ ] Completar todas las páginas de gestión con interfaces funcionales
- [ ] Implementar generación de comprobantes PDF con información fiscal
- [ ] Implementar generación de reportes financieros en PDF
- [ ] Integrar almacenamiento S3 para todos los PDFs generados


## Recuperación de Contraseña (Nueva Funcionalidad)
- [x] Crear tabla de tokens de recuperación en base de datos
- [x] Implementar generación de tokens seguros con expiración
- [x] Crear endpoint para solicitar recuperación de contraseña
- [x] Crear endpoint para validar token y restablecer contraseña
- [x] Crear página de solicitud de recuperación
- [x] Crear página de restablecimiento de contraseña
- [ ] Integrar envío de emails con enlace de recuperación
- [x] Agregar enlace en página de login
- [x] Validar expiración de tokens (15 minutos)
- [x] Invalidar token después de uso exitoso


## Integración AWS SES para Emails (Nueva Funcionalidad)
- [x] Instalar SDK de AWS SES
- [x] Crear servicio de envío de emails
- [x] Configurar credenciales de AWS SES
- [x] Crear plantilla HTML para email de recuperación
- [x] Integrar envío de email en recuperación de contraseña
- [ ] Probar envío de emails en sandbox de SES
- [x] Documentar configuración de AWS SES

## Perfil de Usuario Editable (Nueva Funcionalidad)
- [x] Crear endpoints backend para obtener perfil
- [x] Crear endpoint para actualizar perfil
- [x] Crear endpoint para cambiar contraseña desde perfil
- [x] Crear página de perfil de usuario
- [x] Formulario de edición de información personal
- [x] Formulario de cambio de contraseña
- [x] Agregar enlace al perfil en navegación
- [x] Validación de datos en frontend y backend
- [x] Pruebas unitarias para endpoints de perfil


## Logo del Negocio (Nueva Funcionalidad)
- [x] Agregar campo logoUrl a la tabla users
- [x] Crear endpoint backend para subir logo
- [x] Validar tipo de archivo (PNG, JPG, JPEG, SVG)
- [x] Validar tamaño de archivo (máximo 2MB)
- [x] Subir logo a S3 con nombre único
- [x] Actualizar página de perfil con vista previa de logo
- [x] Componente de carga de imagen con drag & drop
- [x] Mostrar logo en el sidebar del layout
- [x] Integrar logo en comprobantes PDF
- [x] Permitir eliminar logo
- [x] Pruebas de subida y visualización


## Bug Crítico: Sistema de Autenticación (Reportado por Usuario) - RESUELTO
- [x] Investigar por qué el registro redirige a login.manus.im
- [x] Investigar por qué el login redirige a login.manus.im
- [x] Corregir redirecciones incorrectas a Manus OAuth
- [x] Verificar que endpoints de auth.ts se estén usando correctamente
- [x] Verificar configuración de contexto de autenticación
- [x] Probar flujo completo de registro
- [x] Probar flujo completo de login
- [x] Verificar que las cookies de sesión se establezcan correctamente


## Bug Crítico: Login no redirige al dashboard (Reportado por Usuario) - RESUELTO
- [x] Investigar por qué el login se queda en bucle
- [x] Verificar que las cookies se establezcan correctamente en login
- [x] Verificar que la redirección a /dashboard funcione
- [x] Verificar que useAuth detecte correctamente al usuario autenticado
- [x] Probar flujo completo: login → dashboard
- [x] Verificar que el contexto de autenticación funcione correctamente
- [x] Instalar y configurar cookie-parser middleware en Express
- [x] Corregir verificación de contraseña usando bcrypt.compare


## Tareas Prioritarias - Nueva Solicitud del Usuario
- [x] Completar funcionalidad de página de ventas con selección de productos y cálculos
- [x] Completar funcionalidad de página de gastos con categorización
- [x] Completar funcionalidad de página de inventario con alertas
- [x] Integrar generación automática de comprobantes PDF en ventas
- [x] Crear guía paso a paso para registro en AWS SES
- [x] Documentar configuración de credenciales AWS SES en el proyecto


## Mejora de Comprobantes PDF (Solicitado por Usuario)
- [x] Eliminar descarga automática de PDF al crear venta
- [x] Agregar botón "Ver" para abrir PDF en nueva pestaña
- [x] Agregar botón "Descargar" para descargar PDF
- [x] Mostrar ambos botones en la tabla de ventas


## Bug Crítico: Error al Generar PDF (Reportado por Usuario) - RESUELTO
- [x] Investigar "internal server error" al hacer clic en botón Ver
- [x] Investigar "descarga detenida" al hacer clic en botón Descargar
- [x] Revisar logs del servidor para identificar el error
- [x] Revisar consola del navegador para ver errores de JavaScript
- [x] Corregir generación de PDF (retornar data URI completo)
- [x] Agregar valores por defecto para datos opcionales
- [x] Manejar correctamente paymentMethod opcional
- [x] Probar que Ver y Descargar funcionen correctamente
