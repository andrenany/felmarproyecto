const VisitaRetiro = require('../models/VisitaRetiro');
const Cliente = require('../models/Cliente');
const Cotizacion = require('../models/Cotizacion');
const SolicitudRetiro = require('../models/SolicitudRetiro');
const { transporter, sendMailWithRetry } = require('../config/email.config');
const { nuevaVisita: nuevaVisitaTemplate } = require('../templates/emailTemplates');
const Usuario = require('../models/Usuario');
const mysql = require('mysql2/promise');

// Función para obtener el correo del cliente
async function obtenerCorreoCliente(cliente) {
    try {
        if (!cliente.usuario_id) {
            console.log('❌ Cliente no tiene usuario asociado');
            return null;
        }

        const usuario = await Usuario.findByPk(cliente.usuario_id);
        if (!usuario || !usuario.email) {
            console.log('❌ No se encontró el correo del usuario');
            return null;
        }

        return usuario.email;
    } catch (error) {
        console.error('❌ Error al obtener correo del cliente:', error);
        return null;
    }
}

// Función para enviar correo de visita
async function enviarCorreoVisita(visita, cliente, emailCliente) {
    try {
        if (!emailCliente) {
            console.log(`❌ No se encontró un correo para el cliente ${cliente.nombre_empresa}. No se enviará la notificación.`);
            return false;
        }

        console.log(`📧 Preparando correo para ${cliente.nombre_empresa} a la dirección: ${emailCliente}`);
        
        const emailContent = nuevaVisitaTemplate(visita, cliente);

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: emailCliente,
            ...emailContent
        };

        // LOG DE DIAGNÓSTICO FINAL
        console.log('--- DEBUG: Contenido final del correo ---');
        console.log(JSON.stringify(mailOptions, null, 2));
        console.log('-----------------------------------------');

        await sendMailWithRetry(mailOptions);
        console.log(`✅ Correo de visita enviado exitosamente a: ${emailCliente}`);
        return true;
    } catch (error) {
        console.error('❌ Error al enviar correo de visita:');
        console.error(error);
        return false;
    }
}

const visitaController = {
    // Obtener todas las visitas con paginación
    async obtenerVisitas(req, res) {
        try {
            const { page = 1, limit = 50, estado, clienteId, respuestaCliente } = req.query;
            const offset = (page - 1) * limit;

            // Construir filtros
            const whereClause = {};
            if (estado) whereClause.estado = estado;
            if (clienteId) whereClause.clienteId = clienteId;
            if (respuestaCliente) whereClause.respuestaCliente = respuestaCliente;

            const { count, rows: visitas } = await VisitaRetiro.findAndCountAll({
                where: whereClause,
                include: [
                    {
                        model: Cliente,
                        as: 'cliente',
                        attributes: ['rut', 'nombre_empresa', 'telefono', 'direccion']
                    },
                    {
                        model: Cotizacion,
                        as: 'cotizacion',
                        attributes: ['numeroCotizacion'],
                        required: false
                    },
                    {
                        model: SolicitudRetiro,
                        as: 'solicitud',
                        attributes: ['id', 'numero_solicitud'],
                        required: false
                    }
                ],
                order: [['createdAt', 'DESC']],
                limit: parseInt(limit),
                offset: parseInt(offset)
            });

            // Formatear datos para la respuesta
            const visitasFormateadas = visitas.map(visita => ({
                id: visita.id,
                clienteId: visita.clienteId,
                cliente_nombre: visita.cliente?.nombre_empresa,
                tipo_visita: visita.tipoVisita,
                fecha: visita.fecha,
                hora: visita.hora,
                estado: visita.estado,
                observaciones: visita.observaciones,
                // Nuevos campos de respuesta del cliente
                respuestaCliente: visita.respuestaCliente || 'pendiente',
                motivoRechazo: visita.motivoRechazo || null,
                fechaRespuestaCliente: visita.fechaRespuestaCliente || null,
                cotizacionId: visita.cotizacionId,
                cotizacion_numero: visita.cotizacion?.numeroCotizacion,
                solicitudId: visita.solicitudId,
                solicitud_numero: visita.solicitud?.numero_solicitud,
                createdAt: visita.createdAt,
                updatedAt: visita.updatedAt
            }));

            const totalPaginas = Math.ceil(count / limit);

            res.json({
                success: true,
                data: visitasFormateadas,
                paginacion: {
                    pagina: parseInt(page),
                    totalPaginas,
                    totalRegistros: count,
                    registrosPorPagina: parseInt(limit)
                }
            });

        } catch (error) {
            console.error('Error al obtener visitas:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor al obtener las visitas',
                error: error.message
            });
        }
    },

    // Obtener estadísticas de visitas unificadas
    async obtenerEstadisticas(req, res) {
        try {
            const visitas = await VisitaRetiro.findAll();

            const stats = {
                pendienteDeRespuesta: 0,
                confirmada: 0,
                cancelada: 0,
                evaluacion: 0,
                retiro: 0
            };

            visitas.forEach(visita => {
                // La respuesta del cliente tiene la máxima prioridad.
                if (visita.respuestaCliente === 'aceptada') {
                    stats.confirmada++;
                } else if (visita.respuestaCliente === 'rechazada') {
                    stats.cancelada++;
                } 
                // Si no hay respuesta del cliente (o está pendiente), nos basamos en el estado principal.
                else {
                    switch (visita.estado) {
                        case 'pendiente':
                            stats.pendienteDeRespuesta++;
                            break;
                        case 'evaluacion':
                            stats.evaluacion++;
                            break;
                        case 'retiro':
                            stats.retiro++;
                            break;
                        // Manejar casos donde el estado se cambió manualmente sin respuesta de cliente
                        case 'confirmada':
                            stats.confirmada++;
                            break;
                        case 'cancelada':
                            stats.cancelada++;
                            break;
                    }
                }
            });

            res.json({
                success: true,
                data: stats
            });

        } catch (error) {
            console.error('Error al obtener estadísticas unificadas:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor al obtener estadísticas',
                error: error.message
            });
        }
    },

    // Crear nueva visita
    async crearVisita(req, res) {
        let connection;
        try {
            const {
                clienteId,
                tipoVisita,
                fecha,
                hora,
                cotizacionId,
                solicitudId,
                observaciones
            } = req.body;

            console.log('\n--- INICIO crearVisita ---');
            console.log('1. Recibido clienteId (RUT):', clienteId);

            // Validaciones
            if (!clienteId || !tipoVisita || !fecha || !hora || !observaciones) {
                return res.status(400).json({
                    success: false,
                    message: 'Todos los campos obligatorios deben estar completos'
                });
            }

            console.log('2. Buscando cliente y usuario asociado...');
            const cliente = await Cliente.findOne({
                where: { rut: clienteId },
                include: [{ model: Usuario }]
            });
            
            // LOG DE DIAGNÓSTICO
            console.log('3. DEBUG: Resultado de Cliente.findOne:', JSON.stringify(cliente, null, 2));

            if (!cliente) {
                console.log('Error: Cliente no encontrado.');
                return res.status(404).json({
                    success: false,
                    message: `Cliente con RUT ${clienteId} no encontrado`
                });
            }

            const emailCliente = cliente.Usuario ? cliente.Usuario.email : null;
            console.log('4. Email extraído:', emailCliente);

            // Validar tipo de visita
            const tiposValidos = ['evaluacion', 'retiro'];
            if (!tiposValidos.includes(tipoVisita)) {
                return res.status(400).json({
                    success: false,
                    message: 'Tipo de visita inválido. Debe ser "evaluacion" o "retiro"'
                });
            }

            // Validar fecha futura
            const fechaVisita = new Date(fecha);
            const hoy = new Date();
            hoy.setHours(0, 0, 0, 0);
            if (fechaVisita < hoy) {
                return res.status(400).json({
                    success: false,
                    message: 'La fecha de la visita debe ser futura'
                });
            }

            // Crear la conexión
            connection = await mysql.createConnection({
                host: process.env.DB_HOST,
                user: process.env.DB_USER,
                password: process.env.DB_PASS,
                database: process.env.DB_NAME,
                ssl: {
                    require: true,
                    rejectUnauthorized: false
                }
            });

            // Crear la visita
            const [result] = await connection.execute(`
                INSERT INTO visitas_retiro (
                    cliente_id, tipo_visita, fecha, hora, hora_inicio, hora_fin,
                    cotizacion_id, solicitud_retiro_id, estado, observaciones,
                    fecha_programada, fecha_hora_programada, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
            `, [
                clienteId, tipoVisita, fecha, hora, hora || '00:00:00', hora || '00:00:00',
                cotizacionId || null, solicitudId || null, 'pendiente', observaciones,
                fecha, `${fecha} ${hora}:00`
            ]);

            const [visitaCreada] = await connection.execute(
                'SELECT * FROM visitas_retiro WHERE id = ?',
                [result.insertId]
            );

            console.log('5. Intentando enviar correo...');
            const emailEnviado = await enviarCorreoVisita(visitaCreada[0], cliente, emailCliente);

            res.status(201).json({
                success: true,
                message: 'Visita creada exitosamente' + (emailEnviado ? ' y notificación enviada.' : ' pero no se pudo enviar la notificación.'),
                data: visitaCreada[0]
            });

            console.log('--- FIN crearVisita ---\n');

        } catch (error) {
            console.error('\n--- ERROR FATAL en crearVisita ---');
            console.error(error);
            console.error('--- FIN ERROR FATAL ---\n');
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor al crear la visita',
                error: error.message
            });
        } finally {
            if (connection) {
                await connection.end();
            }
        }
    },

    // Obtener una visita por su ID
    async obtenerVisitaPorId(req, res) {
        try {
            const { id } = req.params;
            const visita = await VisitaRetiro.findByPk(id, {
                include: [{
                    model: Cliente,
                    as: 'cliente',
                    attributes: ['rut', 'nombre_empresa']
                }]
            });

            if (!visita) {
                return res.status(404).json({
                    success: false,
                    message: 'Visita no encontrada'
                });
            }

            // Formatear la respuesta para que coincida con lo que espera el frontend
            const visitaFormateada = {
                id: visita.id,
                clienteId: visita.clienteId,
                cliente: visita.cliente,
                tipo_visita: visita.tipoVisita,
                fecha: visita.fecha,
                hora: visita.hora,
                estado: visita.estado,
                observaciones: visita.observaciones,
                respuestaCliente: visita.respuestaCliente,
                motivoRechazo: visita.motivoRechazo,
                fechaRespuestaCliente: visita.fechaRespuestaCliente,
                createdAt: visita.createdAt,
                updatedAt: visita.updatedAt
            };

            res.json({
                success: true,
                data: visitaFormateada
            });

        } catch (error) {
            console.error(`Error al obtener visita por ID (${req.params.id}):`, error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor al obtener la visita',
                error: error.message
            });
        }
    },

    // Actualizar visita
    async actualizarVisita(req, res) {
        let connection;
        try {
            const { id } = req.params;
            const {
                tipoVisita,
                fecha,
                hora,
                estado,
                observaciones
            } = req.body;
            
            console.log(`\n--- INICIO actualizarVisita (ID: ${id}) ---`);

            const visita = await VisitaRetiro.findByPk(id);
            if (!visita) {
                return res.status(404).json({ success: false, message: 'Visita no encontrada' });
            }

            console.log('1. Buscando cliente y usuario asociado para la visita...');
            const cliente = await Cliente.findOne({
                where: { rut: visita.clienteId },
                include: [{ model: Usuario }]
            });

            console.log('2. DEBUG: Resultado de Cliente.findOne:', JSON.stringify(cliente, null, 2));

            if (!cliente) {
                console.log('Error: Cliente no encontrado.');
                return res.status(404).json({ success: false, message: `Cliente con RUT ${visita.clienteId} no encontrado` });
            }

            const emailCliente = cliente.Usuario ? cliente.Usuario.email : null;
            console.log('3. Email extraído:', emailCliente);

            connection = await mysql.createConnection({
                host: process.env.DB_HOST,
                user: process.env.DB_USER,
                password: process.env.DB_PASS,
                database: process.env.DB_NAME,
                ssl: {
                    require: true,
                    rejectUnauthorized: false
                }
            });

            await connection.execute(`
                UPDATE visitas_retiro SET tipo_visita = ?, fecha = ?, hora = ?, estado = ?, observaciones = ?,
                fecha_programada = ?, fecha_hora_programada = ?, updated_at = NOW() WHERE id = ?
            `, [tipoVisita, fecha, hora, estado, observaciones, fecha, `${fecha} ${hora}:00`, id]);

            const [visitaActualizada] = await connection.execute('SELECT * FROM visitas_retiro WHERE id = ?', [id]);

            let emailEnviado = false;
            if (visita.fecha !== fecha || visita.hora !== hora || visita.estado !== estado) {
                console.log('4. Se detectaron cambios. Intentando enviar correo...');
                emailEnviado = await enviarCorreoVisita(visitaActualizada[0], cliente, emailCliente);
            }

            res.json({
                success: true,
                message: 'Visita actualizada exitosamente' + (emailEnviado ? ' y notificación enviada.' : '.'),
                data: visitaActualizada[0]
            });
            console.log(`--- FIN actualizarVisita (ID: ${id}) ---\n`);
        } catch (error) {
            console.error(`\n--- ERROR FATAL en actualizarVisita (ID: ${id}) ---`);
            console.error(error);
            console.error('--- FIN ERROR FATAL ---\n');
            res.status(500).json({ success: false, message: 'Error interno del servidor al actualizar la visita', error: error.message });
        } finally {
            if (connection) {
                await connection.end();
            }
        }
    },

    // Eliminar visita
    async eliminarVisita(req, res) {
        try {
            const { id } = req.params;

            const visita = await VisitaRetiro.findByPk(id);
            if (!visita) {
                return res.status(404).json({
                    success: false,
                    message: 'Visita no encontrada'
                });
            }

            await visita.destroy();

            res.json({
                success: true,
                message: 'Visita eliminada correctamente'
            });

        } catch (error) {
            console.error('Error al eliminar visita:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor al eliminar la visita',
                error: error.message
            });
        }
    },

    // Cambiar estado de visita
    async cambiarEstadoVisita(req, res) {
        try {
            const { id } = req.params;
            const { estado } = req.body;

            if (!estado) {
                return res.status(400).json({
                    success: false,
                    message: 'El estado es requerido'
                });
            }

            const estadosValidos = ['pendiente', 'confirmada', 'evaluacion', 'retiro', 'cancelada'];
            if (!estadosValidos.includes(estado)) {
                return res.status(400).json({
                    success: false,
                    message: 'Estado inválido'
                });
            }

            const visita = await VisitaRetiro.findByPk(id);
            if (!visita) {
                return res.status(404).json({
                    success: false,
                    message: 'Visita no encontrada'
                });
            }

            await visita.update({ estado });

            // Si el estado es confirmada, enviar email de confirmación
            if (estado === 'confirmada') {
                try {
                    const cliente = await Cliente.findByPk(visita.clienteId);
                    if (cliente) {
                        await enviarCorreoVisita(visita, cliente, await obtenerCorreoCliente(cliente));
                    }
                } catch (emailError) {
                    console.error('Error al enviar email de confirmación:', emailError);
                }
            }

            res.json({
                success: true,
                message: 'Estado de visita actualizado correctamente',
                data: {
                    id: visita.id,
                    estado: visita.estado
                }
            });

        } catch (error) {
            console.error('Error al cambiar estado de visita:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor al cambiar el estado de la visita',
                error: error.message
            });
        }
    },

    // Obtener clientes para el formulario
    async obtenerClientes(req, res) {
        try {
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
                message: 'Error interno del servidor al obtener los clientes',
                error: error.message
            });
        }
    }
};

module.exports = visitaController; 