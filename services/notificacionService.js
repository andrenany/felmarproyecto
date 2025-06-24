const { crearNotificacion, crearNotificacionAdmins } = require('../controllers/notificacionController');
const { Usuario } = require('../models');

class NotificacionService {
    /**
     * Crea una notificación para un usuario específico
     */
    static async notificarUsuario(usuarioId, titulo, mensaje, tipo = 'info') {
        try {
            await crearNotificacion({
                usuarioId,
                titulo,
                mensaje,
                tipo
            });
            console.log(`✅ Notificación creada para usuario ${usuarioId}: ${titulo}`);
        } catch (error) {
            console.error('❌ Error al crear notificación para usuario:', error);
        }
    }

    /**
     * Crea una notificación para todos los administradores
     */
    static async notificarAdmins(titulo, mensaje, tipo = 'info') {
        try {
            await crearNotificacionAdmins({
                titulo,
                mensaje,
                tipo
            });
            console.log(`✅ Notificación creada para administradores: ${titulo}`);
        } catch (error) {
            console.error('❌ Error al crear notificación para administradores:', error);
        }
    }

    /**
     * Crea una notificación para todos los usuarios con un rol específico
     */
    static async notificarPorRol(rol, titulo, mensaje, tipo = 'info') {
        try {
            const usuarios = await Usuario.findAll({ where: { rol } });
            if (!usuarios.length) {
                console.log(`No se encontraron usuarios con rol ${rol}`);
                return;
            }

            const notificacionesPromises = usuarios.map(usuario => {
                return crearNotificacion({
                    usuarioId: usuario.id,
                    titulo,
                    mensaje,
                    tipo
                });
            });

            await Promise.all(notificacionesPromises);
            console.log(`✅ Notificación creada para ${usuarios.length} usuarios con rol ${rol}: ${titulo}`);
        } catch (error) {
            console.error('❌ Error al crear notificación por rol:', error);
        }
    }

    /**
     * Notificación de nueva solicitud de retiro
     */
    static async nuevaSolicitudRetiro(clienteId, solicitudId) {
        try {
            const titulo = 'Nueva Solicitud de Retiro';
            const mensaje = `Se ha recibido una nueva solicitud de retiro #${solicitudId}. Revisa los detalles para proceder.`;
            
            await this.notificarAdmins(titulo, mensaje, 'info');
        } catch (error) {
            console.error('❌ Error al crear notificación de nueva solicitud:', error);
        }
    }

    /**
     * Notificación de solicitud aprobada
     */
    static async solicitudAprobada(clienteId, solicitudId) {
        try {
            const titulo = 'Solicitud Aprobada';
            const mensaje = `Tu solicitud de retiro #${solicitudId} ha sido aprobada. Pronto nos pondremos en contacto contigo.`;
            
            await this.notificarUsuario(clienteId, titulo, mensaje, 'success');
        } catch (error) {
            console.error('❌ Error al crear notificación de solicitud aprobada:', error);
        }
    }

    /**
     * Notificación de solicitud rechazada
     */
    static async solicitudRechazada(clienteId, solicitudId, motivo) {
        try {
            const titulo = 'Solicitud Rechazada';
            const mensaje = `Tu solicitud de retiro #${solicitudId} ha sido rechazada. Motivo: ${motivo}`;
            
            await this.notificarUsuario(clienteId, titulo, mensaje, 'error');
        } catch (error) {
            console.error('❌ Error al crear notificación de solicitud rechazada:', error);
        }
    }

    /**
     * Notificación de nueva cotización
     */
    static async nuevaCotizacion(clienteId, cotizacionId) {
        try {
            const titulo = 'Nueva Cotización';
            const mensaje = `Se ha generado una nueva cotización #${cotizacionId}. Revisa los detalles y precios.`;
            
            await this.notificarUsuario(clienteId, titulo, mensaje, 'info');
        } catch (error) {
            console.error('❌ Error al crear notificación de nueva cotización:', error);
        }
    }

    /**
     * Notificación de visita programada
     */
    static async visitaProgramada(clienteId, visitaId, fecha) {
        try {
            const titulo = 'Visita Programada';
            const mensaje = `Se ha programado una visita para el ${fecha}. Por favor, asegúrate de estar disponible.`;
            
            await this.notificarUsuario(clienteId, titulo, mensaje, 'info');
        } catch (error) {
            console.error('❌ Error al crear notificación de visita programada:', error);
        }
    }

    /**
     * Notificación de certificado generado
     */
    static async certificadoGenerado(clienteId, certificadoId) {
        try {
            const titulo = 'Certificado Generado';
            const mensaje = `Se ha generado un nuevo certificado #${certificadoId}. Puedes descargarlo desde tu panel.`;
            
            await this.notificarUsuario(clienteId, titulo, mensaje, 'success');
        } catch (error) {
            console.error('❌ Error al crear notificación de certificado generado:', error);
        }
    }

    /**
     * Notificación de sistema
     */
    static async notificacionSistema(titulo, mensaje, tipo = 'info') {
        try {
            await this.notificarAdmins(titulo, mensaje, tipo);
        } catch (error) {
            console.error('❌ Error al crear notificación de sistema:', error);
        }
    }

    /**
     * Notificación de mantenimiento
     */
    static async mantenimientoProgramado(fecha, duracion) {
        try {
            const titulo = 'Mantenimiento Programado';
            const mensaje = `El sistema estará en mantenimiento el ${fecha} por ${duracion}. Disculpa las molestias.`;
            
            // Notificar a todos los usuarios
            const usuarios = await Usuario.findAll({ where: { activo: true } });
            const notificacionesPromises = usuarios.map(usuario => {
                return crearNotificacion({
                    usuarioId: usuario.id,
                    titulo,
                    mensaje,
                    tipo: 'warning'
                });
            });

            await Promise.all(notificacionesPromises);
            console.log(`✅ Notificación de mantenimiento enviada a ${usuarios.length} usuarios`);
        } catch (error) {
            console.error('❌ Error al crear notificación de mantenimiento:', error);
        }
    }
}

module.exports = NotificacionService; 