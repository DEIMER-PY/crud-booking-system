# Sistema de Reservas — CRUD API

App de reservas con autenticación, pagos, imágenes y notificaciones, construida con **Vite + Web Components (vanilla JS)** en el frontend y **json-server + Express** en el backend (puerto **3000**).

## Características
- **Auth**: registro / login con JWT.
- **Reservas (bookings)**: CRUD completo (GET, POST, PUT, DELETE) vía HTTP puro (`fetch`).
- **Control de concurrencia**: si dos personas reservan el mismo recurso/fecha/hora, el backend serializa las escrituras y responde `409 Conflict` a quien llega segundo.
- **Pagos**: al confirmar una reserva se simula el cobro y se marca como `confirmed`.
- **Imágenes**: subida de imágenes (base64) para recursos, mostradas en las tarjetas.
- **Notificaciones**: campana con notificaciones en tiempo real de reservas, conflictos y pagos.
- **Web Components** vanilla (Shadow DOM, sin frameworks): `app-root`, `auth-view`, `resource-list`, `booking-form`, `booking-list`, `payment-modal`, `notification-center`, `image-uploader`.

## Uso

```bash
npm install
npm run server   # API en http://localhost:3000
npm run dev      # Frontend Vite en http://localhost:5173
```

Usuario demo: `admin@demo.com` / `admin123`

## Probar el conflicto de doble reserva
Abre dos pestañas/sesiones distintas, selecciona el mismo recurso, misma fecha y hora, y confirma casi al mismo tiempo en ambas: la segunda petición recibirá `409` y una notificación de conflicto.

## Endpoints principales
| Método | Ruta | Descripción |
|---|---|---|
| POST | /auth/register | Registro |
| POST | /auth/login | Login |
| GET | /resources | Listar recursos |
| POST/PUT/DELETE | /resources/:id | CRUD recursos (admin) |
| GET/POST | /bookings | Listar / crear reservas |
| PUT/DELETE | /bookings/:id | Editar / cancelar reserva |
| POST | /payments | Pagar una reserva |
| GET | /notifications | Notificaciones del usuario |
| POST | /upload | Subir imagen (base64) |
