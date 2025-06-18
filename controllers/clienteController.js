// controllers/clienteController.js
const { Cliente, Usuario, SolicitudRetiro, Comuna } = require('../models');
const Region = require('../models/Region');
const { Op } = require('sequelize');

// Función para validar solo el formato del RUT chileno
const validarRut = (rut) => {
  // Eliminar puntos y guión
  const rutLimpio = rut.replace(/[.-]/g, '');
  // Validar formato básico (debe tener entre 7 y 8 dígitos + dígito verificador)
  if (!/^[0-9]{7,8}[0-9kK]$/.test(rutLimpio)) {
    return { valido: false, error: 'formato' };
  }
  return { valido: true };
};

// Función para formatear RUT
const formatearRut = (rut) => {
  // Eliminar puntos y guión
  const rutLimpio = rut.replace(/[.-]/g, '');
  
  // Separar número y dígito verificador
  const numero = rutLimpio.slice(0, -1);
  const dv = rutLimpio.slice(-1).toLowerCase();
  
  // Asegurar que el número tenga 8 dígitos (rellenar con 0 a la izquierda)
  const numeroCompleto = numero.padStart(8, '0');
  
  // Formatear número con puntos
  const rutFormateado = numeroCompleto.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  
  // Retornar RUT formateado con guión
  return rutFormateado + '-' + dv;
};

const clienteController = {
  // Listar todos los clientes con sus usuarios asociados
  listarClientes: async (req, res) => {
    try {
      const clientes = await Cliente.findAll({
        include: [
          {
            model: Usuario,
            attributes: ['id', 'email', 'activo', 'nombre'],
            where: { rol: 'cliente' }
          },
          {
            model: Comuna,
            attributes: ['nombre'],
            include: [
              {
                model: Region,
                as: 'Region',
                attributes: ['nombre']
              }
            ]
          }
        ],
        attributes: [
          'rut',
          'nombre_empresa',
          'telefono',
          'contacto_principal',
          'direccion',
          'comuna_id',
          'costo_operativo_km',
          'costo_operativo_otros'
        ],
        order: [['created_at', 'DESC']]
      });

      res.json({
        success: true,
        clientes: clientes
      });
    } catch (error) {
      console.error('Error al listar clientes:', error);
      res.status(500).json({
        success: false,
        message: 'Error al cargar los clientes'
      });
    }
  },

  // Obtener un cliente específico
  obtenerCliente: async (req, res) => {
    try {
      const { rut } = req.params;
      const rutFormateado = formatearRut(rut);
      // Primero buscar el cliente
      const cliente = await Cliente.findOne({
        where: { rut: rutFormateado },
        include: [
          {
            model: Usuario,
            attributes: ['id', 'email', 'activo', 'nombre'],
            where: { rol: 'cliente' }
          },
          {
            model: Comuna,
            attributes: ['nombre'],
            include: [
              {
                model: Region,
                as: 'Region',
                attributes: ['nombre']
              }
            ]
          }
        ],
        attributes: [
          'rut',
          'nombre_empresa',
          'telefono',
          'contacto_principal',
          'direccion',
          'comuna_id',
          'costo_operativo_km',
          'costo_operativo_otros'
        ]
      });

      if (!cliente) {
        return res.status(404).json({
          success: false,
          message: 'Cliente no encontrado'
        });
      }

      res.json({
        success: true,
        cliente: cliente
      });
    } catch (error) {
      console.error('Error al obtener cliente:', error);
      res.status(500).json({
        success: false,
        message: 'Error al cargar el cliente'
      });
    }
  },

  // Crear nuevo cliente
  crearCliente: async (req, res) => {
    try {
      // Permitir ambos formatos de campos (camelCase y snake_case)
      const {
        rut,
        nombreEmpresa,
        nombre_empresa,
        email,
        telefono,
        contactoPrincipal,
        contacto_principal,
        direccion,
        comuna_id,
        comunaId,
        region_id,
        regionId
      } = req.body;

      // Normalizar campos
      const nombreEmpresaFinal = nombreEmpresa || nombre_empresa;
      const contactoPrincipalFinal = contactoPrincipal || contacto_principal;
      const comunaIdFinal = comuna_id || comunaId;
      const regionIdFinal = region_id || regionId;

      // Obtener la contraseña correctamente del body
      const passwordFinal = req.body.password;
      // Validar campos requeridos
      if (!rut || !nombreEmpresaFinal || !email || !telefono || !contactoPrincipalFinal || !direccion || !comunaIdFinal || !regionIdFinal) {
        return res.status(400).json({
          success: false,
          message: 'Todos los campos son obligatorios'
        });
      }
      // Validar que la contraseña esté presente y no vacía
      if (!passwordFinal || passwordFinal.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'La contraseña es obligatoria para crear el cliente.'
        });
      }

      // Validar formato del RUT
      const resultadoRut = validarRut(rut);
      if (!resultadoRut.valido) {
        return res.status(400).json({
          success: false,
          message: 'El formato del RUT es incorrecto. Debe ser: 12.345.678-9'
        });
      }

      // Formatear RUT antes de guardar
      const rutFormateado = formatearRut(rut);

      // Verificar si ya existe un cliente con ese RUT
      const clienteExistente = await Cliente.findOne({ where: { rut: rutFormateado } });
      if (clienteExistente) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe un cliente con ese RUT'
        });
      }

      // Verificar si ya existe un usuario con ese email
      const usuarioExistente = await Usuario.findOne({ where: { email } });
      if (usuarioExistente) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe un usuario registrado con ese correo electrónico'
        });
      }

      // Validar que la región existe
      const region = await Region.findByPk(regionIdFinal);
      if (!region) {
        return res.status(400).json({
          success: false,
          message: 'La región seleccionada no existe'
        });
      }

      // Validar que la comuna existe y pertenece a la región
      const comuna = await Comuna.findOne({ where: { id: comunaIdFinal, region_id: regionIdFinal } });
      if (!comuna) {
        return res.status(400).json({
          success: false,
          message: 'La comuna seleccionada no existe o no pertenece a la región seleccionada'
        });
      }

      // Crear usuario asociado al cliente
      const usuario = await Usuario.create({
        nombre: contactoPrincipalFinal,
        email: email,
        password: passwordFinal,
        rol: 'cliente',
        activo: true
      });

      // Crear el cliente
      const nuevoCliente = await Cliente.create({
        rut: rutFormateado,
        nombre_empresa: nombreEmpresaFinal,
        telefono,
        contacto_principal: contactoPrincipalFinal,
        direccion,
        comuna_id: comunaIdFinal,
        region_id: regionIdFinal,
        usuario_id: usuario.id
      });

      res.status(201).json({
        success: true,
        message: 'Cliente creado exitosamente',
        cliente: nuevoCliente
      });

    } catch (error) {
      console.error('Error al crear cliente:', error);
      // Manejar errores específicos
      if (error.name === 'SequelizeUniqueConstraintError') {
        if (error.errors && error.errors[0].path === 'email') {
          return res.status(400).json({
            success: false,
            message: 'Ya existe un usuario registrado con ese correo electrónico'
          });
        }
        if (error.errors && error.errors[0].path === 'rut') {
          return res.status(400).json({
            success: false,
            message: 'Ya existe un cliente con ese RUT'
          });
        }
      }
      res.status(500).json({
        success: false,
        message: 'Error al crear el cliente. Por favor, intente nuevamente.'
      });
    }
  },

  // Actualizar cliente
  actualizarCliente: async (req, res) => {
    try {
      const { rut } = req.params;
      const rutFormateado = formatearRut(rut);
      const { 
        nombreEmpresa, 
        email, 
        telefono, 
        contactoPrincipal, 
        direccion, 
        comuna_id,
        costo_operativo_km,
        costo_operativo_otros
      } = req.body;

      // Primero buscar el cliente con su usuario asociado
      let cliente = await Cliente.findOne({
        where: { rut: rutFormateado },
        include: [
          {
            model: Usuario,
            attributes: ['id', 'email'],
            where: { rol: 'cliente' }
          },
          {
            model: Comuna,
            attributes: ['nombre'],
            include: [
              {
                model: Region,
                as: 'Region',
                attributes: ['nombre']
              }
            ]
          }
        ]
      });

      if (!cliente) {
        return res.status(404).json({
          success: false,
          message: 'Cliente no encontrado'
        });
      }

      // Actualizar cliente
      // Si no se recibe comuna_id, mantener el valor actual
      let nuevaComunaId = comuna_id;
      if (typeof nuevaComunaId === 'undefined' || nuevaComunaId === '' || nuevaComunaId === null) {
        nuevaComunaId = cliente.comuna_id;
      }
      await cliente.update({
        nombre_empresa: nombreEmpresa,
        telefono,
        contacto_principal: contactoPrincipal,
        direccion,
        comuna_id: nuevaComunaId,
        costo_operativo_km,
        costo_operativo_otros
      });

      // Actualizar usuario asociado
      if (cliente.Usuario) {
        await Usuario.update(
          {
            nombre: contactoPrincipal,
            email: email
          },
          { 
            where: { 
              id: cliente.Usuario.id,
              rol: 'cliente'
            }
          }
        );
      }

      // Refetch para devolver el cliente actualizado con includes
      cliente = await Cliente.findOne({
        where: { rut: rutFormateado },
        include: [
          {
            model: Usuario,
            attributes: ['id', 'email', 'activo', 'nombre'],
            where: { rol: 'cliente' }
          },
          {
            model: Comuna,
            attributes: ['nombre'],
            include: [
              {
                model: Region,
                as: 'Region',
                attributes: ['nombre']
              }
            ]
          }
        ],
        attributes: [
          'rut',
          'nombre_empresa',
          'telefono',
          'contacto_principal',
          'direccion',
          'comuna_id',
          'costo_operativo_km',
          'costo_operativo_otros'
        ]
      });

      res.json({
        success: true,
        message: 'Cliente actualizado exitosamente',
        cliente: cliente
      });

    } catch (error) {
      console.error('Error al actualizar cliente:', error);
      res.status(500).json({
        success: false,
        message: 'Error al actualizar el cliente'
      });
    }
  },

  // Eliminar cliente
  eliminarCliente: async (req, res) => {
    try {
      const { rut } = req.params;
      
      if (!rut) {
        return res.status(400).json({
          success: false,
          message: 'El RUT es requerido'
        });
      }

      // Primero buscar el cliente con su usuario asociado
      const rutFormateado = formatearRut(rut);
      const cliente = await Cliente.findOne({
        where: { rut: rutFormateado },
        include: [
          {
            model: Usuario,
            attributes: ['id'],
            where: { rol: 'cliente' }
          }
        ]
      });

      if (!cliente) {
        return res.status(404).json({
          success: false,
          message: 'Cliente no encontrado'
        });
      }

      // Verificar si el cliente tiene solicitudes asociadas
      const solicitudes = await SolicitudRetiro.findOne({
        where: { cliente_rut: rutFormateado }
      });

      if (solicitudes) {
        return res.status(400).json({
          success: false,
          message: 'No se puede eliminar el cliente porque tiene solicitudes asociadas'
        });
      }

      // Primero eliminar el cliente
      await Cliente.destroy({
        where: { rut: rutFormateado }
      });

      // Luego eliminar el usuario asociado
      if (cliente.Usuario) {
        await Usuario.destroy({
          where: { 
            id: cliente.Usuario.id,
            rol: 'cliente'
          }
        });
      }

      res.json({
        success: true,
        message: 'Cliente eliminado exitosamente'
      });

    } catch (error) {
      console.error('Error al eliminar cliente:', error);
      res.status(500).json({
        success: false,
        message: 'Error al eliminar el cliente'
      });
    }
  },

  // Mostrar dashboard de clientes (render)
  mostrarDashboard: async (req, res) => {
    try {
      // Esta función renderiza la vista, las otras son para API
      res.render('admin/clientes', {
        layout: false,
        titulo: 'Gestión de Clientes',
        usuario: req.session.usuario
      });
    } catch (error) {
      console.error('Error al mostrar dashboard:', error);
      res.status(500).render('error', {
        titulo: 'Error',
        mensaje: 'Error al cargar la página'
      });
    }
  }
};

module.exports = clienteController;