// routes/perfilRoutes.js
const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middlewares/auth'); // Descomentado para restaurar protección
const pool = require('../config/database');
const bcrypt = require('bcrypt');
const perfilController = require('../controllers/perfilController');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configuración de multer para subir imágenes de perfil
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    const dir = path.join(__dirname, '../public/uploads/perfiles');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function(req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `perfil-${req.session.usuario.id}-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten archivos de imagen.'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: fileFilter
});

// Ruta para mostrar el perfil del usuario (abierta)
router.get('/', isAuthenticated, perfilController.getPerfil);

// Ruta para actualizar el perfil (abierta)
router.post('/actualizar', isAuthenticated, perfilController.actualizarPerfil);

// Ruta para cambiar la contraseña (abierta)
router.post('/cambiar-password', isAuthenticated, perfilController.cambiarPassword);

// Ruta para mostrar el formulario de cambio de contraseña
router.get('/cambiar-password', isAuthenticated, (req, res) => {
  res.render('perfil/cambiar-password', {
    titulo: 'Cambiar Contraseña',
    usuario: req.session.usuario,
    error: req.flash('error'),
    success: req.flash('success')
  });
});

// Ruta para actualizar la imagen de perfil
router.post('/actualizar-imagen', isAuthenticated, upload.single('imagenPerfil'), perfilController.actualizarImagen);

module.exports = router;