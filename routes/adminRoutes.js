const express = require('express');
const router = express.Router();
const { isAuthenticated, isAdmin } = require('../middlewares/auth');
const Cliente = require('../models/Cliente');
const Usuario = require('../models/Usuario');
const SolicitudRetiro = require('../models/SolicitudRetiro');
const PrecioResiduo = require('../models/PrecioResiduo');

// Middleware para verificar si es administrador
router.use(isAuthenticated);
router.use(isAdmin);

// Ruta para la vista de solicitudes
router.get('/solicitud', async (req, res) => {
    try {
        const solicitudes = await SolicitudRetiro.findAll({
            include: [{ 
                model: Cliente,
                as: 'cliente',
                attributes: ['rut', 'nombre_empresa']
            }],
            order: [['created_at', 'DESC']]
        });

        const clientes = await Cliente.findAll({
            order: [['nombre_empresa', 'ASC']]
        });

        res.render('admin/solicitud', {
            titulo: 'Gestión de Solicitudes',
            solicitudes,
            clientes,
            clienteSeleccionado: req.query.cliente || '',
            urgenciaSeleccionada: req.query.urgencia || '',
            fechaSeleccionada: req.query.fecha || '',
            error: req.flash('error'),
            success: req.flash('success')
        });
    } catch (error) {
        console.error('Error al cargar solicitudes:', error);
        req.flash('error', 'Error al cargar la página');
        res.redirect('/dashboard');
    }
});

// Panel de administración principal
router.get('/', async (req, res) => {
    try {
        const clientes = await Cliente.findAll({
            include: [{
                model: Usuario,
                attributes: ['email', 'activo']
            }],
            order: [['createdAt', 'DESC']]
        });

        res.render('admin/clientes', {
            titulo: 'Panel de Administración',
            clientes,
            messages: {
                error: req.flash('error'),
                success: req.flash('success')
            }
        });
    } catch (error) {
        console.error('Error al cargar el panel de administración:', error);
        req.flash('error', 'Error al cargar el panel de administración');
        res.redirect('/dashboard');
    }
});

// Ruta para cotizaciones
router.get('/cotizaciones', async (req, res) => {
    try {
        res.render('admin/cotizaciones', {
            titulo: 'Gestión de Cotizaciones',
            messages: {
                error: req.flash('error'),
                success: req.flash('success')
            }
        });
    } catch (error) {
        console.error('Error al cargar cotizaciones:', error);
        req.flash('error', 'Error al cargar las cotizaciones');
        res.redirect('/admin');
    }
});

// Ruta para certificados
// router.get('/certificados', async (req, res) => {
//     try {
//         res.render('admin/certificados', {
//             certificados: [],
//             messages: {
//                 error: req.flash('error'),
//                 success: req.flash('success')
//             }
//         });
//     } catch (error) {
//         console.error('Error al cargar certificados:', error);
//         req.flash('error', 'Error al cargar los certificados');
//         res.redirect('/admin');
//     }
// });

// Ruta para visitas
router.get('/visitas', async (req, res) => {
    try {
        res.render('admin/visitas', {
            titulo: 'Gestión de Visitas',
            messages: {
                error: req.flash('error'),
                success: req.flash('success')
            }
        });
    } catch (error) {
        console.error('Error al cargar visitas:', error);
        req.flash('error', 'Error al cargar las visitas');
        res.redirect('/admin');
    }
});

// Listar clientes
router.get('/clientes', async (req, res) => {
    try {
        const clientes = await Cliente.findAll({
            include: [{
                model: Usuario,
                attributes: ['email', 'activo']
            }],
            order: [['createdAt', 'DESC']]
        });

        res.render('admin/clientes', {
            titulo: 'Gestión de Clientes',
            clientes,
            messages: {
                error: req.flash('error'),
                success: req.flash('success')
            }
        });
    } catch (error) {
        console.error('Error al listar clientes:', error);
        req.flash('error', 'Error al cargar la lista de clientes');
        res.redirect('/admin');
    }
});

// Ver detalles de cliente
router.get('/clientes/detalles/:id', async (req, res) => {
    try {
        const cliente = await Cliente.findByPk(req.params.id, {
            include: [{ model: Usuario }]
        });

        if (!cliente) {
            req.flash('error', 'Cliente no encontrado');
            return res.redirect('/admin/clientes');
        }

        res.render('admin/cliente-detalles', {
            titulo: 'Detalles del Cliente',
            cliente,
            editar: false,
            messages: {
                error: req.flash('error'),
                success: req.flash('success')
            }
        });
    } catch (error) {
        console.error('Error al mostrar detalles del cliente:', error);
        req.flash('error', 'Error al cargar los detalles del cliente');
        res.redirect('/admin/clientes');
    }
});

// Mostrar formulario de edición
router.get('/clientes/editar/:id', async (req, res) => {
    try {
        const cliente = await Cliente.findByPk(req.params.id, {
            include: [{ model: Usuario }]
        });

        if (!cliente) {
            req.flash('error', 'Cliente no encontrado');
            return res.redirect('/admin/clientes');
        }

        res.render('admin/cliente-detalles', {
            titulo: 'Editar Cliente',
            cliente,
            editar: true,
            messages: {
                error: req.flash('error'),
                success: req.flash('success')
            }
        });
    } catch (error) {
        console.error('Error al cargar formulario de edición:', error);
        req.flash('error', 'Error al cargar el formulario de edición');
        res.redirect('/admin/clientes');
    }
});

// Actualizar cliente
router.post('/clientes/editar/:id', async (req, res) => {
    try {
        const cliente = await Cliente.findByPk(req.params.id);
        if (!cliente) {
            req.flash('error', 'Cliente no encontrado');
            return res.redirect('/admin/clientes');
        }

        const {
            rut,
            nombreEmpresa,
            email,
            telefono,
            contactoPrincipal,
            direccion,
            comuna,
            ciudad,
            region,
            estado
        } = req.body;

        await cliente.update({
            rut,
            nombreEmpresa,
            email,
            telefono,
            contactoPrincipal,
            direccion,
            comuna,
            ciudad,
            region,
            estado: estado === '1'
        });

        if (email !== cliente.email) {
            await Usuario.update(
                { email },
                { where: { id: cliente.usuarioId } }
            );
        }

        req.flash('success', 'Cliente actualizado exitosamente');
        res.redirect('/admin/clientes');
    } catch (error) {
        console.error('Error al actualizar cliente:', error);
        req.flash('error', 'Error al actualizar el cliente');
        res.redirect(`/admin/clientes/editar/${req.params.id}`);
    }
});

// Eliminar cliente
router.get('/clientes/eliminar/:id', async (req, res) => {
    try {
        const cliente = await Cliente.findByPk(req.params.id);
        if (!cliente) {
            req.flash('error', 'Cliente no encontrado');
            return res.redirect('/admin/clientes');
        }

        await Usuario.destroy({ where: { id: cliente.usuarioId } });
        await cliente.destroy();

        req.flash('success', 'Cliente eliminado exitosamente');
        res.redirect('/admin/clientes');
    } catch (error) {
        console.error('Error al eliminar cliente:', error);
        req.flash('error', 'Error al eliminar el cliente');
        res.redirect('/admin/clientes');
    }
});

// Ruta para cambiar estado de solicitud
router.post('/solicitud/cambiar-estado/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body;

        const solicitud = await SolicitudRetiro.findByPk(id);
        if (!solicitud) {
            req.flash('error', 'Solicitud no encontrada');
            return res.redirect('/admin/solicitud');
        }

        await solicitud.update({ estado });
        req.flash('success', 'Estado de solicitud actualizado correctamente');
        res.redirect('/admin/solicitud');
    } catch (error) {
        console.error('Error al cambiar estado de solicitud:', error);
        req.flash('error', 'Error al actualizar el estado de la solicitud');
        res.redirect('/admin/solicitud');
    }
});

module.exports = router; 