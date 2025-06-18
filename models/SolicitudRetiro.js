// models/SolicitudRetiro.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SolicitudRetiro = sequelize.define('SolicitudRetiro', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  clienteRut: {
    type: DataTypes.STRING,
    allowNull: false,
    references: {
      model: 'clientes',
      key: 'rut'
    },
    field: 'cliente_rut'
  },
  numero_solicitud: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  tipo_residuo: {
    type: DataTypes.STRING,
    allowNull: false
  },
  cantidad: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  unidad: {
    type: DataTypes.STRING,
    allowNull: false
  },
  descripcion: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  fecha_preferida: {
    type: DataTypes.DATE,
    allowNull: false
  },
  urgencia: {
    type: DataTypes.ENUM('baja', 'media', 'alta'),
    defaultValue: 'media'
  },
  ubicacion: {
    type: DataTypes.STRING,
    allowNull: false
  },
  direccion_especifica: {
    type: DataTypes.STRING,
    allowNull: false
  },
  contacto_nombre: {
    type: DataTypes.STRING,
    allowNull: false
  },
  contacto_telefono: {
    type: DataTypes.STRING,
    allowNull: false
  },
  observaciones: {
    type: DataTypes.TEXT
  },
  estado: {
    type: DataTypes.ENUM('pendiente', 'cotizada', 'programada', 'completada', 'cancelada'),
    defaultValue: 'pendiente'
  },
  fecha_programada: {
    type: DataTypes.DATE,
    allowNull: true
  },
  fecha_completado: {
    type: DataTypes.DATE,
    allowNull: true
  },
  created_at: {
    type: DataTypes.DATE,
    field: 'created_at'
  },
  updated_at: {
    type: DataTypes.DATE,
    field: 'updated_at'
  },
}, {
  timestamps: true,
  tableName: 'solicitudes_retiro',
  underscored: true
});

module.exports = SolicitudRetiro;