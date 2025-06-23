// controllers/dashboardController.js
const { Usuario, SolicitudRetiro, VisitaRetiro, Cliente, Cotizacion } = require('../models');
const { Op, Sequelize } = require('sequelize');
const sequelize = require('../config/database');

/**
 * Renderiza el dashboard con estadísticas y actividades recientes
 */
exports.mostrarDashboard = async (req, res) => {
    try {
        // Obtener estadísticas según el rol del usuario
        let stats = {
            solicitudes: { total: 0, pendientes: 0 },
            cotizaciones: { total: 0, pendientes: 0 },
            visitas: { proximas: 0 }
        };
        
        // Filtrar por cliente si el usuario es cliente
        const whereCliente = req.usuario.rol === 'cliente' 
            ? { clienteId: req.usuario.clienteId } 
            : {};
        
        // Estadísticas de solicitudes
        const [totalSolicitudes, solicitudesPendientes] = await Promise.all([
            Solicitud.count({ where: whereCliente }),
            Solicitud.count({ 
                where: { 
                    ...whereCliente,
                    estado: 'pendiente'
                } 
            })
        ]);
        
        stats.solicitudes.total = totalSolicitudes;
        stats.solicitudes.pendientes = solicitudesPendientes;
        
        // Estadísticas de cotizaciones
        const [totalCotizaciones, cotizacionesPendientes] = await Promise.all([
            Cotizacion.count({ where: whereCliente }),
            Cotizacion.count({ 
                where: { 
                    ...whereCliente,
                    estado: 'pendiente'
                } 
            })
        ]);
        
        stats.cotizaciones.total = totalCotizaciones;
        stats.cotizaciones.pendientes = cotizacionesPendientes;
        
        // Próximas visitas (para la semana actual)
        const hoy = new Date();
        const finDeSemana = new Date();
        finDeSemana.setDate(hoy.getDate() + 7);
        
        const visitasProximas = await Visita.count({
            where: {
                ...whereCliente,
                fecha: {
                    [Op.between]: [hoy, finDeSemana]
                }
            }
        });
        
        stats.visitas.proximas = visitasProximas;
        
        // Para administradores, añadir estadísticas de clientes
        if (['admin', 'operador'].includes(req.usuario.rol)) {
            const totalClientes = await Cliente.count();
            const clientesNuevosMes = await Cliente.count({
                where: {
                    createdAt: {
                        [Op.gte]: new Date(new Date().setDate(1)) // Primer día del mes actual
                    }
                }
            });
            
            stats.clientes = {
                total: totalClientes,
                nuevosMes: clientesNuevosMes
            };
        }
        
        // Obtener actividades recientes
        const actividades = await obtenerActividadesRecientes(req.usuario);
        
        if (req.usuario.rol === 'administrador') {
            // Datos para las tablas del dashboard de admin
            const solicitudesUrgentes = await SolicitudRetiro.findAll({
                where: { estado: 'pendiente' },
                order: [['fechaSolicitud', 'ASC']],
                limit: 5,
                include: [{ model: Cliente, attributes: ['nombreEmpresa'] }]
            });

            const proximasVisitas = await VisitaRetiro.findAll({
                where: { fecha: { [Op.gte]: new Date() } },
                order: [['fecha', 'ASC']],
                limit: 5,
                include: [{ model: Cliente, attributes: ['nombreEmpresa'] }, { model: Usuario, as: 'operador', attributes: ['nombre'] }]
            });

            const clientesRecientes = await Cliente.findAll({
                order: [['createdAt', 'DESC']],
                limit: 5,
            });

            return res.render('dashboard/admin', {
                usuario: req.usuario,
                solicitudesUrgentes,
                proximasVisitas,
                clientesRecientes
            });
        } else if (req.usuario.rol === 'cliente') {
            // Buscar información del cliente para determinar si mostrar notificación
            const cliente = await Cliente.findOne({ 
                where: { usuario_id: req.usuario.id } 
            });
            
            // Obtener estadísticas específicas del cliente
            const [solicitudes, visitas] = await Promise.all([
                SolicitudRetiro.findAll({
                    where: { clienteRut: cliente ? cliente.rut : null },
                    order: [['createdAt', 'DESC']]
                }),
                VisitaRetiro.findAll({
                    where: { clienteId: cliente ? cliente.rut : null }
                })
            ]);

            const misSolicitudes = solicitudes.length;
            const solicitudesPendientes = solicitudes.filter(s => s.estado.toLowerCase() === 'pendiente').length;
            const proximasVisitas = visitas.filter(v => 
                new Date(v.fecha) >= new Date() && 
                ['pendiente', 'confirmada'].includes(v.estado.toLowerCase())
            ).length;

            const ultimasSolicitudes = solicitudes.slice(0, 5).map(s => ({
                id: s.id,
                fechaSolicitud: s.createdAt,
                direccionRetiro: s.direccion_especifica,
                estado: s.estado
            }));
            
            return res.render('dashboard/cliente', {
                currentPage: 'dashboard',
                stats,
                actividades,
                usuario: {
                    nombre: req.usuario.nombre,
                    rol: req.usuario.rol,
                    clienteId: req.usuario.clienteId
                },
                mostrarNotificacion: !cliente,
                misSolicitudes,
                solicitudesPendientes,
                proximasVisitas,
                ultimasSolicitudes
            });
        }
        
        res.render('dashboard/index', {
            currentPage: 'dashboard',
            stats,
            actividades,
            usuario: {
                nombre: req.usuario.nombre,
                rol: req.usuario.rol
            }
        });
        
    } catch (error) {
        console.error('Error en dashboard:', error);
        res.status(500).render('error', {
            mensaje: 'Error al cargar el dashboard',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
};

/**
 * Obtiene las actividades recientes para mostrar en el dashboard
 */
async function obtenerActividadesRecientes(usuario) {
    try {
        // Filtrar por cliente si el usuario es cliente
        const whereCliente = usuario.rol === 'cliente' 
            ? { clienteId: usuario.clienteId } 
            : {};
        
        // Obtener últimas solicitudes
        const solicitudesRecientes = await Solicitud.findAll({
            where: whereCliente,
            include: [
                { model: Cliente, attributes: ['nombre'] }
            ],
            order: [['createdAt', 'DESC']],
            limit: 3
        });
        
        // Obtener últimas cotizaciones
        const cotizacionesRecientes = await Cotizacion.findAll({
            where: whereCliente,
            include: [
                { model: Cliente, attributes: ['nombre'] },
                { model: Solicitud, attributes: ['codigo'] }
            ],
            order: [['createdAt', 'DESC']],
            limit: 3
        });
        
        // Obtener próximas visitas
        const hoy = new Date();
        const proximaSemana = new Date();
        proximaSemana.setDate(hoy.getDate() + 7);
        
        const visitasProximas = await Visita.findAll({
            where: {
                ...whereCliente,
                fecha: {
                    [Op.between]: [hoy, proximaSemana]
                }
            },
            include: [
                { model: Cliente, attributes: ['nombre'] },
                { model: Solicitud, attributes: ['codigo'] }
            ],
            order: [['fecha', 'ASC']],
            limit: 3
        });
        
        // Dar formato a las actividades
        const actividades = [
            ...solicitudesRecientes.map(solicitud => ({
                tipo: 'solicitud',
                icono: 'clipboard-list',
                color: 'blue',
                titulo: `Nueva solicitud ${solicitud.codigo}`,
                subtitulo: solicitud.Cliente.nombre,
                fecha: getTimeAgo(solicitud.createdAt),
                enlace: `/solicitudes/${solicitud.id}`
            })),
            ...cotizacionesRecientes.map(cotizacion => ({
                tipo: 'cotizacion',
                icono: 'file-text',
                color: 'amber',
                titulo: `Cotización ${cotizacion.codigo}`,
                subtitulo: `Para solicitud ${cotizacion.Solicitud.codigo}`,
                fecha: getTimeAgo(cotizacion.createdAt),
                enlace: `/cotizaciones/${cotizacion.id}`
            })),
            ...visitasProximas.map(visita => ({
                tipo: 'visita',
                icono: 'truck',
                color: 'green',
                titulo: `Visita programada para ${formatDate(visita.fecha)}`,
                subtitulo: `${visita.tipo} - ${visita.Cliente.nombre}`,
                fecha: getTimeAgo(visita.createdAt),
                enlace: `/visitas/${visita.id}`
            }))
        ];
        
        // Ordenar por fecha de creación (más reciente primero)
        return actividades.sort((a, b) => {
            return new Date(b.createdAt) - new Date(a.createdAt);
        }).slice(0, 5); // Limitar a las 5 más recientes
        
    } catch (error) {
        console.error('Error al obtener actividades recientes:', error);
        return [];
    }
}

/**
 * Formatea una fecha como tiempo relativo (ej: "hace 2 días")
 */
function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    
    let interval = Math.floor(seconds / 31536000);
    if (interval > 1) return `Hace ${interval} años`;
    
    interval = Math.floor(seconds / 2592000);
    if (interval > 1) return `Hace ${interval} meses`;
    
    interval = Math.floor(seconds / 86400);
    if (interval > 1) return `Hace ${interval} días`;
    
    interval = Math.floor(seconds / 3600);
    if (interval > 1) return `Hace ${interval} horas`;
    
    interval = Math.floor(seconds / 60);
    if (interval > 1) return `Hace ${interval} minutos`;
    
    return 'Hace unos segundos';
}

/**
 * Formatea una fecha (ej: "24/05/2025")
 */
function formatDate(date) {
    return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

const dashboardController = {
    mostrarDashboardAdmin: async (req, res) => {
        try {
            // Datos para las tablas del dashboard de admin
            const solicitudesUrgentes = await SolicitudRetiro.findAll({
                where: { estado: 'pendiente' },
                order: [['fechaSolicitud', 'ASC']],
                limit: 5,
                include: [{ model: Cliente, attributes: ['nombreEmpresa'], required: false }]
            });

            const proximasVisitas = await VisitaRetiro.findAll({
                where: { fecha: { [Op.gte]: new Date() } },
                order: [['fecha', 'ASC']],
                limit: 5,
                include: [
                    { model: Cliente, attributes: ['nombreEmpresa'], required: false },
                    { model: Usuario, as: 'operador', attributes: ['nombre'], required: false }
                ]
            });

            const clientesRecientes = await Cliente.findAll({
                order: [['createdAt', 'DESC']],
                limit: 5,
            });
            
             // Obtener datos para los gráficos
            const clientesPorComuna = await Cliente.findAll({
                attributes: ['comuna', [sequelize.fn('COUNT', sequelize.col('comuna')), 'total']],
                group: ['comuna'],
                order: [[sequelize.col('total'), 'DESC']],
                limit: 10
            });
            
            const cotizacionesPorEstado = await Cotizacion.findAll({
                attributes: ['estado', [sequelize.fn('COUNT', sequelize.col('estado')), 'total']],
                group: ['estado']
            });

            const clientesComunaLabels = clientesPorComuna.map(c => c.comuna);
            const clientesComunaData = clientesPorComuna.map(c => c.get('total'));

            const cotizacionesEstadoLabels = cotizacionesPorEstado.map(c => c.estado);
            const cotizacionesEstadoData = cotizacionesPorEstado.map(c => c.get('total'));

            return res.render('dashboard/admin', {
                layout: 'layouts/admin',
                usuario: req.session.usuario,
                solicitudesUrgentes,
                proximasVisitas,
                clientesRecientes,
                // Datos para los gráficos
                clientesComunaLabels,
                clientesComunaData,
                cotizacionesEstadoLabels,
                cotizacionesEstadoData
            });
        } catch (error) {
            console.error('Error al mostrar el dashboard de administrador:', error);
            res.status(500).send('Error al cargar el dashboard');
        }
    },
    // Obtener estadísticas para el dashboard administrativo
    getAdminStats: async () => {
        try {
            // Total de clientes (usuarios con rol 'cliente')
            const totalClientes = await Usuario.count({
                where: {
                    rol: 'cliente'
                }
            });

            // Total de solicitudes pendientes
            const solicitudesPendientes = await SolicitudRetiro.count({
                where: {
                    estado: 'pendiente'
                }
            });

            // Total de visitas programadas para hoy
            const hoy = new Date();
            const fechaHoy = hoy.toISOString().split('T')[0]; // Formato YYYY-MM-DD

            const visitasHoy = await VisitaRetiro.count({
                where: {
                    fecha: fechaHoy
                }
            });

            // Total de servicios completados
            const serviciosCompletados = await VisitaRetiro.count({
                where: {
                    estado: 'retiro'
                }
            });

            return {
                totalClientes,
                solicitudesPendientes,
                visitasHoy,
                serviciosCompletados
            };
        } catch (error) {
            console.error('Error al obtener estadísticas:', error);
            throw error;
        }
    },

    // Renderizar dashboard administrativo
    renderAdminDashboard: async (req, res) => {
        try {
            const stats = await dashboardController.getAdminStats();

            // Obtener cotizaciones por estado
            const cotizacionesPorEstado = await Cotizacion.findAll({
                attributes: [
                    'estado',
                    [Sequelize.fn('COUNT', Sequelize.col('estado')), 'cantidad']
                ],
                group: ['estado']
            });
            const estados = ['pendiente', 'aceptada', 'rechazada', 'vencida'];
            const cotizacionesEstadoData = estados.map(estado => {
                const found = cotizacionesPorEstado.find(c => c.estado === estado);
                return found ? parseInt(found.dataValues.cantidad) : 0;
            });

            // Obtener clientes por comuna
            const clientesPorComuna = await Cliente.findAll({
                attributes: [
                    'comuna_id',
                    [Sequelize.fn('COUNT', Sequelize.col('comuna_id')), 'cantidad']
                ],
                include: [{
                    model: require('../models/Comuna'),
                    attributes: ['nombre']
                }],
                group: ['comuna_id', 'Comuna.id'],
                order: [[Sequelize.fn('COUNT', Sequelize.col('comuna_id')), 'DESC']],
                limit: 10 // Top 10 comunas
            });
            const clientesComunaLabels = clientesPorComuna.map(c => c.Comuna ? c.Comuna.nombre : 'Desconocida');
            const clientesComunaData = clientesPorComuna.map(c => parseInt(c.dataValues.cantidad));

            res.render('dashboard/admin', {
                usuario: req.session.usuario,
                titulo: 'Panel de Administración',
                ...stats,
                cotizacionesEstadoData,
                cotizacionesEstadoLabels: estados,
                clientesComunaLabels,
                clientesComunaData
            });
        } catch (error) {
            console.error('Error al renderizar dashboard:', error);
            req.flash('error', 'Error al cargar el dashboard');
            res.redirect('/');
        }
    }
};

module.exports = dashboardController;