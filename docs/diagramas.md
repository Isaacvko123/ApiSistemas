# Diagramas de Interacción (Enterprise)

> Estos diagramas están sincronizados con `docs/site/diagramas.html`.

## Login + Refresh (Enterprise+)

```mermaid
sequenceDiagram
  participant FE as Frontend
  participant EDGE as API Gateway
  participant WAF as WAF
  participant API as API
  participant DB as DB
  participant AUD as AuditLog
  participant OBS as Metrics/Logs

  FE->>EDGE: POST /auth/login
  EDGE->>WAF: inspección + rate limit + CORS
  WAF-->>EDGE: ok
  EDGE->>API: request (email, contrasena)
  API->>OBS: log inbound + requestId
  API->>API: validar payload (zod)
  API->>DB: buscar usuario por email
  DB-->>API: usuario
  API->>API: verificar argon2 (hash)
  alt usuario no existe
    API->>AUD: LOGIN_FAILED (user_not_found)
    API->>OBS: metric auth_failed
    API-->>FE: 401 credenciales invalidas
  else password invalida
    API->>AUD: LOGIN_FAILED (invalid_password)
    API->>OBS: metric auth_failed
    API-->>FE: 401 credenciales invalidas
  else usuario inactivo
    API->>AUD: LOGIN_FAILED (inactive)
    API->>OBS: metric auth_denied
    API-->>FE: 403 usuario inactivo
  else OK
    API->>DB: crear sesion (refreshHash, expiresAt, userAgent, ip)
    API->>API: firmar JWT access (sid, tv, rol, jti)
    API->>API: firmar refresh (sid, tv, jti)
    API->>AUD: LOGIN_SUCCESS (actorId, ip, userAgent)
    API->>OBS: metric auth_success
    API-->>FE: 200 accessToken + refreshToken + sessionId + usuario
  end

  FE->>EDGE: POST /auth/refresh
  EDGE->>WAF: inspección + rate limit
  WAF-->>EDGE: ok
  EDGE->>API: request (refreshToken)
  API->>OBS: log inbound + requestId
  API->>API: validar payload (zod)
  API->>API: verificar refresh JWT (issuer/audience/exp)
  API->>DB: buscar sesion + usuario
  alt sesion no existe / revocada / expirada
    API->>OBS: metric refresh_failed
    API-->>FE: 401 refresh invalido
  else tokenVersion distinto (revocación global)
    API->>OBS: metric refresh_revoked
    API-->>FE: 401 token revocado
  else hash no coincide (reuse detect)
    API->>DB: revocar todas las sesiones + incrementar tokenVersion
    API->>AUD: LOGOUT_ALL (compromiso detectado)
    API->>OBS: alert refresh_reuse
    API-->>FE: 401 refresh comprometido
  else OK
    API->>API: rotar refresh token
    API->>DB: actualizar refreshHash + lastUsedAt + meta
    API->>OBS: metric refresh_success
    API-->>FE: 200 nuevos tokens
  end

  Note over API,DB: Politicas: TTL corto, rotacion refresh, revocacion global por tokenVersion
```

## Resguardo (Enterprise)

```mermaid
sequenceDiagram
  participant FE as Frontend
  participant EDGE as API Gateway
  participant API as API
  participant DB as DB
  participant AUD as AuditLog
  participant OBS as Metrics/Logs

  FE->>EDGE: POST /resguardos
  EDGE->>API: request (empleadoId, fechaInicio)
  API->>API: validar payload
  API->>DB: crear Resguardo
  API->>AUD: ENTITY_CREATE (Resguardo)
  API->>OBS: metric resguardo_created
  API-->>FE: 201 resguardo

  FE->>EDGE: POST /resguardo-equipos
  EDGE->>API: request (resguardoId, equipoId, fechaEntrega)
  API->>API: validar payload
  API->>DB: crear ResguardoEquipo
  API->>AUD: ENTITY_CREATE (ResguardoEquipo)
  API-->>FE: 201 detalle

  FE->>EDGE: POST /documentos/upload (evento=ENTREGA)
  EDGE->>API: multipart file
  API->>API: validar tipo + guardar archivo
  API->>DB: crear Documento
  API->>AUD: ENTITY_CREATE (Documento)
  API-->>FE: 201 documento

  FE->>EDGE: PATCH /resguardo-equipos/:id (fechaDevolucion)
  EDGE->>API: request
  API->>DB: actualizar detalle
  API->>AUD: ENTITY_UPDATE (ResguardoEquipo)
  API-->>FE: 200 ok

  FE->>EDGE: POST /documentos/upload (evento=DEVOLUCION)
  EDGE->>API: multipart file
  API->>DB: crear Documento
  API->>AUD: ENTITY_CREATE (Documento)
  API-->>FE: 201 documento

  FE->>EDGE: PATCH /resguardos/:id (estado=FINALIZADO, fechaFin)
  EDGE->>API: request
  API->>DB: cerrar Resguardo
  API->>AUD: ENTITY_UPDATE (Resguardo)
  API->>OBS: metric resguardo_closed
  API-->>FE: 200 ok
```

## Credenciales Web (Enterprise)

```mermaid
sequenceDiagram
  participant FE as Frontend
  participant EDGE as API Gateway
  participant API as API
  participant KMS as KeyMgmt
  participant DB as DB
  participant AUD as AuditLog

  FE->>EDGE: POST /credenciales
  EDGE->>API: request (password en claro)
  API->>API: validar payload
  API->>KMS: obtener clave activa (version)
  API->>API: cifrar AES-GCM
  API->>DB: guardar passwordEnc/iv/tag
  API->>AUD: CREDENCIAL_CREATE
  API-->>FE: 201 credencial

  FE->>EDGE: GET /credenciales/{id}/secret
  EDGE->>API: request (ADMIN/GERENTE)
  API->>KMS: obtener clave por version
  API->>API: descifrar AES-GCM
  API->>AUD: CREDENCIAL_READ_SECRET
  API-->>FE: 200 password
```

## WiFi Credenciales (Enterprise)

```mermaid
sequenceDiagram
  participant FE as Frontend
  participant EDGE as API Gateway
  participant API as API
  participant KMS as KeyMgmt
  participant DB as DB
  participant AUD as AuditLog

  FE->>EDGE: POST /wifi-credenciales
  EDGE->>API: request (password en claro)
  API->>API: validar payload
  API->>KMS: obtener clave activa
  API->>API: cifrar AES-GCM
  API->>DB: guardar passwordEnc/iv/tag
  API->>AUD: ENTITY_CREATE (WifiCredencial)
  API-->>FE: 201 credencial

  FE->>EDGE: GET /wifi-credenciales/{id}/secret
  EDGE->>API: request (ADMIN/GERENTE)
  API->>KMS: obtener clave por version
  API->>API: descifrar AES-GCM
  API->>AUD: ENTITY_READ_SECRET (WifiCredencial)
  API-->>FE: 200 password
```

## Documentos (Enterprise)

```mermaid
sequenceDiagram
  participant FE as Frontend
  participant EDGE as API Gateway
  participant API as API
  participant FS as Filesystem
  participant DB as DB
  participant AUD as AuditLog

  FE->>EDGE: POST /documentos/upload (multipart)
  EDGE->>API: request
  API->>API: validar tipo/mime/tamano
  API->>FS: guardar archivo
  API->>DB: crear Documento (ruta, evento, resguardoId/empleadoId)
  API->>AUD: ENTITY_CREATE (Documento)
  API-->>FE: 201 documento
```
