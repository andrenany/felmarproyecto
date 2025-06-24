// scripts/testNotificacionesSimple.js
const NotificacionService = require('../services/notificacionService');

async function testSimple() {
    try {
        console.log('🧪 Prueba simple del sistema de notificaciones...\n');

        // Obtener un usuario de prueba
        const { Usuario } = require('../models');
        const usuario = await Usuario.findOne({ where: { rol: 'administrador' } });
        
        if (!usuario) {
            console.log('❌ No se encontró ningún administrador para las pruebas');
            return;
        }

        console.log(`👤 Usuario de prueba: ${usuario.nombre} (ID: ${usuario.id})`);

        // Crear una notificación simple
        console.log('\n📝 Creando notificación de prueba...');
        await NotificacionService.notificarUsuario(
            usuario.id,
            'Prueba del Sistema',
            'Esta es una notificación de prueba para verificar que el sistema funciona correctamente.',
            'info'
        );

        console.log('\n✅ Notificación creada exitosamente!');
        console.log('📱 Verifica las notificaciones en el panel de administración.');

    } catch (error) {
        console.error('❌ Error durante la prueba:', error);
    } finally {
        process.exit(0);
    }
}

// Ejecutar la prueba
testSimple(); 