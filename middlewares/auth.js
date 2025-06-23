// middlewares/auth.js
const rutasPublicas = [
  '/notificaciones/no-leidas',
  '/notificaciones/marcar-leida',
  '/notificaciones/marcar-todas-leidas'
];

const auth = {
  // Verificar si el usuario está autenticado
  isAuthenticated: (req, res, next) => {
    // Usar req.originalUrl para obtener la ruta completa, no solo req.path
    const esRutaPublica = rutasPublicas.some(ruta => req.originalUrl.startsWith(ruta));
    
    if (esRutaPublica) {
      return next();
    }
    
    if (req.session && req.session.usuario) {
      return next();
    }
    // Guardar la URL original para redireccionar después del login
    req.session.returnTo = req.originalUrl;
    req.flash('error', 'Debes iniciar sesión para acceder a esta página');
    return res.redirect('/login');
  },
  
  // Verificar si el usuario tiene rol específico
  hasRole: (roles) => {
    return (req, res, next) => {
      if (!req.session || !req.session.usuario) {
        req.session.returnTo = req.originalUrl;
        req.flash('error', 'Debes iniciar sesión para acceder a esta página');
        return res.redirect('/login');
      }
      
      if (roles.includes(req.session.usuario.rol)) {
        return next();
      }
      
      req.flash('error', 'No tienes permisos para acceder a esta página');
      return res.redirect('/dashboard');
    };
  },
  
  // Middleware para la API - devuelve JSON en lugar de redireccionar
  isAuthenticatedApi: (req, res, next) => {
    // Permitir acceso a rutas públicas de notificaciones
    if (rutasPublicas.some(ruta => req.path.startsWith(ruta))) {
      return next();
    }

    if (!req.session || !req.session.usuario) {
      return res.status(401).json({
        success: false,
        message: 'No autorizado. Inicie sesión para continuar.',
        code: 'AUTH_REQUIRED'
      });
    }

    // Para clientes, ser más permisivo con la sesión
    if (req.session.usuario.rol === 'cliente') {
      // Solo verificar que tenga id y rol para clientes
      if (!req.session.usuario.id || !req.session.usuario.rol) {
        return res.status(401).json({
          success: false,
          message: 'Sesión inválida. Por favor, vuelva a iniciar sesión.',
          code: 'INVALID_SESSION'
        });
      }
      return next();
    }

    // Para otros roles, verificar que la sesión tenga todos los datos necesarios
    const camposRequeridos = ['id', 'nombre', 'email', 'rol'];
    const sesionCompleta = camposRequeridos.every(campo => 
      req.session.usuario[campo] !== undefined
    );

    if (!sesionCompleta) {
      return res.status(401).json({
        success: false,
        message: 'Sesión inválida. Por favor, vuelva a iniciar sesión.',
        code: 'INVALID_SESSION'
      });
    }

    return next();
  },
  
  // Verificar si es un Administrador
  isAdmin: (req, res, next) => {
    if (!req.session || !req.session.usuario) {
      req.flash('error', 'Debes iniciar sesión para acceder');
      return res.redirect('/login');
    }

    if (req.session.usuario.rol !== 'administrador') {
      req.flash('error', 'No tienes permisos para acceder a esta sección');
      return res.redirect('/dashboard');
    }

    next();
  },
  
  // Verificar si es un Operador o Administrador
  isOperadorOrAdmin: (req, res, next) => {
    if (!req.session || !req.session.usuario) {
      req.flash('error', 'Debes iniciar sesión para acceder');
      return res.redirect('/login');
    }

    if (req.session.usuario.rol !== 'operador' && req.session.usuario.rol !== 'administrador') {
      req.flash('error', 'No tienes permisos para acceder a esta sección');
      return res.redirect('/dashboard');
    }

    next();
  },

  // Middleware para API - verificar si es administrador
  requireAdmin: (req, res, next) => {
    if (!req.session || !req.session.usuario) {
      return res.status(401).json({
        success: false,
        message: 'No autorizado. Inicie sesión para continuar.',
        code: 'AUTH_REQUIRED'
      });
    }

    if (req.session.usuario.rol !== 'administrador') {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para acceder a esta funcionalidad',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    next();
  }
};

module.exports = auth;