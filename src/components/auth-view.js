import { auth } from '../api.js';
import { bus } from '../bus.js';

export class AuthView extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.mode = 'login';
  }

  connectedCallback() {
    this.render();
  }

  render() {
    const isLogin = this.mode === 'login';
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: flex; align-items: center; justify-content: center; min-height: 100vh; }
        .box { width: 340px; background: #fff; border-radius: 12px; padding: 28px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
        h1 { font-size: 20px; margin: 0 0 4px; }
        p.sub { color: #6b7280; margin: 0 0 20px; font-size: 13px; }
        label { font-size: 13px; font-weight: 600; display: block; margin: 10px 0 4px; }
        input { width: 100%; padding: 9px 10px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; }
        button { width: 100%; margin-top: 18px; padding: 10px; background: #4f46e5; color: #fff; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; }
        button:hover { background: #4338ca; }
        .toggle { text-align: center; margin-top: 14px; font-size: 13px; color: #4f46e5; cursor: pointer; }
        .error { color: #dc2626; font-size: 13px; margin-top: 10px; min-height: 16px; }
        .hint { font-size: 12px; color: #9ca3af; margin-top: 14px; text-align: center; }
      </style>
      <div class="box">
        <h1>${isLogin ? 'Iniciar sesión' : 'Crear cuenta'}</h1>
        <p class="sub">Sistema de Reservas</p>
        <form id="form">
          ${!isLogin ? `<label>Nombre</label><input name="name" required />` : ''}
          <label>Email</label>
          <input name="email" type="email" required />
          <label>Contraseña</label>
          <input name="password" type="password" required minlength="4" />
          <div class="error" id="error"></div>
          <button type="submit">${isLogin ? 'Entrar' : 'Registrarme'}</button>
        </form>
        <div class="toggle" id="toggle">${isLogin ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}</div>
        <div class="hint">Demo: admin@demo.com / admin123</div>
      </div>
    `;

    this.shadowRoot.getElementById('toggle').addEventListener('click', () => {
      this.mode = isLogin ? 'register' : 'login';
      this.render();
    });

    this.shadowRoot.getElementById('form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const errorEl = this.shadowRoot.getElementById('error');
      errorEl.textContent = '';
      try {
        if (isLogin) {
          await auth.login(fd.get('email'), fd.get('password'));
        } else {
          await auth.register(fd.get('name'), fd.get('email'), fd.get('password'));
        }
        bus.emit('auth-changed');
      } catch (err) {
        errorEl.textContent = err.message;
      }
    });
  }
}

customElements.define('auth-view', AuthView);
