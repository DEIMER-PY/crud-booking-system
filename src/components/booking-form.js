import { api } from '../api.js';
import { bus } from '../bus.js';

export class BookingForm extends HTMLElement {
  static get observedAttributes() { return ['open']; }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.resource = null;
  }

  connectedCallback() {
    this.render();
  }

  open(resource) {
    this.resource = resource;
    this.render();
  }

  close() {
    this.resource = null;
    this.render();
  }

  render() {
    if (!this.resource) {
      this.shadowRoot.innerHTML = '';
      return;
    }
    this.shadowRoot.innerHTML = `
      <style>
        .overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 100; }
        .box { width: 320px; background: #fff; border-radius: 12px; padding: 20px; }
        h2 { margin: 0 0 4px; font-size: 17px; }
        p { margin: 0 0 14px; color: #6b7280; font-size: 13px; }
        label { font-size: 13px; font-weight: 600; display: block; margin: 8px 0 4px; }
        input { width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 6px; }
        .row { display: flex; gap: 10px; margin-top: 16px; }
        button { flex: 1; border: none; border-radius: 8px; padding: 9px; font-weight: 600; cursor: pointer; }
        .confirm { background: #4f46e5; color: #fff; }
        .cancel { background: #f3f4f6; color: #374151; }
        .error { color: #dc2626; font-size: 13px; margin-top: 8px; }
      </style>
      <div class="overlay">
        <div class="box">
          <h2>Reservar: ${this.resource.name}</h2>
          <p>$${this.resource.price} por sesión</p>
          <form id="form">
            <label>Fecha</label>
            <input type="date" name="date" required min="${new Date().toISOString().slice(0,10)}" />
            <label>Hora</label>
            <input type="time" name="time" required />
            <div class="error" id="error"></div>
            <div class="row">
              <button type="button" class="cancel" id="cancel">Cancelar</button>
              <button type="submit" class="confirm">Confirmar</button>
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
      errorEl.textContent = '';
      try {
        const booking = await api.post('/bookings', {
          resourceId: this.resource.id,
          date: fd.get('date'),
          time: fd.get('time'),
        });
        bus.emit('bookings-refresh');
        bus.emit('notify-refresh');
        bus.emit('open-payment', { booking, resource: this.resource });
        this.close();
      } catch (err) {
        // Two people booking the same slot -> 409 conflict
        errorEl.textContent = err.message;
        bus.emit('notify-refresh');
      }
    });
  }
}

customElements.define('booking-form', BookingForm);
