// public/js/main.js
/**
 * Script principal para la plataforma Felmart
 */
document.addEventListener('DOMContentLoaded', function() {
  // Menú móvil
  initMobileMenu();
  
  // Notificaciones
  initNotifications();
  
  // Mensajes flash
  initFlashMessages();
  
  // Inicializar modales
  initModals();
  
  // Inicializar tooltips
  initTooltips();
});

/**
* Inicializa el menú móvil
*/
function initMobileMenu() {
  const menuButton = document.getElementById('menuButton');
  const mobileMenu = document.getElementById('mobileMenu');
  
  if (menuButton && mobileMenu) {
      menuButton.addEventListener('click', function() {
          mobileMenu.classList.toggle('hidden');
      });
  }
}

/**
* Inicializa el sistema de notificaciones
*/
function initNotifications() {
  // Cargar notificaciones del usuario
  loadNotifications();
  
  // Actualizar notificaciones cada minuto
  setInterval(loadNotifications, 60000);
}

/**
* Carga las notificaciones del usuario mediante AJAX
*/
function loadNotifications() {
  fetch('/notificaciones/no-leidas')
      .then(response => response.json())
      .then(data => {
          if (data.success) {
              // Actualizar contador si hay notificaciones no leídas
              const contador = document.getElementById('contador-notificaciones');
              if (contador) {
                  if (data.totalNoLeidas > 0) {
                      contador.classList.remove('d-none');
                      contador.textContent = data.totalNoLeidas;
                  } else {
                      contador.classList.add('d-none');
                  }
              }
              
              // Si el modal de notificaciones está abierto, actualizarlo
              const modal = document.getElementById('notificacionesModal');
              if (modal && modal.classList.contains('show')) {
                  actualizarListaNotificaciones(data.notificaciones);
              }
          }
      })
      .catch(error => console.error('Error al cargar notificaciones:', error));
}

/**
* Actualiza la lista de notificaciones en el modal
*/
function actualizarListaNotificaciones(notificaciones) {
  const lista = document.getElementById('listaNotificaciones');
  
  if (!lista) return;
  
  if (!notificaciones || notificaciones.length === 0) {
      lista.innerHTML = '<div class="text-center py-4">No tienes notificaciones nuevas</div>';
      return;
  }
  
  let html = '';
  
  notificaciones.forEach(notif => {
      const fecha = new Date(notif.fechaCreacion || notif.createdAt);
      const fechaFormateada = fecha.toLocaleDateString('es-ES') + ' ' + 
                              fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      
      let icono = 'bell';
      switch (notif.tipo) {
          case 'info': icono = 'info-circle'; break;
          case 'warning': icono = 'exclamation-triangle'; break;
          case 'success': icono = 'check-circle'; break;
          case 'error': icono = 'times-circle'; break;
      }
      
      html += `
          <div class="notificacion-item p-3 border-bottom ${notif.leida ? '' : 'bg-light'}" data-id="${notif.id}">
              <div class="d-flex">
                  <div class="flex-shrink-0 me-3">
                      <i class="fas fa-${icono} fa-lg text-primary"></i>
                  </div>
                  <div class="flex-grow-1">
                      <h6 class="mb-1">${notif.titulo}</h6>
                      <p class="mb-0 text-muted small">${notif.mensaje}</p>
                      <small class="text-muted">${fechaFormateada}</small>
                  </div>
              </div>
          </div>
      `;
  });
  
  lista.innerHTML = html;
  
  // Agregar eventos a las notificaciones
  document.querySelectorAll('.notificacion-item').forEach(item => {
      item.addEventListener('click', async (e) => {
          e.preventDefault();
          const id = item.dataset.id;
          await marcarNotificacionComoLeida(id);
          item.classList.add('bg-light');
      });
  });
}

/**
* Marca una notificación como leída
*/
async function marcarNotificacionComoLeida(id) {
  try {
      const response = await fetch(`/notificaciones/marcar-leida/${id}`, {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json'
          }
      });
      if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (data.success) {
          // Recargar notificaciones
          loadNotifications();
      }
  } catch (error) {
      console.error('Error al marcar notificación como leída:', error);
  }
}

/**
* Inicializa los mensajes flash
*/
function initFlashMessages() {
  const flashMessages = document.querySelectorAll('.flash-message');
  
  flashMessages.forEach(flash => {
      // Auto cerrar después de 5 segundos
      setTimeout(() => {
          fadeOut(flash);
      }, 5000);
      
      // Botón de cerrar
      const closeBtn = flash.querySelector('.close-flash');
      if (closeBtn) {
          closeBtn.addEventListener('click', () => {
              fadeOut(flash);
          });
      }
  });
}

/**
* Desvanece un elemento
*/
function fadeOut(element) {
  element.style.opacity = '1';
  
  (function fade() {
      if ((element.style.opacity -= 0.1) < 0) {
          element.style.display = 'none';
      } else {
          requestAnimationFrame(fade);
      }
  })();
}

/**
* Inicializa los modales
*/
function initModals() {
  // Abrir modal
  document.querySelectorAll('[data-modal-target]').forEach(button => {
      button.addEventListener('click', () => {
          const modal = document.getElementById(button.dataset.modalTarget);
          if (modal) {
              modal.classList.remove('hidden');
          }
      });
  });
  
  // Cerrar modal
  document.querySelectorAll('[data-modal-close]').forEach(button => {
      button.addEventListener('click', () => {
          const modal = button.closest('.modal');
          if (modal) {
              modal.classList.add('hidden');
          }
      });
  });
  
  // Cerrar modal al hacer clic fuera
  document.querySelectorAll('.modal').forEach(modal => {
      modal.addEventListener('click', (e) => {
          if (e.target === modal) {
              modal.classList.add('hidden');
          }
      });
  });
}

/**
* Inicializa los tooltips
*/
function initTooltips() {
  document.querySelectorAll('[data-tooltip]').forEach(el => {
      el.addEventListener('mouseenter', () => {
          const tooltipText = el.getAttribute('data-tooltip');
          
          const tooltip = document.createElement('div');
          tooltip.className = 'tooltip absolute z-50 px-2 py-1 text-xs text-white bg-gray-900 rounded shadow-lg';
          tooltip.textContent = tooltipText;
          
          document.body.appendChild(tooltip);
          
          const rect = el.getBoundingClientRect();
          tooltip.style.top = `${rect.top - tooltip.offsetHeight - 5 + window.scrollY}px`;
          tooltip.style.left = `${rect.left + (el.offsetWidth / 2) - (tooltip.offsetWidth / 2) + window.scrollX}px`;
      });
      
      el.addEventListener('mouseleave', () => {
          document.querySelectorAll('.tooltip').forEach(t => t.remove());
      });
  });
}

/**
* Formatea una fecha a formato legible
*/
function formatDate(dateString) {
  const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
  return new Date(dateString).toLocaleDateString('es-ES', options);
}

/**
* Formatea un número como moneda (CLP)
*/
function formatCurrency(value) {
  return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
  }).format(value);
}

/**
* Realiza una solicitud AJAX con CSRF protection
*/
function ajax(url, method = 'GET', data = null) {
  const options = {
      method,
      headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]')?.content || ''
      }
  };
  
  if (data && method !== 'GET') {
      options.body = JSON.stringify(data);
  }
  
  return fetch(url, options).then(response => {
      if (!response.ok) {
          throw new Error('Error en la solicitud');
      }
      return response.json();
  });
}


