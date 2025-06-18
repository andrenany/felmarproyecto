// controllers/certificadoController.js
const { 
    Certificado, 
    VisitaRetiro, 
    SolicitudRetiro, 
    Cliente, 
    Usuario,
    Notificacion 
  } = require('../models');
  const { Op } = require('sequelize');
  const fs = require('fs');
  const path = require('path');
  const PDFDocument = require('pdfkit');
  const moment = require('moment');
  const multer = require('multer');
  
  // Configuración de multer para subida de archivos
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const dirPath = path.join(__dirname, '..', 'public', 'uploads', 'certificados');
      // Crear directorio si no existe
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      cb(null, dirPath);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      cb(null, `certificado-${uniqueSuffix}${ext}`);
    }
  });
  
  const upload = multer({ 
    storage,
    limits: {
      fileSize: 5 * 1024 * 1024 // 5MB máximo
    },
    fileFilter: (req, file, cb) => {
      // Aceptar solo PDFs
      if (file.mimetype === 'application/pdf') {
        cb(null, true);
      } else {
        cb(new Error('Solo se permiten archivos PDF'), false);
      }
    }
  });
  
  const certificadoController = {
    // Middleware para manejar la subida de archivos
    uploadMiddleware: upload.single('archivoPdf'),
    
    // Listar certificados (admin/operador ven todos, cliente solo los suyos)
    listar: async (req, res) => {
      try {
        const { usuario } = req.session;
        const { cliente, fechaDesde, fechaHasta } = req.query;
        let where = {};
        if (usuario.rol === 'cliente') {
          where.cliente_id = req.session.clienteId;
        }
        // Filtro por cliente (solo para admin/operador)
        if (cliente) {
          // Buscar el cliente asociado a ese usuario
          const ClienteModel = require('../models/Cliente');
          const clienteObj = await ClienteModel.findOne({ where: { usuario_id: cliente } });
          if (clienteObj) {
            where.cliente_id = clienteObj.rut;
          } else {
            // Si no hay cliente asociado, forzar un resultado vacío
            where.cliente_id = null;
          }
        }
        // Filtro por fecha de emisión
        if (fechaDesde && fechaHasta) {
          where.fechaEmision = { [Op.between]: [fechaDesde, moment(fechaHasta).endOf('day').toDate()] };
        } else if (fechaDesde) {
          where.fechaEmision = { [Op.gte]: fechaDesde };
        } else if (fechaHasta) {
          where.fechaEmision = { [Op.lte]: moment(fechaHasta).endOf('day').toDate() };
        }
        const certificados = await Certificado.findAll({ where, order: [['fechaEmision', 'DESC']] });
        // Traer los usuarios con rol cliente para el select
        const Usuario = require('../models/Usuario');
        const clientes = await Usuario.findAll({ where: { rol: 'cliente', activo: true } });
        res.render('admin/certificados', {
          certificados,
          clientes,
          usuario,
          error: req.flash('error'),
          success: req.flash('success'),
          clienteSeleccionado: cliente || '',
          fechaDesde: fechaDesde || '',
          fechaHasta: fechaHasta || ''
        });
      } catch (error) {
        req.flash('error', 'Error al cargar certificados');
        res.redirect('/dashboard');
      }
    },
    
    // Descargar PDF
    descargarPDF: async (req, res) => {
      try {
        const { id } = req.params;
        const { usuario } = req.session;
        const certificado = await Certificado.findByPk(id);
        if (!certificado) {
          req.flash('error', 'Certificado no encontrado');
          return res.redirect('/admin/certificados');
        }
        if (usuario.rol === 'cliente' && certificado.cliente_id !== req.session.clienteId) {
          req.flash('error', 'No tienes permiso para descargar este certificado');
          return res.redirect('/admin/certificados');
        }
        const rutaArchivo = path.join(__dirname, '..', 'public', certificado.rutaPdf);
        if (!fs.existsSync(rutaArchivo)) {
          req.flash('error', 'Archivo PDF no encontrado');
          return res.redirect('/admin/certificados');
        }
        res.download(rutaArchivo, `certificado-${certificado.id}.pdf`);
      } catch (error) {
        req.flash('error', 'Error al descargar PDF');
        res.redirect('/admin/certificados');
      }
    },
    
    // Mostrar formulario crear
    mostrarCrear: async (req, res) => {
      try {
        const { usuario } = req.session;
        if (usuario.rol === 'cliente') {
          req.flash('error', 'No tienes permiso para crear certificados');
          return res.redirect('/dashboard');
        }
        // Buscar todos los usuarios con rol cliente
        const Usuario = require('../models/Usuario');
        const clientes = await Usuario.findAll({ where: { rol: 'cliente', activo: true } });
        res.render('admin/certificados_form', { certificado: null, usuario, clientes, error: req.flash('error'), success: req.flash('success') });
      } catch (error) {
        req.flash('error', 'Error al mostrar formulario');
        res.redirect('/admin/certificados');
      }
    },
    
    // Crear certificado
    crear: async (req, res) => {
      try {
        const { cliente_id, visita_retiro_id, observaciones } = req.body;
        // Validación de campos obligatorios
        if (!cliente_id) {
          req.flash('error', 'Debes seleccionar un cliente.');
          return res.redirect('/admin/certificados');
        }
        if (!req.file) {
          req.flash('error', 'Debes adjuntar un archivo PDF.');
          return res.redirect('/admin/certificados');
        }
        // Buscar usuario cliente
        const Usuario = require('../models/Usuario');
        const usuarioCliente = await Usuario.findByPk(cliente_id);
        if (!usuarioCliente) {
          req.flash('error', 'El usuario seleccionado no existe.');
          return res.redirect('/admin/certificados');
        }
        // Buscar cliente asociado a ese usuario
        const Cliente = require('../models/Cliente');
        const cliente = await Cliente.findOne({ where: { usuario_id: usuarioCliente.id } });
        if (!cliente) {
          req.flash('error', 'No se encontró un perfil de cliente asociado a este usuario.');
          return res.redirect('/admin/certificados');
        }
        // Validar PDF
        if (req.file.mimetype !== 'application/pdf') {
          req.flash('error', 'El archivo debe ser un PDF.');
          return res.redirect('/admin/certificados');
        }
        const rutaPdf = `/uploads/certificados/${req.file.filename}`;
        let fechaEmisionFinal = req.body.fechaEmision;
        if (fechaEmisionFinal) {
          fechaEmisionFinal = new Date(fechaEmisionFinal + 'T12:00:00');
        }
        await Certificado.create({ cliente_id: cliente.rut, visita_retiro_id: visita_retiro_id || null, observaciones, rutaPdf, fechaEmision: fechaEmisionFinal });
        // Enviar correo al cliente
        const { sendMailWithRetry } = require('../config/email.config');
        try {
          await sendMailWithRetry({
            from: {
              name: 'Felmart - Gestión de Residuos',
              address: process.env.EMAIL_USER
            },
            to: usuarioCliente.email,
            subject: 'Nuevo certificado disponible',
            html: `<p>Hola <b>${usuarioCliente.nombre}</b>,<br>Ya puedes descargar tu certificado desde la página de Felmart.</p>`
          });
        } catch (correoError) {
          req.flash('error', 'Certificado creado, pero no se pudo enviar el correo al cliente.');
          return res.redirect('/admin/certificados');
        }
        req.flash('success', 'Certificado creado correctamente y correo enviado al cliente.');
        res.redirect('/admin/certificados');
      } catch (error) {
        req.flash('error', 'Error al crear certificado.');
        res.redirect('/admin/certificados');
      }
    },
    
    // Mostrar formulario editar
    mostrarEditar: async (req, res) => {
      try {
        const { id } = req.params;
        const { usuario } = req.session;
        if (usuario.rol === 'cliente') {
          req.flash('error', 'No tienes permiso para editar certificados');
          return res.redirect('/dashboard');
        }
        const certificado = await Certificado.findByPk(id);
        if (!certificado) {
          req.flash('error', 'Certificado no encontrado');
          return res.redirect('/admin/certificados');
        }
        res.render('admin/certificados_form', { certificado, usuario, error: req.flash('error'), success: req.flash('success') });
      } catch (error) {
        req.flash('error', 'Error al mostrar formulario');
        res.redirect('/admin/certificados');
      }
    },
    
    // Editar certificado
    editar: async (req, res) => {
      try {
        const { id } = req.params;
        const { cliente_id, visita_retiro_id, observaciones, fechaEmision } = req.body;
        const certificado = await Certificado.findByPk(id);
        if (!certificado) {
          req.flash('error', 'Certificado no encontrado');
          return res.redirect('/admin/certificados');
        }
        let rutaPdf = certificado.rutaPdf;
        if (req.file) {
          // Eliminar PDF anterior
          const rutaAnterior = path.join(__dirname, '..', 'public', certificado.rutaPdf);
          if (fs.existsSync(rutaAnterior)) fs.unlinkSync(rutaAnterior);
          rutaPdf = `/uploads/certificados/${req.file.filename}`;
        }
        // Permitir actualizar solo la fecha de emisión si es lo único que se envía
        const updateData = {
          visita_retiro_id: typeof visita_retiro_id !== 'undefined' ? visita_retiro_id : certificado.visita_retiro_id,
          observaciones: typeof observaciones !== 'undefined' ? observaciones : certificado.observaciones,
          rutaPdf
        };
        if (fechaEmision) {
          // Forzar hora a mediodía para evitar desfase de zona horaria
          updateData.fechaEmision = new Date(fechaEmision + 'T12:00:00');
        }
        await certificado.update(updateData);
        req.flash('success', 'Certificado actualizado correctamente');
        res.redirect('/admin/certificados');
      } catch (error) {
        req.flash('error', 'Error al editar certificado');
        res.redirect('/admin/certificados');
      }
    },
    
    // Eliminar certificado
    eliminar: async (req, res) => {
      try {
        const { id } = req.params;
        const certificado = await Certificado.findByPk(id);
        if (!certificado) {
          req.flash('error', 'Certificado no encontrado');
          return res.redirect('/admin/certificados');
        }
        // Eliminar PDF
        const rutaArchivo = path.join(__dirname, '..', 'public', certificado.rutaPdf);
        if (fs.existsSync(rutaArchivo)) fs.unlinkSync(rutaArchivo);
        await certificado.destroy();
        req.flash('success', 'Certificado eliminado');
        res.redirect('/admin/certificados');
      } catch (error) {
        req.flash('error', 'Error al eliminar certificado');
        res.redirect('/admin/certificados');
      }
    }
  };
  
  // Función para generar PDF de certificado
  const generarPDFCertificado = async (certificadoId) => {
    try {
      // Buscar certificado con todos sus detalles
      const certificado = await Certificado.findByPk(certificadoId, {
        include: [
          { 
            model: VisitaRetiro,
            include: [
              { 
                model: SolicitudRetiro,
                include: [
                  { model: Cliente }
                ]
              }
            ]
          }
        ]
      });
      
      if (!certificado) {
        throw new Error('Certificado no encontrado');
      }
      
      // Crear directorio si no existe
      const directorioDestino = path.join(__dirname, '..', 'public', 'uploads', 'certificados');
      if (!fs.existsSync(directorioDestino)) {
        fs.mkdirSync(directorioDestino, { recursive: true });
      }
      
      // Generar PDF
      const nombreArchivo = `certificado-${certificadoId}.pdf`;
      const rutaArchivoPDF = path.join(directorioDestino, nombreArchivo);
      
      return new Promise((resolve, reject) => {
        try {
          const doc = new PDFDocument({
            size: 'A4',
            margin: 50,
            info: {
              Title: `Certificado ${certificado.numeroCertificado}`,
              Author: 'Felmart',
              Subject: 'Certificado de Gestión de Residuos'
            }
          });

          // Crear stream de escritura
          const stream = fs.createWriteStream(rutaArchivoPDF);
          doc.pipe(stream);

          // Logo (si existe)
          const logoPath = path.join(__dirname, '..', 'public', 'img', 'logo.png');
          if (fs.existsSync(logoPath)) {
            doc.image(logoPath, 50, 45, { width: 100 });
          }

          // Título
          doc.fontSize(20)
             .font('Helvetica-Bold')
             .text('Certificado de Gestión de Residuos', { align: 'center' })
             .moveDown();

          // Número de certificado
          doc.fontSize(14)
             .font('Helvetica')
             .text(`N° ${certificado.numeroCertificado}`, { align: 'center' })
             .moveDown(2);

          // Información del cliente
          doc.fontSize(12)
             .font('Helvetica-Bold')
             .text('Información del Cliente')
             .moveDown(0.5)
             .font('Helvetica')
             .text(`Empresa: ${certificado.VisitaRetiro.SolicitudRetiro.Cliente.nombre}`)
             .text(`RUC: ${certificado.VisitaRetiro.SolicitudRetiro.Cliente.ruc}`)
             .text(`Dirección: ${certificado.VisitaRetiro.SolicitudRetiro.Cliente.direccion}`)
             .moveDown();

          // Detalles del certificado
          doc.font('Helvetica-Bold')
             .text('Detalles del Certificado')
             .moveDown(0.5)
             .font('Helvetica')
             .text(`Tipo de Tratamiento: ${certificado.tipoTratamiento}`)
             .text(`Planta Destino: ${certificado.plantaDestino}`)
             .text(`Fecha de Emisión: ${moment(certificado.fechaEmision).format('DD/MM/YYYY')}`)
             .moveDown();

          // Información de la visita
          doc.font('Helvetica-Bold')
             .text('Información de la Visita')
             .moveDown(0.5)
             .font('Helvetica')
             .text(`Fecha de Retiro: ${moment(certificado.VisitaRetiro.fechaRetiro).format('DD/MM/YYYY')}`)
             .text(`Hora de Retiro: ${certificado.VisitaRetiro.horaRetiro}`)
             .moveDown();

          // Observaciones (si existen)
          if (certificado.observaciones) {
            doc.font('Helvetica-Bold')
               .text('Observaciones')
               .moveDown(0.5)
               .font('Helvetica')
               .text(certificado.observaciones)
               .moveDown();
          }

          // Pie de página
          const footerY = 700;
          doc.fontSize(10)
             .font('Helvetica')
             .text('Este documento es un certificado oficial de gestión de residuos.', 50, footerY, {
               align: 'center',
               width: 500
             })
             .text('Felmart - Gestión de Residuos', 50, footerY + 15, {
               align: 'center',
               width: 500
             })
             .text('Ruta 5 Sur km 1036, sector Trapen, Puerto Montt, Chile', 50, footerY + 30, {
               align: 'center',
               width: 500
             });

          // Finalizar PDF
          doc.end();

          // Manejar eventos del stream
          stream.on('finish', () => {
            resolve(rutaArchivoPDF);
          });

          stream.on('error', (error) => {
            reject(error);
          });
        } catch (error) {
          reject(error);
        }
      });
    } catch (error) {
      console.error('Error al generar PDF:', error);
      throw error;
    }
  };
  
  module.exports = certificadoController;