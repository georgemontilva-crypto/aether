# AETHER — tienda

Tienda de catálogo con carrito y pedido por WhatsApp (sin pagos en línea), panel de inventario y fotos en Cloudflare R2.

**Stack:** React + Vite + Tailwind · tRPC · Drizzle ORM · MySQL · Express · R2.

## Qué incluye

- **Tienda:** intro animada del logo, modo oscuro/claro, 4 secciones (Accesorios, Comida, Lentes, Otros), búsqueda por nombre y hashtags (entiende plurales y sinónimos: "collares", "zarcillos"…), carrito y pedido que abre WhatsApp con la factura lista.
- **Panel (`/admin`):** existencias editables en la misma lista, productos con fotos y hashtags, pedidos (confirmar una venta descuenta el stock solo) y ajustes (WhatsApp, métodos de pago, categorías).
- **Catálogo inicial:** los 89 productos de la tienda de Odoo están en `seed/catalog.json` y se cargan solos la primera vez que arranca con la base de datos vacía.

## Variables de entorno

| Variable | Obligatoria | Para qué |
|---|---|---|
| `DATABASE_URL` | sí | MySQL. En Railway: `${{MySQL.MYSQL_URL}}` |
| `ADMIN_PASSWORD` | sí | Clave para entrar a `/admin` |
| `JWT_SECRET` | sí | Texto largo al azar que firma la sesión del panel |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_URL` | para subir fotos | Almacenamiento de fotos |
| `PUBLIC_URL` | opcional | Dominio del sitio, para el enlace "Ver pedido" del mensaje de WhatsApp. En Railway se toma solo del dominio público |

Plantilla completa en `.env.example`.

## Base de datos

No hay que correr SQL a mano: al arrancar, el servidor aplica las migraciones de `drizzle/` y, si la base está vacía, carga el catálogo inicial.

Si cambias `server/schema.ts`, genera la migración nueva con:

```
npm run db:generate
```

## Fotos

- Las fotos del catálogo inicial apuntan a la tienda de Odoo. En cuanto las variables `R2_*` están puestas, el servidor las copia a R2 solo al arrancar (optimizadas a WebP) y deja de depender de Odoo. El panel muestra el avance y tiene un botón para relanzar la copia.
- Sin R2 en producción no se pueden subir fotos nuevas (el disco de Railway se borra en cada deploy).

## Desarrollo local

```
npm install
copy .env.example .env
npm run dev
```

Abre http://localhost:3000. En local, sin R2, las fotos subidas se guardan en la carpeta `uploads/`.

## Producción

```
npm run build
npm start
```
