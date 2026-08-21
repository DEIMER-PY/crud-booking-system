import { api } from '../api.js';
import { auth } from '../api.js';
import './image-uploader.js';

export class ResourceList extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.resources = [];
    this.newImage = '';
  }

  connectedCallback() {
    this.load();
  }

  async load() {
    this.resources = await api.get('/resources');
    this.render();
  }

  render() {
    const isAdmin = auth.currentUser()?.role === 'admin';
    this.shadowRoot.innerHTML = `
      <style>
        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 16px; }
        .card { background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); display: flex; flex-direction: column; }
        img { width: 100%; height: 130px; object-fit: cover; }
        .body { padding: 12px; flex: 1; display: flex; flex-direction: column; gap: 6px; }
        h3 { margin: 0; font-size: 15px; }
        p { margin: 0; font-size: 12px; color: #6b7280; flex: 1; }
        .price { font-weight: 700; color: #4f46e5; }
        button { border: none; border-radius: 8px; padding: 8px; background: #4f46e5; color: #fff; font-weight: 600; cursor: pointer; }
        .admin-panel { margin-top: 20px; background: #fff; border-radius: 12px; padding: 16px; }
        .admin-panel h3 { margin-top: 0; }
        input { width: 100%; padding: 8px; margin: 4px 0; border: 1px solid #d1d5db; border-radius: 6px; }
      </style>
      <div class="grid">
        ${this.resources.map((r) => `
          <div class="card">
            <img src="${r.image}" alt="${r.name}" />
            <div class="body">
              <h3>${r.name}</h3>
              <p>${r.description}</p>
              <span class="price">$${r.price}</span>
              <button data-id="${r.id}">Reservar</button>
            </div>
          </div>
        `).join('')}
      </div>
      ${isAdmin ? `
        <div class="admin-panel">
          <h3>➕ Agregar nuevo recurso (admin)</h3>
          <form id="add-form">
            <input name="name" placeholder="Nombre" required />
            <input name="description" placeholder="Descripción" required />
            <input name="price" type="number" placeholder="Precio" required />
            <image-uploader id="uploader"></image-uploader>
            <button type="submit" style="margin-top:8px;">Guardar recurso</button>
          </form>
        </div>
      ` : ''}
    `;

    this.shadowRoot.querySelectorAll('.card button').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.dispatchEvent(new CustomEvent('select-resource', {
          detail: this.resources.find((r) => r.id === btn.dataset.id),
          bubbles: true,
          composed: true,
        }));
      });
    });

    const addForm = this.shadowRoot.getElementById('add-form');
    if (addForm) {
      const uploader = this.shadowRoot.getElementById('uploader');
      uploader.addEventListener('image-selected', (e) => { this.newImage = e.detail; });
      addForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        await api.post('/resources', {
          name: fd.get('name'),
          description: fd.get('description'),
          price: Number(fd.get('price')),
          image: this.newImage || 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600',
        });
        this.newImage = '';
        this.load();
      });
    }
  }
}

customElements.define('resource-list', ResourceList);
