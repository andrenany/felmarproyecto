const express = require('express');
const router = express.Router();
const regionController = require('../controllers/regionController');

// Rutas públicas
router.get('/regiones', regionController.listarRegiones);
router.get('/regiones/:regionId/comunas', regionController.getComunasByRegion);

module.exports = router; 