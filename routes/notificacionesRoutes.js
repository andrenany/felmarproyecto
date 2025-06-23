const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middlewares/auth');
const notificacionController = require('../controllers/notificacionController');

// Obtener notificaciones no leídas
router.get('/no-leidas', isAuthenticated, async (req, res) => {
    try {
        await notificacionController.obtenerNoLeidas(req, res);
    } catch (error) {
        console.error('Error al obtener notificaciones:', error);
        res.status(500).json({ error: 'Error al obtener notificaciones' });
    }
});

// Marcar notificación como leída
router.post('/marcar-leida/:id', isAuthenticated, async (req, res) => {
    try {
        await notificacionController.marcarComoLeida(req, res);
    } catch (error) {
        console.error('Error al marcar notificación:', error);
        res.status(500).json({ error: 'Error al marcar notificación' });
    }
});

// Marcar todas las notificaciones como leídas
router.post('/marcar-todas-leidas', isAuthenticated, async (req, res) => {
    try {
        await notificacionController.marcarTodasComoLeidas(req, res);
    } catch (error) {
        console.error('Error al marcar notificaciones:', error);
        res.status(500).json({ error: 'Error al marcar notificaciones' });
    }
});

// Ruta para obtener todas las notificaciones
router.get('/', isAuthenticated, async (req, res) => {
    try {
        await notificacionController.getNotificacionesApi(req, res);
    } catch (error) {
        console.error('Error al obtener notificaciones:', error);
        res.status(500).json({ error: 'Error al obtener notificaciones' });
    }
});

// Ruta para eliminar notificación
router.delete('/:id', isAuthenticated, async (req, res) => {
    try {
        await notificacionController.eliminarNotificacion(req, res);
    } catch (error) {
        console.error('Error al eliminar notificación:', error);
        res.status(500).json({ error: 'Error al eliminar notificación' });
    }
});

module.exports = router; 