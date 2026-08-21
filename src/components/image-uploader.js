export class ImageUploader extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.dataUrl = this.getAttribute('value') || '';
    this.dragging = false;
    this.error = '';
  }

  connectedCallback() {
    this.render();
  }

  readFile(file) {
    this.error = '';
    if (!file || !file.type.startsWith('image/')) {
      this.error = 'Solo se permiten archivos de imagen';
      this.render();
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      this.dataUrl = reader.result;
      this.dragging = false;
      this.render();
      this.dispatchEvent(new CustomEvent('image-selected', { detail: this.dataUrl, bubbles: true, composed: true }));
    };
    reader.readAsDataURL(file);
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          margin-top: 10px;
        }
        .drop {
          border: 2px dashed ${this.dragging ? '#4f46e5' : '#c7c9f5'};
          background: ${this.dragging ? '#eef2ff' : 'transparent'};
          border-radius: 10px;
          padding: 18px 14px;
          text-align: center;
          cursor: pointer;
          color: #6b7280;
          font-size: 13px;
          transition: background 0.15s ease, border-color 0.15s ease;
        }
        .drop:hover { border-color: #4f46e5; }
        img { max-width: 100%; max-height: 140px; border-radius: 8px; display: block; margin: 0 auto 8px; }
        input { display: none; }
        .hint { display: block; font-size: 11px; color: #9ca3af; margin-top: 4px; }
        .error { color: #dc2626; font-size: 12px; margin-top: 6px; text-align: center; }
      </style>
      ${this.dataUrl ? `<img src="${this.dataUrl}" />` : ''}
      <label class="drop" id="drop">
        ${this.dataUrl ? 'Cambiar imagen' : (this.dragging ? '📥 Suelta la imagen aquí' : '📷 Arrastra una imagen aquí o haz clic para subirla')}
        <span class="hint">PNG, JPG o GIF</span>
        <input type="file" accept="image/*" id="file" />
      </label>
      ${this.error ? `<div class="error">${this.error}</div>` : ''}
    `;

    const drop = this.shadowRoot.getElementById('drop');
    const input = this.shadowRoot.getElementById('file');

    input.addEventListener('change', (e) => this.readFile(e.target.files[0]));

    ['dragenter', 'dragover'].forEach((evt) => {
      drop.addEventListener(evt, (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!this.dragging) {
          this.dragging = true;
          this.render();
        }
      });
    });

    ['dragleave', 'dragend'].forEach((evt) => {
      drop.addEventListener(evt, (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.dragging = false;
        this.render();
      });
    });

    drop.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const file = e.dataTransfer.files && e.dataTransfer.files[0];
      this.readFile(file);
    });
  }
}

customElements.define('image-uploader', ImageUploader);
