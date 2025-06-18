// models/VisitaRetiro.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const VisitaRetiro = sequelize.define('VisitaRetiro', {
  solicitudRetiroId: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    references: {
      model: 'solicitudes_retiro',
      key: 'id'
    },
    allowNull: false,
    field: 'solicitud_retiro_id'
  },
  fechaProgramada: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'fecha_programada'
  },
  horaInicio: {
    type: DataTypes.TIME,
    allowNull: false,
    field: 'hora_inicio'
  },
  horaFin: {
    type: DataTypes.TIME,
    allowNull: false,
    field: 'hora_fin'
  },
  estado: {
    type: DataTypes.ENUM('programada', 'en_proceso', 'completada', 'cancelada'),
    defaultValue: 'programada'
  },
  observaciones: {
    type: DataTypes.TEXT
  },
  createdAt: {
    type: DataTypes.DATE,
    field: 'createdAt'
  },
  updatedAt: {
    type: DataTypes.DATE,
    field: 'updatedAt'
  }
}, {
  timestamps: true,
  tableName: 'visitas_retiro',
  underscored: true
});

module.exports = VisitaRetiro;