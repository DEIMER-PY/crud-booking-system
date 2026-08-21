import { api } from '../api.js';
import { bus } from '../bus.js';

export class PaymentModal extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.payload = null;
    bus.on('open-payment', (e) => {
      this.payload = e.detail;
      this.render();
    });
  }

  connectedCallback() {
    this.render();
  }

  close() {
    this.payload = null;
    this.render();
  }

  render() {
    if (!this.payload) {
      this.shadowRoot.innerHTML = '';
      return;
    }
    const { booking, resource } = this.payload;
    this.shadowRoot.innerHTML = `
      <style>
        .overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 200; }
        .box { width: 320px; background: #fff; border-radius: 12px; padding: 20px; }
        h2 { margin: 0 0 4px; font-size: 17px; }
        p { margin: 0 0 14px; color: #6b7280; font-size: 13px; }
        label { font-size: 13px; font-weight: 600; display: block; margin: 8px 0 4px; }
        input { width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 6px; }
        .row { display: flex; gap: 10px; margin-top: 16px; }
        button { flex: 1; border: none; border-radius: 8px; padding: 9px; font-weight: 600; cursor: pointer; }
        .confirm { background: #16a34a; color: #fff; }
        .cancel { background: #f3f4f6; color: #374151; }
        .error { color: #dc2626; font-size: 13px; margin-top: 8px; }
      </style>
      <div class="overlay">
        <div class="box">
          <h2>💳 Pagar reserva</h2>
          <p>${resource.name} — $${resource.price}</p>
          <form id="form">
            <label>Nombre en la tarjeta</label>
            <input name="cardName" required placeholder="Juan Pérez" />
            <label>Número de tarjeta</label>
            <input name="cardNumber" required maxlength="16" placeholder="4111111111111111" />
            <div class="error" id="error"></div>
            <div class="row">
              <button type="button" class="cancel" id="cancel">Luego</button>
              <button type="submit" class="confirm">Pagar $${resource.price}</button>
            </div>
          </form>
        </div>
      </div>
    `;
    this.shadowRoot.getElementById('cancel').addEventListener('click', () => this.close());
    this.shadowRoot.getElementById('form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const errorEl = this.shadowRoot.getElementById('error');
      try {
        await api.post('/payments', {
          bookingId: booking.id,
          cardName: fd.get('cardName'),
          amount: resource.price,
        });
        bus.emit('bookings-refresh');
        bus.emit('notify-refresh');
        this.close();
      } catch (err) {
        errorEl.textContent = err.message;
      }
    });
  }
}

customElements.define('payment-modal', PaymentModal);
