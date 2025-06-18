// routes/certificadoRoutes.js
const express = require('express');
const router = express.Router();
const certificadoController = require('../controllers/certificadoController');
const auth = require('../middlewares/auth');

// Listar certificados
router.get('/admin/certificados', auth.isAuthenticated, certificadoController.listar);

// Descargar PDF
router.get('/admin/certificados/descargar/:id', auth.isAuthenticated, certificadoController.descargarPDF);

// Crear certificado
router.get('/admin/certificados/crear', auth.hasRole(['administrador', 'operador']), certificadoController.mostrarCrear);
router.post('/admin/certificados/crear', auth.hasRole(['administrador', 'operador']), certificadoController.uploadMiddleware, certificadoController.crear);

// Editar certificado
router.get('/admin/certificados/editar/:id', auth.hasRole(['administrador', 'operador']), certificadoController.mostrarEditar);
router.post('/admin/certificados/editar/:id', auth.hasRole(['administrador', 'operador']), certificadoController.uploadMiddleware, certificadoController.editar);

// Eliminar certificado
router.post('/admin/certificados/eliminar/:id', auth.hasRole(['administrador', 'operador']), certificadoController.eliminar);

module.exports = router;