import { auth } from '../api.js';
import { bus } from '../bus.js';
import './auth-view.js';
import './notification-center.js';
import './resource-list.js';
import './booking-form.js';
import './booking-list.js';
import './payment-modal.js';

export class AppRoot extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    bus.on('auth-changed', () => this.render());
  }

  connectedCallback() {
    this.render();
  }

  render() {
    if (!auth.isLoggedIn()) {
      this.shadowRoot.innerHTML = '<auth-view></auth-view>';
      return;
    }
    const user = auth.currentUser();
    this.shadowRoot.innerHTML = `
      <style>
        header { display: flex; align-items: center; justify-content: space-between; padding: 14px 24px; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
        h1 { font-size: 18px; margin: 0; color: #4f46e5; }
        .user { display: flex; align-items: center; gap: 12px; font-size: 13px; color: #374151; }
        img.avatar { width: 30px; height: 30px; border-radius: 50%; }
        main { max-width: 1000px; margin: 0 auto; padding: 24px; }
        section { margin-bottom: 32px; }
        h2 { font-size: 15px; color: #374151; margin-bottom: 12px; }
        .logout { background: transparent; border: 1px solid #d1d5db; color: #374151; padding: 6px 12px; border-radius: 8px; cursor: pointer; font-size: 12px; }
      </style>
      <header>
        <h1>📅 Sistema de Reservas</h1>
        <div class="user">
          <img class="avatar" src="${user.avatar}" />
          <span>${user.name}</span>
          <notification-center></notification-center>
          <button class="logout" id="logout">Salir</button>
        </div>
      </header>
      <main>
        <section>
          <h2>Recursos disponibles</h2>
          <resource-list></resource-list>
        </section>
        <section>
          <h2>Mis reservas</h2>
          <booking-list></booking-list>
        </section>
      </main>
      <booking-form id="booking-form"></booking-form>
      <payment-modal></payment-modal>
    `;

    this.shadowRoot.getElementById('logout').addEventListener('click', () => {
      auth.logout();
      bus.emit('auth-changed');
    });

    this.shadowRoot.querySelector('resource-list').addEventListener('select-resource', (e) => {
      this.shadowRoot.getElementById('booking-form').open(e.detail);
    });
  }
}

customElements.define('app-root', AppRoot);
