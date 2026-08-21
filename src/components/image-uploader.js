export class ImageUploader extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.dataUrl = this.getAttribute('value') || '';
  }

  connectedCallback() {
    this.render();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        .drop { border: 2px dashed #c7c9f5; border-radius: 10px; padding: 14px; text-align: center; cursor: pointer; color: #6b7280; font-size: 13px; }
        .drop:hover { border-color: #4f46e5; }
        img { max-width: 100%; max-height: 140px; border-radius: 8px; display: block; margin: 0 auto 8px; }
        input { display: none; }
      </style>
      ${this.dataUrl ? `<img src="${this.dataUrl}" />` : ''}
      <label class="drop">
        ${this.dataUrl ? 'Cambiar imagen' : '📷 Haz clic para subir una imagen'}
        <input type="file" accept="image/*" id="file" />
      </label>
    `;
    this.shadowRoot.getElementById('file').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        this.dataUrl = reader.result;
        this.render();
        this.dispatchEvent(new CustomEvent('image-selected', { detail: this.dataUrl, bubbles: true, composed: true }));
      };
      reader.readAsDataURL(file);
    });
  }
}

customElements.define('image-uploader', ImageUploader);
