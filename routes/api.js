const express = require('express');
const router = express.Router();
const cotizacionController = require('../controllers/cotizacionController');
const clienteController = require('../controllers/clienteController');
const regionController = require('../controllers/regionController');
const perfilController = require('../controllers/perfilController');
const notificacionController = require('../controllers/notificacionController');
const { Cotizacion, Usuario, SolicitudRetiro, VisitaRetiro, Cliente, Notificacion } = require('../models');
const { Op } = require('sequelize');
const auth = require('../middlewares/auth');

// Importar las rutas reales de clientes
const clienteRoutes = require('./clienteRoutes');
router.use('/', clienteRoutes);

// Rutas de regiones
router.get('/regiones', regionController.listarRegiones);
router.get('/regiones/:regionId/comunas', regionController.getComunasByRegion);

// === RUTAS API PARA CLIENTES ===

// Listar clientes (solo admin)
router.get('/clientes', auth.isAuthenticatedApi, auth.requireAdmin, clienteController.listarClientes);

// Obtener cliente específico
router.get('/clientes/:id', auth.isAuthenticatedApi, clienteController.obtenerCliente);

// Crear cliente (solo admin)
router.post('/clientes', auth.isAuthenticatedApi, auth.requireAdmin, clienteController.crearCliente);

// Actualizar cliente
router.put('/clientes/:id', auth.isAuthenticatedApi, clienteController.actualizarCliente);

// Eliminar cliente (solo admin)
router.delete('/clientes/:id', auth.isAuthenticatedApi, auth.requireAdmin, clienteController.eliminarCliente);

// === RUTAS API PARA ADMIN ===
router.get('/admin/perfil', auth.isAuthenticatedApi, auth.requireAdmin, perfilController.getAdminProfileApi);
router.post('/admin/perfil', auth.isAuthenticatedApi, auth.requireAdmin, perfilController.updateAdminProfileApi);
router.post('/admin/cambiar-password', auth.isAuthenticatedApi, auth.requireAdmin, perfilController.changeAdminPasswordApi);

// === RUTAS API PARA NOTIFICACIONES DE ADMIN ===
router.get('/admin/notifications', auth.isAuthenticatedApi, auth.requireAdmin, notificacionController.getAdminNotificaciones);
router.post('/admin/notifications/:id/read', auth.isAuthenticatedApi, auth.requireAdmin, notificacionController.markAsReadAdmin);
router.post('/admin/notifications/mark-all-read', auth.isAuthenticatedApi, auth.requireAdmin, notificacionController.markAllAsReadAdmin);
router.delete('/admin/notifications/:id', auth.isAuthenticatedApi, auth.requireAdmin, notificacionController.deleteNotificationAdmin);
router.get('/admin/notifications/count', auth.isAuthenticatedApi, auth.requireAdmin, notificacionController.getUnreadCountAdmin);
router.post('/admin/notifications/settings', auth.isAuthenticatedApi, auth.requireAdmin, notificacionController.saveSettingsAdmin);
router.get('/admin/notifications/settings', auth.isAuthenticatedApi, auth.requireAdmin, notificacionController.getSettingsAdmin);

// Ruta para obtener precios de residuos
router.get('/precios-residuos', cotizacionController.listarPreciosResiduos);

// Ruta para estadísticas generales
router.get('/estadisticas', auth.isAuthenticatedApi, async (req, res) => {
    try {
        const whereCliente = req.session.usuario.rol === 'cliente' && req.session.usuario.clienteId 
            ? { clienteId: req.session.usuario.clienteId } 
            : {};
        
        // Obtener estadísticas según el rol
        const [totalSolicitudes, solicitudesPendientes, totalVisitas, visitasPendientes] = await Promise.all([
            SolicitudRetiro.count({ where: whereCliente }),
            SolicitudRetiro.count({ where: { ...whereCliente, estado: 'pendiente' } }),
            VisitaRetiro.count({ where: whereCliente }),
            VisitaRetiro.count({ where: { ...whereCliente, estado: 'pendiente' } })
        ]);

        // Para administradores, incluir estadísticas adicionales
        let stats = {
            solicitudes: { total: totalSolicitudes, pendientes: solicitudesPendientes },
            visitas: { total: totalVisitas, pendientes: visitasPendientes }
        };

        if (req.session.usuario.rol === 'administrador') {
            const [totalClientes, clientesNuevos] = await Promise.all([
                Cliente.count(),
                Cliente.count({
                    where: {
                        createdAt: {
                            [Op.gte]: new Date(new Date().setDate(1)) // Primer día del mes actual
                        }
                    }
                })
            ]);
            stats.clientes = { total: totalClientes, nuevos: clientesNuevos };
        }

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        res.status(500).json({
            success: false,
            message: 'Error al cargar las estadísticas'
        });
    }
});

// Ruta para estadísticas de cotizaciones del administrador
router.get('/admin/cotizaciones/estadisticas', auth.isAuthenticatedApi, async (req, res) => {
    try {
        // Verificar si es administrador
        if (req.session.usuario.rol !== 'administrador') {
            return res.status(403).json({
                success: false,
                message: 'No tienes permisos para acceder a estas estadísticas'
            });
        }

        // Obtener estadísticas de cotizaciones
        const [total, pendientes, aceptadas, rechazadas] = await Promise.all([
            Cotizacion.count(),
            Cotizacion.count({ where: { estado: 'pendiente' } }),
            Cotizacion.count({ where: { estado: 'aceptada' } }),
            Cotizacion.count({ where: { estado: 'rechazada' } })
        ]);

        res.json({
            success: true,
            total,
            pendientes,
            aceptadas,
            rechazadas
        });
    } catch (error) {
        console.error('Error al obtener estadísticas de cotizaciones:', error);
        res.status(500).json({
            success: false,
            message: 'Error al cargar estadísticas'
        });
    }
});

// Rutas para visitas
router.get('/visitas/clientes', auth.isAuthenticatedApi, async (req, res) => {
    try {
        // Verificar si es administrador u operador
        if (!['administrador', 'operador'].includes(req.session.usuario.rol)) {
            return res.status(403).json({
                success: false,
                message: 'No tienes permisos para acceder a esta información'
            });
        }

        const clientes = await Cliente.findAll({
            attributes: ['rut', 'nombre_empresa'],
            order: [['nombre_empresa', 'ASC']]
        });

        res.json({
            success: true,
            data: clientes
        });
    } catch (error) {
        console.error('Error al obtener clientes:', error);
        res.status(500).json({
            success: false,
            message: 'Error al cargar los clientes'
        });
    }
});

router.get('/visitas', auth.isAuthenticatedApi, async (req, res) => {
    try {
        const whereCliente = req.session.usuario.rol === 'cliente' ? { clienteId: req.session.usuario.clienteId } : {};
        
        const visitas = await VisitaRetiro.findAll({
            where: whereCliente,
            include: [
                { 
                    model: Cliente, 
                    as: 'cliente', 
                    attributes: ['rut', 'nombre_empresa'] 
                }
            ],
            order: [['fecha', 'DESC']]
        });

        res.json({
            success: true,
            data: visitas
        });
    } catch (error) {
        console.error('Error al obtener visitas:', error);
        res.status(500).json({
            success: false,
            message: 'Error al cargar las visitas'
        });
    }
});

// Ruta para estadísticas de visitas
router.get('/visitas/estadisticas', auth.isAuthenticatedApi, async (req, res) => {
    try {
        const whereCliente = req.session.usuario.rol === 'cliente' ? { clienteId: req.session.usuario.clienteId } : {};
        
        const [totalVisitas, visitasPendientes, visitasConfirmadas, visitasEvaluacion, visitasRetiro, visitasCanceladas] = await Promise.all([
            VisitaRetiro.count({ where: whereCliente }),
            VisitaRetiro.count({ where: { ...whereCliente, estado: 'pendiente' } }),
            VisitaRetiro.count({ where: { ...whereCliente, estado: 'confirmada' } }),
            VisitaRetiro.count({ where: { ...whereCliente, estado: 'evaluacion' } }),
            VisitaRetiro.count({ where: { ...whereCliente, estado: 'retiro' } }),
            VisitaRetiro.count({ where: { ...whereCliente, estado: 'cancelada' } })
        ]);

        res.json({
            success: true,
            data: {
                total: totalVisitas,
                pendientes: visitasPendientes,
                confirmadas: visitasConfirmadas,
                evaluacion: visitasEvaluacion,
                retiro: visitasRetiro,
                canceladas: visitasCanceladas
            }
        });
    } catch (error) {
        console.error('Error al obtener estadísticas de visitas:', error);
        res.status(500).json({
            success: false,
            message: 'Error al cargar las estadísticas de visitas'
        });
    }
});

// Rutas para notificaciones
router.get('/notificaciones', auth.isAuthenticatedApi, async (req, res) => {
    try {
        const notificaciones = await Notificacion.findAll({
            where: { usuarioId: req.session.usuario.id },
            order: [['createdAt', 'DESC']],
            limit: 10
        });

        res.json({
            success: true,
            data: notificaciones
        });
    } catch (error) {
        console.error('Error al obtener notificaciones:', error);
        res.status(500).json({
            success: false,
            message: 'Error al cargar las notificaciones'
        });
    }
});

router.get('/notificaciones/count', auth.isAuthenticatedApi, async (req, res) => {
    try {
        const count = await Notificacion.count({
            where: { 
                usuarioId: req.session.usuario.id,
                leida: false
            }
        });

        res.json({
            success: true,
            count: count
        });
    } catch (error) {
        console.error('Error al obtener conteo de notificaciones:', error);
        res.status(500).json({
            success: false,
            message: 'Error al cargar el conteo de notificaciones'
        });
    }
});

router.post('/notificaciones/marcar-leidas', auth.isAuthenticatedApi, async (req, res) => {
    try {
        await Notificacion.update(
            { leida: true },
            { 
                where: { 
                    usuarioId: req.session.usuario.id,
                    leida: false
                }
            }
        );

        res.json({
            success: true,
            message: 'Notificaciones marcadas como leídas'
        });
    } catch (error) {
        console.error('Error al marcar notificaciones como leídas:', error);
        res.status(500).json({
            success: false,
            message: 'Error al marcar las notificaciones como leídas'
        });
    }
});

// === RUTAS API PARA SOLICITUDES ===
router.get('/solicitudes/listar', auth.isAuthenticatedApi, async (req, res) => {
    try {
        const { usuario } = req.session;
        let solicitudes = [];
        
        if (usuario.rol === 'administrador') {
            solicitudes = await SolicitudRetiro.findAll({
                include: [{ 
                    model: Cliente,
                    as: 'cliente'
                }],
                order: [['created_at', 'DESC']]
            });
        } else if (usuario.rol === 'cliente' && req.session.cliente) {
            solicitudes = await SolicitudRetiro.findAll({
                where: { cliente_id: req.session.cliente.rut },
                order: [['created_at', 'DESC']]
            });
        }

        res.json({
            success: true,
            data: solicitudes
        });
    } catch (error) {
        console.error('Error al listar solicitudes:', error);
        res.status(500).json({
            success: false,
            message: 'Error al cargar las solicitudes',
            error: error.message
        });
    }
});

router.post('/solicitudes/crear', auth.isAuthenticatedApi, async (req, res) => {
    try {
        const { tipo_solicitud, descripcion, urgencia } = req.body;
        
        // Validar tipo de solicitud
        const tiposSolicitudValidos = ['retiro', 'evaluacion', 'cotizacion', 'visitas', 'otros'];
        if (!tipo_solicitud || !tiposSolicitudValidos.includes(tipo_solicitud)) {
            return res.status(400).json({
                success: false,
                message: 'Tipo de solicitud no válido'
            });
        }

        // Validar urgencia
        const urgenciasValidas = ['baja', 'media', 'alta'];
        if (urgencia && !urgenciasValidas.includes(urgencia)) {
            return res.status(400).json({
                success: false,
                message: 'Nivel de urgencia no válido'
            });
        }

        const nuevaSolicitud = await SolicitudRetiro.create({
            cliente_id: req.session.cliente.rut,
            tipo_solicitud,
            descripcion,
            urgencia: urgencia || 'media',
            estado: 'pendiente'
        });

        // Notificar a administradores
        const admins = await Usuario.findAll({
            where: { rol: 'administrador' }
        });

        // Crear notificaciones en paralelo
        const notificacionesPromises = admins.map(admin => 
            Notificacion.create({
                usuarioId: admin.id,
                tipo: 'nueva_solicitud', // Cambiado de 'solicitud' a 'nueva_solicitud'
                titulo: 'Nueva solicitud de retiro',
                mensaje: `Se ha registrado una nueva solicitud de ${tipo_solicitud}`,
                leida: false,
                fecha_creacion: new Date()
            }).catch(error => {
                console.error('Error al crear notificación:', error);
                return null; // Continuar incluso si falla una notificación
            })
        );

        await Promise.all(notificacionesPromises);

        res.json({
            success: true,
            message: 'Solicitud creada correctamente',
            data: nuevaSolicitud
        });
    } catch (error) {
        console.error('Error al crear solicitud:', error);
        res.status(500).json({
            success: false,
            message: 'Error al crear la solicitud',
            error: error.message
        });
    }
});

router.get('/solicitudes/:id', auth.isAuthenticatedApi, async (req, res) => {
    try {
        const { id } = req.params;
        const solicitud = await SolicitudRetiro.findByPk(id, {
            include: [{ 
                model: Cliente,
                as: 'cliente'
            }]
        });

        if (!solicitud) {
            return res.status(404).json({
                success: false,
                message: 'Solicitud no encontrada'
            });
        }

        // Verificar permisos para clientes
        if (req.session.usuario.rol === 'cliente' && 
            solicitud.cliente_id !== req.session.cliente.rut) {
            return res.status(403).json({
                success: false,
                message: 'No tienes permiso para ver esta solicitud'
            });
        }

        res.json({
            success: true,
            solicitud
        });
    } catch (error) {
        console.error('Error al obtener detalles de solicitud:', error);
        res.status(500).json({
            success: false,
            message: 'Error al cargar los detalles de la solicitud',
            error: error.message
        });
    }
});

router.put('/solicitudes/:id', auth.isAuthenticatedApi, async (req, res) => {
    try {
        const { id } = req.params;
        const { tipo_solicitud, descripcion, urgencia } = req.body;
        
        const solicitud = await SolicitudRetiro.findByPk(id);
        
        if (!solicitud) {
            return res.status(404).json({
                success: false,
                message: 'Solicitud no encontrada'
            });
        }

        // Verificar permisos
        if (req.session.usuario.rol === 'cliente' && 
            solicitud.cliente_id !== req.session.cliente.rut) {
            return res.status(403).json({
                success: false,
                message: 'No tienes permiso para editar esta solicitud'
            });
        }

        // Solo permitir editar solicitudes pendientes
        if (solicitud.estado !== 'pendiente') {
            return res.status(400).json({
                success: false,
                message: 'Solo se pueden editar solicitudes pendientes'
            });
        }

        // Actualizar solicitud
        await solicitud.update({
            tipo_solicitud,
            descripcion,
            urgencia
        });

        res.json({
            success: true,
            message: 'Solicitud actualizada correctamente',
            data: solicitud
        });
    } catch (error) {
        console.error('Error al actualizar solicitud:', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar la solicitud',
            error: error.message
        });
    }
});

// Importar rutas de la API
const regionRoutes = require('./api/regionRoutes');
const cmfBancosRoutes = require('./api/cmfBancos.routes');

// Registrar rutas
router.use('/regiones', regionRoutes);
router.use('/cmf-bancos', cmfBancosRoutes);

module.exports = router; 