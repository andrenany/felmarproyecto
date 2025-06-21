// models/VisitaRetiro.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const VisitaRetiro = sequelize.define('VisitaRetiro', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  clienteId: {
    type: DataTypes.STRING,
    references: {
      model: 'clientes',
      key: 'rut'
    },
    allowNull: false,
    field: 'cliente_id'
  },
  tipoVisita: {
    type: DataTypes.ENUM('evaluacion', 'retiro'),
    allowNull: false,
    field: 'tipo_visita'
  },
  fecha: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  hora: {
    type: DataTypes.TIME,
    allowNull: false
  },
  horaInicio: {
    type: DataTypes.TIME,
    allowNull: true,
    defaultValue: null,
    field: 'hora_inicio'
  },
  horaFin: {
    type: DataTypes.TIME,
    allowNull: false,
    defaultValue: '11:00:00',
    field: 'hora_fin'
  },
  cotizacionId: {
    type: DataTypes.STRING,
    references: {
      model: 'cotizaciones',
      key: 'numero_cotizacion'
    },
    allowNull: true,
    field: 'cotizacion_id'
  },
  solicitudId: {
    type: DataTypes.INTEGER,
    references: {
      model: 'solicitudes_retiro',
      key: 'id'
    },
    allowNull: true,
    field: 'solicitud_id'
  },
  estado: {
    type: DataTypes.ENUM('pendiente', 'confirmada', 'evaluacion', 'retiro', 'cancelada'),
    defaultValue: 'pendiente'
  },
  respuestaCliente: {
    type: DataTypes.ENUM('pendiente', 'aceptada', 'rechazada'),
    defaultValue: 'pendiente',
    field: 'respuesta_cliente'
  },
  motivoRechazo: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'motivo_rechazo'
  },
  fechaRespuestaCliente: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'fecha_respuesta_cliente'
  },
  observaciones: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  fechaProgramada: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: DataTypes.NOW,
    field: 'fecha_programada'
  },
  fechaHoraProgramada: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: DataTypes.NOW,
    field: 'fecha_hora_programada'
  }
}, {
  timestamps: true,
  tableName: 'visitas_retiro',
  underscored: true
});

module.exports = VisitaRetiro;