import { api } from '../api.js';
import { bus } from '../bus.js';

export class NotificationCenter extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.items = [];
    this.open = false;
  }

  connectedCallback() {
    this.load();
    bus.on('notify-refresh', () => this.load());
    this.render();
  }

  async load() {
    try {
      this.items = await api.get('/notifications');
      this.render();
    } catch { /* not logged in yet */ }
  }

  toast(message, type = 'info') {
    const el = document.createElement('div');
    el.textContent = message;
    el.style.cssText = `position:fixed;top:16px;right:16px;background:${type === 'error' ? '#dc2626' : type === 'success' ? '#16a34a' : '#4f46e5'};color:#fff;padding:12px 16px;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.2);z-index:9999;font-size:14px;max-width:320px;`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 4000);
  }

  render() {
    const unread = this.items.filter((n) => !n.read).length;
    this.shadowRoot.innerHTML = `
      <style>
        .bell { position: relative; cursor: pointer; font-size: 22px; user-select: none; }
        .badge { position: absolute; top: -6px; right: -8px; background: #dc2626; color: #fff; font-size: 11px; border-radius: 999px; padding: 1px 6px; }
        .panel { position: absolute; right: 0; top: 34px; width: 300px; max-height: 360px; overflow-y: auto; background: #fff; border-radius: 10px; box-shadow: 0 6px 20px rgba(0,0,0,0.15); display: ${this.open ? 'block' : 'none'}; }
        .item { padding: 10px 12px; border-bottom: 1px solid #f1f1f1; font-size: 13px; cursor: pointer; }
        .item.unread { background: #eef2ff; font-weight: 600; }
        .empty { padding: 16px; text-align: center; color: #9ca3af; font-size: 13px; }
        .wrap { position: relative; }
        .time { display: block; color: #9ca3af; font-weight: 400; font-size: 11px; margin-top: 2px; }
      </style>
      <div class="wrap">
        <div class="bell" id="bell">🔔${unread ? `<span class="badge">${unread}</span>` : ''}</div>
        <div class="panel">
          ${this.items.length === 0 ? '<div class="empty">Sin notificaciones</div>' : this.items.map((n) => `
            <div class="item ${n.read ? '' : 'unread'}" data-id="${n.id}">
              ${n.message}
              <span class="time">${new Date(n.createdAt).toLocaleString()}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
    this.shadowRoot.getElementById('bell').addEventListener('click', () => {
      this.open = !this.open;
      this.render();
    });
    this.shadowRoot.querySelectorAll('.item').forEach((el) => {
      el.addEventListener('click', async () => {
        await api.put(`/notifications/${el.dataset.id}`, { read: true });
        this.load();
      });
    });
  }
}

customElements.define('notification-center', NotificationCenter);
