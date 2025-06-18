const express = require('express');
const router = express.Router();
const cotizacionController = require('../controllers/cotizacionController');

// Importar las rutas reales de clientes
const clienteRoutes = require('./clienteRoutes');
router.use('/', clienteRoutes);

// Importar las rutas de regiones
const regionRoutes = require('./regionRoutes');
router.use('/', regionRoutes);

// ... aquí puedes dejar otras rutas API si las tienes ...

router.get('/precios-residuos', cotizacionController.listarPreciosResiduos);

module.exports = router; 