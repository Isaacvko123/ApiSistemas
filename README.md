# ApiSistemas

Backend para gestion de equipos de computo, resguardos, empleados, localidades y credenciales (web y WiFi). Incluye autenticacion JWT, RBAC por roles, auditoria, cifrado AES-GCM y carga de documentos.

## Stack
- Node.js + Express
- Prisma 7 + PostgreSQL
- Zod (validacion)
- JWT + sesiones en DB
- Argon2 (hash de contrasenas)
- AES-GCM (cifrado de credenciales)
- Multer (uploads)
- Jest (tests)

## Requisitos
- Node.js 20+
- PostgreSQL 13+
- npm

## Instalacion
```bash
npm install
```

## Configuracion de entorno
Se usan `.env` para desarrollo y `.env.test` para pruebas.

Variables principales:
- `NODE_ENV` (default: development)
- `PORT` (default: 6000)
- `DATABASE_URL` (cadena Postgres)
- `SHADOW_DATABASE_URL` (opcional, para migrate)

JWT:
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `JWT_ACCESS_TTL` (default: 15m)
- `JWT_REFRESH_TTL_DAYS` (default: 30)
- `JWT_ISSUER` (opcional)
- `JWT_AUDIENCE` (opcional)

Cifrado de credenciales:
- `CREDENTIALS_ENC_KEY` (obligatoria)
- `CREDENTIALS_ENC_KEY_V1` (opcional, para rotacion)

Rotacion automatica:
- `ROTATE_CREDENTIALS_ENABLED` (default: false)
- `ROTATE_CREDENTIALS_CRON` (default: "0 3 * * *")
- `ROTATE_CREDENTIALS_TZ` (opcional)

Uploads:
- `UPLOAD_DIR` (default: uploads)
- `UPLOAD_MAX_SIZE_MB` (default: 10)

Seguridad/app:
- `TRUST_PROXY` (default: 0)
- `CORS_ORIGINS` (CSV)
- `RATE_LIMIT_WINDOW_MS` (default: 900000)
- `RATE_LIMIT_MAX` (default: 100)
- `BODY_LIMIT` (default: 1mb)

Bootstrap admin (si esta habilitado):
- `BOOTSTRAP_ADMIN_ENABLED` (default: true)
- `BOOTSTRAP_ADMIN_NAME`
- `BOOTSTRAP_ADMIN_EMAIL`
- `BOOTSTRAP_ADMIN_PASSWORD`
- `BOOTSTRAP_ADMIN_ROLE` (ADMIN | SUPERVISOR | GERENTE)

En pruebas:
- `DATABASE_URL_TEST` (debe contener "test" en el nombre de la DB)

Ver ejemplo: `.env.test.example`.

## Prisma
Prisma 7 usa `prisma.config.ts` para la conexion. El schema esta en `prisma/schema.prisma`.

Comandos utiles:
```bash
npx prisma@7.3.0 generate
npx prisma@7.3.0 db push
```

## Ejecutar
```bash
npm run dev
```

Build y start:
```bash
npm run build
npm start
```

Health:
- `GET /health`

## Documentacion (portal + diagramas)
La documentacion web se expone **solo en desarrollo** (cuando `NODE_ENV` != `production`).

Requisitos en `.env` para verla:
- `NODE_ENV=development`
- `PORT` (ej. `8080` o `6000`)

Endpoints de documentacion:
- `GET /docs/portal` (inicio)
- `GET /docs` (Swagger UI)
- `GET /docs/referencia` (Swagger embebido en el portal)
- `GET /docs/diagramas` (diagramas interactivos)
- `GET /docs/arquitectura` (arquitectura)
- `GET /docs/operacion` (indice por tablas)
 - `GET /docs/openapi.json` (spec generado)

Ejemplo (local):
```
http://localhost:8080/docs/portal
```

Si `NODE_ENV=production`, estos endpoints **no se exponen** por seguridad.

### Mantenibilidad y fuente unica
Para que la documentacion sea escalable, el **contenido fuente** vive en `docs/content/` y se genera a `docs/site/`.

Flujo recomendado:
1. Edita contenido en `docs/content/` (no en `docs/site/`).
2. Cambia el codigo.
3. Genera el sitio:

```bash
node scripts/build-docs.js
```

Para generar el OpenAPI automaticamente con zod-to-openapi:
```bash
npm run docs:generate
```

Si necesitas regenerar el contenido base desde el HTML actual:
```bash
node scripts/extract-docs.js
```

## Pruebas
```bash
npm test
```

Nota: el script de tests **resetea** la base de datos definida en `DATABASE_URL_TEST`. Si el nombre de la DB no contiene "test", el script se niega a continuar.

Para detectar handles abiertos:
```bash
npm test -- --detectOpenHandles
```

## Modulos / Rutas principales
- `Usuarios` y `Auth`
- `Areas`, `Puestos`, `Localidades`, `Empleados`
- `Equipos`, `Resguardos`, `ResguardoEquipos`
- `Documentos` (incluye upload)
- `Checklists`, `ChecklistItems`
- `Credenciales Web` y `Wifi Credenciales`
- `Audit Logs`

## Upload de documentos
Endpoint:
- `POST /documentos/upload` (multipart)

Campos:
- `file` (PDF/JPG/PNG)
- `tipo` (RESGUARDO | FOTO | FACTURA | GARANTIA)
- `resguardoId` (opcional segun tipo)

Los archivos se guardan en `${UPLOAD_DIR}/documentos` y se persiste la ruta en DB.

## Notas de seguridad
- Passwords con Argon2
- Credenciales cifradas con AES-GCM
- Revocacion de sesiones y tokens por usuario
- Auditoria de eventos criticos
