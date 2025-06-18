// models/index.js
const Usuario = require('./Usuario');
const Cliente = require('./Cliente');
const SolicitudRetiro = require('./SolicitudRetiro');
const Cotizacion = require('./Cotizacion');
const CotizacionResiduo = require('./CotizacionResiduo');
const VisitaRetiro = require('./VisitaRetiro');
const Certificado = require('./Certificado');
const Notificacion = require('./Notificacion');
const PrecioResiduo = require('./PrecioResiduo');
const Region = require('./Region');
const Comuna = require('./Comuna');

// Relaciones entre modelos

// Usuario - Cliente (One-to-One opcional)
Usuario.hasOne(Cliente, { 
  foreignKey: 'usuario_id',
  onDelete: 'SET NULL',
  onUpdate: 'CASCADE'
});
Cliente.belongsTo(Usuario, { 
  foreignKey: 'usuario_id'
});

// Region - Comuna
Region.hasMany(Comuna, { foreignKey: 'region_id' });
Comuna.belongsTo(Region, { foreignKey: 'region_id', as: 'Region' });

// Comuna - Cliente
Comuna.hasMany(Cliente, { foreignKey: 'comuna_id' });
Cliente.belongsTo(Comuna, { foreignKey: 'comuna_id' });

// Region - Cliente
Region.hasMany(Cliente, { foreignKey: 'region_id' });
Cliente.belongsTo(Region, { foreignKey: 'region_id', as: 'RegionCliente' });

// Cliente - SolicitudRetiro
Cliente.hasMany(SolicitudRetiro, { 
  foreignKey: 'clienteRut', 
  sourceKey: 'rut',
  as: 'solicitudesRetiro'
});
SolicitudRetiro.belongsTo(Cliente, { 
  foreignKey: 'clienteRut', 
  targetKey: 'rut',
  as: 'cliente'
});

// Cliente - Cotizacion (relación directa)
Cliente.hasMany(Cotizacion, { 
  foreignKey: 'cliente_id', 
  sourceKey: 'rut',
  as: 'cotizacionesDirectas'
});
Cotizacion.belongsTo(Cliente, { 
  foreignKey: 'cliente_id', 
  targetKey: 'rut',
  as: 'clienteDirecto'
});

// Cotizacion - CotizacionResiduo
Cotizacion.hasMany(CotizacionResiduo, { 
  foreignKey: 'cotizacion_id', 
  sourceKey: 'numeroCotizacion',
  as: 'residuos'
});
CotizacionResiduo.belongsTo(Cotizacion, { 
  foreignKey: 'cotizacion_id', 
  targetKey: 'numeroCotizacion',
  as: 'cotizacion'
});

// PrecioResiduo - CotizacionResiduo
PrecioResiduo.hasMany(CotizacionResiduo, { 
  foreignKey: 'precio_residuo_id',
  as: 'cotizacionesResiduo'
});
CotizacionResiduo.belongsTo(PrecioResiduo, { 
  foreignKey: 'precio_residuo_id',
  as: 'precioResiduo'
});

// SolicitudRetiro - VisitaRetiro (One-to-One)
SolicitudRetiro.hasOne(VisitaRetiro, { 
  foreignKey: 'solicitudRetiroId',
  as: 'visitaRetiro'
});
VisitaRetiro.belongsTo(SolicitudRetiro, { 
  foreignKey: 'solicitudRetiroId',
  as: 'solicitudRetiro'
});

// Cliente - Certificado
Cliente.hasMany(Certificado, {
  foreignKey: 'cliente_id',
  sourceKey: 'rut',
  as: 'certificados'
});
Certificado.belongsTo(Cliente, {
  foreignKey: 'cliente_id',
  targetKey: 'rut',
  as: 'cliente'
});

// VisitaRetiro - Certificado (opcional)
VisitaRetiro.hasMany(Certificado, {
  foreignKey: 'visita_retiro_id',
  sourceKey: 'solicitudRetiroId',
  as: 'certificados'
});
Certificado.belongsTo(VisitaRetiro, {
  foreignKey: 'visita_retiro_id',
  targetKey: 'solicitudRetiroId',
  as: 'visitaRetiro'
});

// Usuario - Notificacion
Usuario.hasMany(Notificacion, { 
  foreignKey: 'usuarioId',
  as: 'notificaciones'
});
Notificacion.belongsTo(Usuario, { 
  foreignKey: 'usuarioId',
  as: 'usuario'
});

// Region - Cotizacion
Region.hasMany(Cotizacion, { 
  foreignKey: 'region_id',
  as: 'cotizaciones'
});
Cotizacion.belongsTo(Region, { 
  foreignKey: 'region_id',
  as: 'region'
});

// Comuna - Cotizacion
Comuna.hasMany(Cotizacion, { 
  foreignKey: 'comuna_id',
  as: 'cotizaciones'
});
Cotizacion.belongsTo(Comuna, { 
  foreignKey: 'comuna_id',
  as: 'comuna'
});

module.exports = {
  Usuario,
  Cliente,
  SolicitudRetiro,
  Cotizacion,
  CotizacionResiduo,
  VisitaRetiro,
  Certificado,
  Notificacion,
  PrecioResiduo,
  Region,
  Comuna
};