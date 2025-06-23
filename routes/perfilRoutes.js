// routes/perfilRoutes.js
const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middlewares/auth'); // Descomentado para restaurar protección
const pool = require('../config/database');
const bcrypt = require('bcrypt');
const { Cliente, Region, Comuna } = require('../models');

// Ruta para mostrar el perfil del usuario
router.get('/', isAuthenticated, async (req, res) => {
    try {
        const userId = req.session.usuario.id;
        
        // Obtener datos del usuario
        const [usuarios] = await pool.query(
            'SELECT * FROM usuarios WHERE id = ?',
            [userId]
        );
        
        if (usuarios.length === 0) {
            req.flash('error', 'Usuario no encontrado');
            return res.redirect('/dashboard');
        }
        
        // No enviar la contraseña al frontend
        const usuario = usuarios[0];
        delete usuario.password;

        // Si es un cliente, verificar si tiene perfil de cliente
        if (req.session.usuario.rol === 'cliente' && !req.session.clienteId) {
            return res.redirect('/perfil/registro-cliente');
        }

        // Si tiene perfil de cliente, obtener sus datos
        let datosCliente = null;
        if (req.session.clienteId) {
            datosCliente = await Cliente.findByPk(req.session.clienteId, {
                include: [
                    { model: Region, as: 'RegionCliente' },
                    { model: Comuna }
                ]
            });
        }
        
        res.render('perfil/perfil', {
            titulo: 'Mi Perfil',
            perfilUsuario: usuario,
            cliente: datosCliente
        });
    } catch (error) {
        console.error('Error al cargar perfil:', error);
        req.flash('error', 'Error al cargar la información del perfil');
        res.redirect('/dashboard');
    }
});

// Ruta para mostrar el formulario de registro de cliente
router.get('/registro-cliente', isAuthenticated, async (req, res) => {
    try {
        if (req.session.usuario.rol !== 'cliente') {
            req.flash('error', 'No tienes permisos para acceder a esta sección');
            return res.redirect('/perfil');
        }

        // Verificar si ya tiene un perfil de cliente
        const clienteExistente = await Cliente.findOne({
            where: { usuario_id: req.session.usuario.id }
        });

        if (clienteExistente) {
            return res.redirect('/perfil');
        }

        // Obtener regiones para el formulario
        const regiones = await Region.findAll({
            order: [['nombre', 'ASC']]
        });
        
        res.render('perfil/registro-cliente', {
            titulo: 'Registro de Datos de Cliente',
            usuario: req.session.usuario,
            regiones: regiones,
            messages: {
                error: req.flash('error'),
                success: req.flash('success')
            },
            currentPage: 'perfil'
        });
    } catch (error) {
        console.error('Error al cargar formulario de registro:', error);
        req.flash('error', 'Error al cargar el formulario');
        res.redirect('/perfil');
    }
});

// Ruta para procesar el registro de cliente
router.post('/registro-cliente', isAuthenticated, async (req, res) => {
    try {
        if (req.session.usuario.rol !== 'cliente') {
            req.flash('error', 'No tienes permisos para realizar esta acción');
            return res.redirect('/perfil');
        }

        const {
            rut,
            nombre_empresa,
            telefono,
            contacto_principal,
            direccion,
            comuna_id,
            region_id
        } = req.body;

        // Crear el cliente
        const cliente = await Cliente.create({
            rut,
            usuario_id: req.session.usuario.id,
            nombre_empresa,
            telefono,
            contacto_principal,
            direccion,
            comuna_id,
            region_id
        });

        // Guardar el ID del cliente en la sesión
        req.session.clienteId = cliente.rut;

        req.flash('success', 'Perfil de cliente creado exitosamente');
        res.redirect('/dashboard/cliente');
    } catch (error) {
        console.error('Error al registrar cliente:', error);
        req.flash('error', 'Error al registrar los datos del cliente');
        res.redirect('/perfil/registro-cliente');
    }
});

// Ruta para actualizar el perfil (abierta)
router.post('/actualizar', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.session.usuario;
    const { nombre, email, telefono, direccion, empresa } = req.body;
    
    // Verificar si el email ya está en uso por otro usuario
    if (email !== req.session.usuario.email) {
      const [existeEmail] = await pool.query(
        'SELECT id FROM usuarios WHERE email = ? AND id != ?',
        [email, id]
      );
      
      if (existeEmail.length > 0) {
        req.flash('error', 'El email ya está en uso por otro usuario');
        return res.redirect('/perfil');
      }
    }
    
    // Actualizar datos
    await pool.query(
      'UPDATE usuarios SET nombre = ?, email = ?, telefono = ?, direccion = ?, empresa = ? WHERE id = ?',
      [nombre, email, telefono, direccion, empresa, id]
    );
    
    // Actualizar datos en la sesión
    req.session.usuario.nombre = nombre;
    req.session.usuario.email = email;
    
    req.flash('success', 'Perfil actualizado exitosamente');
    res.redirect('/perfil');
  } catch (error) {
    console.error('Error al actualizar perfil:', error);
    req.flash('error', 'Error al actualizar el perfil');
    res.redirect('/perfil');
  }
});

// Ruta para cambiar la contraseña (abierta)
router.post('/cambiar-password', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.session.usuario;
    const { password_actual, password_nuevo, password_confirmar } = req.body;
    
    // Validar que la nueva contraseña y la confirmación coincidan
    if (password_nuevo !== password_confirmar) {
      req.flash('error', 'Las contraseñas nuevas no coinciden');
      return res.redirect('/perfil');
    }
    
    // Obtener contraseña actual
    const [usuarios] = await pool.query(
      'SELECT password FROM usuarios WHERE id = ?',
      [id]
    );
    
    // Verificar contraseña actual
    const passwordMatch = await bcrypt.compare(password_actual, usuarios[0].password);
    if (!passwordMatch) {
      req.flash('error', 'La contraseña actual es incorrecta');
      return res.redirect('/perfil');
    }
    
    // Encriptar nueva contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password_nuevo, salt);
    
    // Actualizar contraseña
    await pool.query(
      'UPDATE usuarios SET password = ? WHERE id = ?',
      [hashedPassword, id]
    );
    
    req.flash('success', 'Contraseña actualizada exitosamente');
    res.redirect('/perfil');
  } catch (error) {
    console.error('Error al cambiar contraseña:', error);
    req.flash('error', 'Error al cambiar la contraseña');
    res.redirect('/perfil');
  }
}); // Cierre del try-catch y del router.post

// Ruta para mostrar el formulario de cambio de contraseña
router.get('/cambiar-password', isAuthenticated, (req, res) => {
  res.render('perfil/cambiar-password', {
    titulo: 'Cambiar Contraseña',
    usuario: req.session.usuario,
    error: req.flash('error'),
    success: req.flash('success')
  });
});

module.exports = router;