import { api } from '../api.js';
import { bus } from '../bus.js';

const STATUS_LABEL = {
  pending_payment: '⏳ Pendiente de pago',
  confirmed: '✅ Confirmada',
  cancelled: '❌ Cancelada',
};

export class BookingList extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.bookings = [];
    this.resources = [];
    bus.on('bookings-refresh', () => this.load());
  }

  connectedCallback() {
    this.load();
  }

  async load() {
    const [bookings, resources] = await Promise.all([api.get('/bookings'), api.get('/resources')]);
    this.bookings = bookings;
    this.resources = resources;
    this.render();
  }

  resourceName(id) {
    return this.resources.find((r) => r.id === id)?.name || 'Recurso';
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        table { width: 100%; border-collapse: collapse; background: #fff; border-radius: 10px; overflow: hidden; }
        th, td { text-align: left; padding: 10px 12px; font-size: 13px; border-bottom: 1px solid #f1f1f1; }
        th { background: #f9fafb; color: #6b7280; font-weight: 600; }
        button { border: none; border-radius: 6px; padding: 6px 10px; font-size: 12px; cursor: pointer; }
        .pay { background: #16a34a; color: #fff; }
        .del { background: #fee2e2; color: #b91c1c; }
        .empty { text-align: center; color: #9ca3af; padding: 20px; }
      </style>
      ${this.bookings.length === 0 ? '<div class="empty">Aún no tienes reservas</div>' : `
        <table>
          <thead><tr><th>Recurso</th><th>Fecha</th><th>Hora</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            ${this.bookings.map((b) => `
              <tr>
                <td>${this.resourceName(b.resourceId)}</td>
                <td>${b.date}</td>
                <td>${b.time}</td>
                <td>${STATUS_LABEL[b.status] || b.status}</td>
                <td>
                  ${b.status === 'pending_payment' ? `<button class="pay" data-id="${b.id}" data-action="pay">Pagar</button>` : ''}
                  <button class="del" data-id="${b.id}" data-action="del">Eliminar</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `}
    `;

    this.shadowRoot.querySelectorAll('button').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const booking = this.bookings.find((b) => b.id === btn.dataset.id);
        if (btn.dataset.action === 'del') {
          await api.delete(`/bookings/${booking.id}`);
          bus.emit('notify-refresh');
          this.load();
        } else if (btn.dataset.action === 'pay') {
          bus.emit('open-payment', { booking, resource: this.resources.find((r) => r.id === booking.resourceId) });
        }
      });
    });
  }
}

customElements.define('booking-list', BookingList);
