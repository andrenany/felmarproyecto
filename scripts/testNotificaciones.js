// scripts/testNotificaciones.js
const NotificacionService = require('../services/notificacionService');
const { Usuario } = require('../models');

async function testNotificaciones() {
    try {
        console.log('🧪 Iniciando pruebas del sistema de notificaciones...\n');

        // Obtener un usuario de prueba
        const usuario = await Usuario.findOne({ where: { rol: 'administrador' } });
        if (!usuario) {
            console.log('❌ No se encontró ningún administrador para las pruebas');
            return;
        }

        console.log(`👤 Usuario de prueba: ${usuario.nombre} (ID: ${usuario.id})`);

        // Prueba 1: Notificación para usuario específico
        console.log('\n📝 Prueba 1: Notificación para usuario específico');
        await NotificacionService.notificarUsuario(
            usuario.id,
            'Prueba de Notificación',
            'Esta es una notificación de prueba para verificar que el sistema funciona correctamente.',
            'info'
        );

        // Prueba 2: Notificación para administradores
        console.log('\n📝 Prueba 2: Notificación para administradores');
        await NotificacionService.notificarAdmins(
            'Prueba de Sistema',
            'Se ha realizado una prueba del sistema de notificaciones.',
            'success'
        );

        // Prueba 3: Notificación por rol
        console.log('\n📝 Prueba 3: Notificación por rol');
        await NotificacionService.notificarPorRol(
            'administrador',
            'Notificación por Rol',
            'Esta notificación fue enviada a todos los administradores.',
            'warning'
        );

        // Prueba 4: Notificación de solicitud
        console.log('\n📝 Prueba 4: Notificación de solicitud');
        await NotificacionService.nuevaSolicitudRetiro(usuario.id, 'TEST-001');

        // Prueba 5: Notificación de cotización
        console.log('\n📝 Prueba 5: Notificación de cotización');
        await NotificacionService.nuevaCotizacion(usuario.id, 'COT-001');

        // Prueba 6: Notificación de visita
        console.log('\n📝 Prueba 6: Notificación de visita');
        await NotificacionService.visitaProgramada(usuario.id, 'VIS-001', '15/12/2024 10:00');

        // Prueba 7: Notificación de certificado
        console.log('\n📝 Prueba 7: Notificación de certificado');
        await NotificacionService.certificadoGenerado(usuario.id, 'CERT-001');

        // Prueba 8: Notificación de sistema
        console.log('\n📝 Prueba 8: Notificación de sistema');
        await NotificacionService.notificacionSistema(
            'Mantenimiento Programado',
            'El sistema estará en mantenimiento mañana de 2:00 a 4:00 AM.',
            'warning'
        );

        console.log('\n✅ Todas las pruebas completadas exitosamente!');
        console.log('📱 Verifica las notificaciones en el panel de administración.');

    } catch (error) {
        console.error('❌ Error durante las pruebas:', error);
    } finally {
        process.exit(0);
    }
}

// Ejecutar las pruebas
testNotificaciones(); 