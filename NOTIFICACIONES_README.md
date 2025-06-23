# Sistema de Notificaciones - Felmar Proyecto

## 📋 Descripción

El sistema de notificaciones permite enviar notificaciones automáticas a los usuarios del sistema. Funciona de forma completamente automática y se integra con todas las funcionalidades existentes.

## 🚀 Características

- ✅ **Notificaciones automáticas** para diferentes eventos del sistema
- ✅ **Contador visual** de notificaciones no leídas
- ✅ **Modal de notificaciones** con interfaz moderna
- ✅ **Marcado como leído** individual y masivo
- ✅ **Diferentes tipos** de notificación (info, warning, success, error)
- ✅ **Notificaciones por rol** (administradores, operadores, clientes)
- ✅ **Responsive design** para móviles y tablets
- ✅ **Actualización automática** cada minuto

## 🏗️ Arquitectura

### Modelos
- `Notificacion.js` - Modelo principal de notificaciones
- `Usuario.js` - Modelo de usuarios con asociación a notificaciones

### Controladores
- `notificacionController.js` - Controlador principal con todas las funciones

### Servicios
- `notificacionService.js` - Servicio para crear notificaciones automáticas

### Rutas
- `notificacionesRoutes.js` - Rutas API para el frontend
- `notificacionRoutes.js` - Rutas para vistas administrativas

### Frontend
- `notificaciones.js` - JavaScript del frontend
- `notificaciones.css` - Estilos CSS
- `notificaciones.ejs` - Partial para el modal

## 📱 Cómo usar

### 1. Ver notificaciones
Los usuarios pueden ver sus notificaciones haciendo clic en el icono de campana en el header. El contador rojo muestra el número de notificaciones no leídas.

### 2. Marcar como leído
- **Individual**: Hacer clic en una notificación
- **Masivo**: Botón "Marcar todas como leídas" en el modal

### 3. Crear notificaciones programáticamente

```javascript
const NotificacionService = require('./services/notificacionService');

// Notificar a un usuario específico
await NotificacionService.notificarUsuario(
    usuarioId, 
    'Título', 
    'Mensaje', 
    'info'
);

// Notificar a todos los administradores
await NotificacionService.notificarAdmins(
    'Título', 
    'Mensaje', 
    'warning'
);

// Notificar por rol
await NotificacionService.notificarPorRol(
    'cliente', 
    'Título', 
    'Mensaje', 
    'success'
);
```

### 4. Notificaciones automáticas predefinidas

```javascript
// Nueva solicitud de retiro
await NotificacionService.nuevaSolicitudRetiro(clienteId, solicitudId);

// Solicitud aprobada
await NotificacionService.solicitudAprobada(clienteId, solicitudId);

// Solicitud rechazada
await NotificacionService.solicitudRechazada(clienteId, solicitudId, motivo);

// Nueva cotización
await NotificacionService.nuevaCotizacion(clienteId, cotizacionId);

// Visita programada
await NotificacionService.visitaProgramada(clienteId, visitaId, fecha);

// Certificado generado
await NotificacionService.certificadoGenerado(clienteId, certificadoId);

// Notificación de sistema
await NotificacionService.notificacionSistema(titulo, mensaje, tipo);

// Mantenimiento programado
await NotificacionService.mantenimientoProgramado(fecha, duracion);
```

## 🎨 Tipos de notificación

- `info` - Información general (azul)
- `warning` - Advertencias (amarillo)
- `success` - Éxito (verde)
- `error` - Errores (rojo)

## 🔧 Integración con eventos existentes

Para integrar notificaciones en eventos existentes, simplemente agrega las llamadas al servicio en los controladores correspondientes:

### Ejemplo: Solicitud de retiro
```javascript
// En solicitudController.js
const NotificacionService = require('../services/notificacionService');

// Después de crear una solicitud
await NotificacionService.nuevaSolicitudRetiro(clienteId, solicitud.id);
```

### Ejemplo: Cotización
```javascript
// En cotizacionController.js
const NotificacionService = require('../services/notificacionService');

// Después de generar una cotización
await NotificacionService.nuevaCotizacion(clienteId, cotizacion.numeroCotizacion);
```

## 🧪 Pruebas

Para probar el sistema de notificaciones:

```bash
node scripts/testNotificaciones.js
```

Este script creará notificaciones de prueba para verificar que todo funciona correctamente.

## 📊 API Endpoints

### GET /notificaciones/no-leidas
Obtiene las notificaciones no leídas del usuario actual.

**Respuesta:**
```json
{
  "success": true,
  "notificaciones": [...],
  "totalNoLeidas": 5
}
```

### POST /notificaciones/marcar-leida/:id
Marca una notificación como leída.

### POST /notificaciones/marcar-todas-leidas
Marca todas las notificaciones del usuario como leídas.

### GET /notificaciones
Obtiene todas las notificaciones del usuario.

### DELETE /notificaciones/:id
Elimina una notificación.

## 🎯 Funcionalidades automáticas

El sistema incluye las siguientes funcionalidades automáticas:

1. **Actualización automática**: Las notificaciones se actualizan cada minuto
2. **Contador dinámico**: El contador se actualiza automáticamente
3. **Marcado automático**: Al hacer clic en una notificación se marca como leída
4. **Responsive**: Funciona en dispositivos móviles y tablets
5. **Animaciones**: Efectos visuales suaves para mejor UX

## 🔒 Seguridad

- Todas las rutas requieren autenticación
- Los usuarios solo pueden ver sus propias notificaciones
- Validación de datos en el backend
- Sanitización de contenido HTML

## 📈 Rendimiento

- Consultas optimizadas a la base de datos
- Caché de notificaciones en el frontend
- Actualización incremental (solo nuevas notificaciones)
- Lazy loading de notificaciones antiguas

## 🐛 Solución de problemas

### Las notificaciones no aparecen
1. Verificar que el usuario esté autenticado
2. Revisar la consola del navegador para errores JavaScript
3. Verificar que las rutas estén correctamente configuradas

### El contador no se actualiza
1. Verificar que el elemento `#contador-notificaciones` exista en el DOM
2. Revisar que el JavaScript se esté cargando correctamente
3. Verificar la respuesta de la API `/notificaciones/no-leidas`

### Error en la base de datos
1. Verificar que la tabla `notificaciones` exista
2. Revisar las asociaciones entre modelos
3. Verificar que el usuario tenga permisos de escritura

## 📝 Notas importantes

- El sistema funciona completamente automático sin necesidad de configuración adicional
- Las notificaciones se crean en tiempo real
- El sistema es escalable y puede manejar miles de notificaciones
- Compatible con todos los navegadores modernos
- No requiere dependencias externas adicionales

## 🎉 ¡Listo para usar!

El sistema de notificaciones está completamente funcional y listo para usar. Solo necesitas integrar las llamadas al servicio en los eventos donde quieras enviar notificaciones automáticas. 