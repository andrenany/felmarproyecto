const emailTemplates = {
  // Estilos comunes
  styles: {
    container: 'font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;',
    header: 'background: linear-gradient(135deg, #00616e, #00818f); padding: 30px; text-align: center; color: white;',
    content: 'background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);',
    section: 'background: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 25px;',
    footer: 'background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #dee2e6; color: #6c757d;'
  },

  // Plantilla para cotizaciones
  cotizacion: (data) => ({
    subject: `Cotización de Residuos N° ${data.numeroCotizacion}`,
    html: `
      <div style="${emailTemplates.styles.container}">
        <div style="${emailTemplates.styles.content}">
          <div style="${emailTemplates.styles.header}">
            <h1 style="margin: 0 0 5px 0; font-size: 24px; font-weight: bold;">Cotización de Residuos</h1>
            <p style="margin: 0; font-size: 16px; opacity: 0.9;">N° ${data.numeroCotizacion}</p>
          </div>
          
          <div style="padding: 30px;">
            <div style="${emailTemplates.styles.section}">
              <h3 style="color: #00616e; margin: 0 0 15px 0;">Información del Cliente</h3>
              <p><strong>Nombre:</strong> ${data.nombre}</p>
              <p><strong>Email:</strong> ${data.correo}</p>
              ${data.telefono ? `<p><strong>Teléfono:</strong> ${data.telefono}</p>` : ''}
              ${data.empresa ? `<p><strong>Empresa:</strong> ${data.empresa}</p>` : ''}
              ${data.direccion ? `<p><strong>Dirección:</strong> ${data.direccion}, ${data.comuna || ''}, ${data.ciudad || ''}</p>` : ''}
            </div>

            <div style="${emailTemplates.styles.section}">
              <h3 style="color: #00616e; margin: 0 0 15px 0;">Detalles de la Cotización</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <thead>
                  <tr style="background: #f1f1f1;">
                    <th style="padding: 12px; text-align: left;">Residuo</th>
                    <th style="padding: 12px; text-align: right;">Cantidad</th>
                    <th style="padding: 12px; text-align: right;">Precio Unit.</th>
                    <th style="padding: 12px; text-align: right;">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.detalles.map(detalle => `
                    <tr>
                      <td style="padding: 12px; border-bottom: 1px solid #dee2e6;">${detalle.nombre}</td>
                      <td style="padding: 12px; text-align: right; border-bottom: 1px solid #dee2e6;">${detalle.cantidad}</td>
                      <td style="padding: 12px; text-align: right; border-bottom: 1px solid #dee2e6;">${detalle.precioUnitario.toLocaleString('es-CL', {style:'currency',currency:'CLP'})}</td>
                      <td style="padding: 12px; text-align: right; border-bottom: 1px solid #dee2e6;">${detalle.subtotal.toLocaleString('es-CL', {style:'currency',currency:'CLP'})}</td>
                    </tr>
                  `).join('')}
                </tbody>
                <tfoot>
                  <tr>
                    <td colspan="3" style="padding: 12px; text-align: right; font-weight: bold;">Subtotal:</td>
                    <td style="padding: 12px; text-align: right; font-weight: bold;">${data.subtotal.toLocaleString('es-CL', {style:'currency',currency:'CLP'})}</td>
                  </tr>
                  <tr>
                    <td colspan="3" style="padding: 12px; text-align: right; font-weight: bold;">IVA (19%):</td>
                    <td style="padding: 12px; text-align: right; font-weight: bold;">${data.iva.toLocaleString('es-CL', {style:'currency',currency:'CLP'})}</td>
                  </tr>
                  <tr>
                    <td colspan="3" style="padding: 12px; text-align: right; font-weight: bold;">Total:</td>
                    <td style="padding: 12px; text-align: right; font-weight: bold;">${data.total.toLocaleString('es-CL', {style:'currency',currency:'CLP'})}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            ${data.observaciones ? `
              <div style="${emailTemplates.styles.section}">
                <h3 style="color: #00616e; margin: 0 0 15px 0;">Observaciones</h3>
                <p style="margin: 0;">${data.observaciones}</p>
              </div>
            ` : ''}
          </div>

          <div style="${emailTemplates.styles.footer}">
            <p style="margin: 0;">Gracias por confiar en Felmart para el manejo de sus residuos.</p>
          </div>
        </div>
      </div>
    `
  }),

  // Plantilla para contacto
  contacto: (data) => ({
    subject: 'Nuevo mensaje de contacto',
    html: `
      <div style="${emailTemplates.styles.container}">
        <div style="${emailTemplates.styles.content}">
          <div style="${emailTemplates.styles.header}">
            <h1 style="margin: 0; font-size: 24px;">Nuevo mensaje de contacto</h1>
          </div>
          
          <div style="padding: 30px;">
            <div style="${emailTemplates.styles.section}">
              <p><strong>Nombre:</strong> ${data.nombre}</p>
              <p><strong>Email:</strong> ${data.email}</p>
              ${data.telefono ? `<p><strong>Teléfono:</strong> ${data.telefono}</p>` : ''}
              <p><strong>Mensaje:</strong></p>
              <p style="white-space: pre-wrap;">${data.mensaje}</p>
            </div>
          </div>

          <div style="${emailTemplates.styles.footer}">
            <p style="margin: 0;">Este es un correo automático, por favor no responda a este mensaje.</p>
          </div>
        </div>
      </div>
    `
  }),

  // Plantilla para recuperación de contraseña
  resetPassword: (data) => ({
    subject: 'Recuperación de Contraseña - Felmart',
    html: `
      <div style="${emailTemplates.styles.container}">
        <div style="${emailTemplates.styles.content}">
          <div style="${emailTemplates.styles.header}">
            <h1 style="margin: 0; font-size: 24px;">Recuperación de Contraseña</h1>
          </div>
          
          <div style="padding: 30px;">
            <div style="${emailTemplates.styles.section}">
              <p>Hola ${data.nombre},</p>
              <p>Has solicitado restablecer tu contraseña. Haz clic en el siguiente botón:</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${data.resetUrl}" 
                   style="background-color: #00616e; 
                          color: white; 
                          padding: 12px 25px; 
                          text-decoration: none; 
                          border-radius: 5px;
                          font-weight: bold;">
                  Restablecer Contraseña
                </a>
              </div>
              <p style="color: #666; font-size: 14px;">Este enlace expirará en 2 horas por seguridad.</p>
              <p style="color: #666; font-size: 14px;">Si no solicitaste este cambio, puedes ignorar este correo.</p>
            </div>
          </div>

          <div style="${emailTemplates.styles.footer}">
            <p style="margin: 0;">Este es un correo automático, por favor no responda a este mensaje.</p>
          </div>
        </div>
      </div>
    `
  })
};

module.exports = emailTemplates; 