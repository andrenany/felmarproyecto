// controllers/notificacionController.js
const { Notificacion, Usuario } = require('../models');

/**
 * Función de ayuda para crear una notificación.
 * @param {object} data - Datos de la notificación.
 * @param {number} data.usuarioId - ID del usuario a notificar.
 * @param {string} data.titulo - Título de la notificación.
 * @param {string} data.mensaje - El cuerpo de la notificación.
 * @param {string} [data.tipo='info'] - Tipo de notificación ('info', 'warning', 'success', 'error').
 */
async function crearNotificacion(data) {
    try {
        await Notificacion.create(data);
    } catch (error) {
        console.error('Error al crear la notificación:', error);
    }
}

/**
 * Crea una notificación para todos los usuarios con el rol de 'administrador'.
 * @param {object} data - Datos de la notificación.
 * @param {string} data.titulo - Título de la notificación.
 * @param {string} data.mensaje - El cuerpo de la notificación.
 * @param {string} [data.tipo='info'] - Tipo de notificación.
 */
async function crearNotificacionAdmins({ titulo, mensaje, tipo = 'info' }) {
    try {
        const admins = await Usuario.findAll({ where: { rol: 'administrador' } });
        if (!admins.length) {
            console.log('No se encontraron administradores para notificar.');
            return;
        }

        const notificacionesPromises = admins.map(admin => {
            return crearNotificacion({
                usuarioId: admin.id,
                titulo,
                mensaje,
                tipo,
            });
        });

        await Promise.all(notificacionesPromises);
    } catch (error) {
        console.error('Error al crear notificaciones para administradores:', error);
    }
}

// Renderiza la vista de notificaciones para el administrador
const getNotificacionesView = async (req, res) => {
    try {
        const notificaciones = await Notificacion.findAll({
            where: { usuarioId: req.session.usuario.id },
            order: [['fechaCreacion', 'DESC']],
            include: {
                model: Usuario,
                as: 'usuario',
                attributes: ['nombre', 'email']
            }
        });

        // Separar leídas y no leídas
        const noLeidas = notificaciones.filter(n => !n.leida);
        const leidas = notificaciones.filter(n => n.leida);

        res.render('admin/notificaciones', {
            layout: 'layouts/admin',
            title: 'Notificaciones',
            usuario: req.session.usuario,
            notificaciones: notificaciones, // para la UI que dio el user
            noLeidas: noLeidas, // para una posible vista detallada
            leidas: leidas, // para una posible vista detallada
            page: 'notificaciones'
        });
    } catch (error) {
        console.error('Error al obtener notificaciones para la vista:', error);
        res.status(500).render('500', { error: 'Error al cargar las notificaciones.' });
    }
};

// API: Obtener todas las notificaciones para el usuario actual
const getNotificacionesApi = async (req, res) => {
    try {
        const notificaciones = await Notificacion.findAll({
            where: { usuarioId: req.session.usuario.id },
            order: [['fechaCreacion', 'DESC']],
        });
        const noLeidasCount = await Notificacion.count({
            where: { usuarioId: req.session.usuario.id, leida: false }
        });
        res.json({ 
            success: true,
            notificaciones, 
            noLeidasCount,
            totalNoLeidas: noLeidasCount
        });
    } catch (error) {
        console.error('Error al obtener notificaciones vía API:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};

// API: Obtener solo notificaciones no leídas
const obtenerNoLeidas = async (req, res) => {
    try {
        if (!req.session || !req.session.usuario) {
            // Si no hay sesión de usuario, no hay notificaciones que mostrar.
            return res.json({
                success: true,
                notificaciones: [],
                totalNoLeidas: 0
            });
        }

        const notificaciones = await Notificacion.findAll({
            where: {
                usuarioId: req.session.usuario.id,
                leida: false
            },
            order: [['fechaCreacion', 'DESC']],
        });
        const noLeidasCount = notificaciones.length;
        res.json({ 
            success: true,
            notificaciones, 
            totalNoLeidas: noLeidasCount
        });
    } catch (error) {
        console.error('Error al obtener notificaciones no leídas:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};

// API: Marcar una notificación como leída
const marcarComoLeida = async (req, res) => {
    try {
        const { id } = req.params;
        const [updated] = await Notificacion.update(
            { leida: true },
            { where: { id, usuarioId: req.session.usuario.id } }
        );

        if (updated) {
            res.status(200).json({ success: true, message: 'Notificación marcada como leída.' });
        } else {
            res.status(404).json({ success: false, message: 'Notificación no encontrada.' });
        }
    } catch (error) {
        console.error('Error al marcar notificación como leída:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
};

// API: Marcar todas las notificaciones como leídas
const marcarTodasComoLeidas = async (req, res) => {
    try {
        await Notificacion.update(
            { leida: true },
            { where: { usuarioId: req.session.usuario.id, leida: false } }
        );
        res.status(200).json({ success: true, message: 'Todas las notificaciones han sido marcadas como leídas.' });
    } catch (error) {
        console.error('Error al marcar todas las notificaciones como leídas:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
};

// API: Eliminar una notificación
const eliminarNotificacion = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await Notificacion.destroy({
            where: { id, usuarioId: req.session.usuario.id },
        });

        if (deleted) {
            res.status(200).json({ success: true, message: 'Notificación eliminada.' });
        } else {
            res.status(404).json({ success: false, message: 'Notificación no encontrada.' });
        }
    } catch (error) {
        console.error('Error al eliminar notificación:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
};

// Método para listar notificaciones (vista)
const listar = async (req, res) => {
    try {
        await getNotificacionesView(req, res);
    } catch (error) {
        console.error('Error al listar notificaciones:', error);
        res.status(500).render('500', { error: 'Error al cargar las notificaciones.' });
    }
};

// Método para marcar como leída (vista)
const marcarLeida = async (req, res) => {
    try {
        await marcarComoLeida(req, res);
    } catch (error) {
        console.error('Error al marcar notificación como leída:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
};

// Método para marcar todas como leídas (vista)
const marcarTodasLeidas = async (req, res) => {
    try {
        await marcarTodasComoLeidas(req, res);
    } catch (error) {
        console.error('Error al marcar todas las notificaciones como leídas:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
};

// ADMIN: Renderiza la vista de gestión de notificaciones
const adminNotificacionesView = (req, res) => {
    res.render('admin/notificaciones', {
        layout: false // La vista ya tiene su propio layout completo
    });
};

// API ADMIN: Obtener todas las notificaciones para el admin
const getAdminNotificaciones = async (req, res) => {
    try {
        const notificaciones = await Notificacion.findAll({
            order: [['fechaCreacion', 'DESC']],
        });

        // Adaptar nombres de campos para la vista que espera 'created_at' y 'read_at'
        const notificacionesAdaptadas = notificaciones.map(n => ({
            id: n.id,
            title: n.titulo,
            message: n.mensaje,
            type: n.tipo,
            created_at: n.fechaCreacion,
            read_at: n.leida ? n.updatedAt : null // Simula read_at si está leída
        }));

        res.json({ success: true, notifications: notificacionesAdaptadas });
    } catch (error) {
        console.error('Error al obtener notificaciones para admin:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
};

// API ADMIN: Marcar una notificación como leída
const markAsReadAdmin = async (req, res) => {
    try {
        const { id } = req.params;
        const [updated] = await Notificacion.update(
            { leida: true },
            { where: { id } }
        );

        if (updated) {
            res.json({ success: true, message: 'Notificación marcada como leída.' });
        } else {
            res.status(404).json({ success: false, message: 'Notificación no encontrada.' });
        }
    } catch (error) {
        console.error('Error al marcar notificación como leída:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
};

// API ADMIN: Marcar todas como leídas
const markAllAsReadAdmin = async (req, res) => {
    try {
        await Notificacion.update(
            { leida: true },
            { where: { leida: false } }
        );
        res.json({ success: true, message: 'Todas las notificaciones marcadas como leídas.' });
    } catch (error) {
        console.error('Error al marcar todas como leídas:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
};

// API ADMIN: Eliminar una notificación
const deleteNotificationAdmin = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await Notificacion.destroy({ where: { id } });

        if (deleted) {
            res.json({ success: true, message: 'Notificación eliminada.' });
        } else {
            res.status(404).json({ success: false, message: 'Notificación no encontrada.' });
        }
    } catch (error) {
        console.error('Error al eliminar notificación:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
};

// API ADMIN: Obtener el conteo de no leídas
const getUnreadCountAdmin = async (req, res) => {
    try {
        const count = await Notificacion.count({ where: { leida: false } });
        res.json({ success: true, unread: count });
    } catch (error) {
        console.error('Error al obtener conteo de no leídas:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
};

// API ADMIN: Guardar configuración (simulado)
const saveSettingsAdmin = (req, res) => {
    // Por ahora, solo devolvemos una respuesta exitosa.
    console.log('Guardando configuración de notificaciones:', req.body);
    res.json({ success: true, message: 'Configuración guardada.' });
};

// API ADMIN: Cargar configuración (simulado)
const getSettingsAdmin = (req, res) => {
    // Devuelve una configuración por defecto.
    res.json({
        email: true,
        push: true,
        sound: false,
        urgent: true
    });
};

module.exports = {
    crearNotificacion,
    crearNotificacionAdmins,
    // Funciones para la nueva página de admin
    adminNotificacionesView,
    getAdminNotificaciones,
    markAsReadAdmin,
    markAllAsReadAdmin,
    deleteNotificationAdmin,
    getUnreadCountAdmin,
    saveSettingsAdmin,
    getSettingsAdmin,
    // Funciones existentes
    getNotificacionesApi,
    obtenerNoLeidas,
    marcarComoLeida,
    marcarTodasComoLeidas,
    eliminarNotificacion,
    listar,
    marcarLeida,
    marcarTodasLeidas
};