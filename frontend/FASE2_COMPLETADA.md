# FASE 2 - React Frontend: COMPLETADA ✅

## Cambios realizados

### 1. ✅ .env.development (CREADO)
**Ubicación:** `frontend/.env.development`
```
VITE_API_URL=http://localhost:8000/api/
```

### 2. ✅ .env.production (CREADO)
**Ubicación:** `frontend/.env.production`
```
VITE_API_URL=https://sis-banda-api.onrender.com/api/
```

### 3. ✅ .env.local (CREADO)
**Ubicación:** `frontend/.env.local` (NO en git - para tu IP local)
```
VITE_API_URL=http://192.168.3.179:8000/api/
```

### 4. ✅ src/services/api.js (ACTUALIZADO)
**Cambios principales:**
- Ahora usa `import.meta.env.VITE_API_URL` en lugar de URL hardcodeada
- ✅ Interceptor de respuesta que detecta 401
- ✅ Obtiene refresh token automáticamente
- ✅ Renueva access token con POST `/api/token/refresh/`
- ✅ Reintentar la petición original
- ✅ Si falla, limpiar localStorage y redirigir a `/login`
- ✅ Cola de peticiones para evitar múltiples renovaciones simultáneas

**Característica clave:** `isRefreshing` + `failedQueue`
- Evita que se llame 10 veces a refresh si 10 peticiones fallan al mismo tiempo
- Las otras peticiones se encolan y se reintenta cuando el token está renovado

### 5. ✅ src/pages/Login.jsx (ACTUALIZADO)
**Cambios:**
- Eliminar URL hardcodeada: `http://192.168.3.179:8000/api/token/`
- Usar `import.meta.env.VITE_API_URL` para construir la URL dinámicamente

---

## 🔄 Flujo de funcionamiento

```
┌─────────────────────────────────┐
│ React: Petición a API           │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│ api.js Request Interceptor      │
│ Agrega: Authorization: Bearer   │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│ Django Backend                  │
└────────┬────────────────────────┘
         │
     ┌───┴──────┐
     │ ¿200?    │
     │ ¿401?    │
     └───┬──────┘
         │
    200  │  401
    ┌────┘────┐
    │         │
    ▼         ▼
  SUCCESS   Response Interceptor
            │
            ├─ ¿Ya refrescando?
            │  SÍ → Encolar petición
            │  NO → Marcar como refrescando
            │
            ├─ ¿Tiene refresh_token?
            │  NO → Limpiar localStorage, ir a /login
            │  SÍ → Continuar
            │
            ├─ POST /api/token/refresh/
            │  ├─ Éxito → Guardar nuevo access_token
            │  │          Reintentar petición original
            │  │          Procesar cola
            │  │
            │  └─ Error → Limpiar localStorage
            │            Ir a /login
            │
            ▼
          SUCCESS (reintentar petición)
```

---

## 🧪 Cómo probar en desarrollo

### Paso 1: Verificar que se use la URL correcta
```bash
cd frontend
npm run dev
```

Abre DevTools (F12) → Network → filtra por `token`
- Debe conectar a: `http://192.168.3.179:8000/api/` (desde .env.local)
- NO a: `http://localhost:8000/api/`

### Paso 2: Probar login normal
1. Abre la app en http://localhost:5173
2. Haz login con credenciales válidas
3. Verifica que se guarden en localStorage:
   - `access_token`
   - `refresh_token`

### Paso 3: Simular token expirado
1. Abre DevTools → Application → Local Storage
2. Edita `access_token` con un valor inválido (ej: `invalid-token-xyz`)
3. Abre la consola (F12) y haz una petición (click en cualquier botón que haga llamada a API)
4. Debería:
   - Recibir 401
   - Automáticamente renovar el token
   - Reintentar la petición
   - Éxito ✓

### Paso 4: Simular sin refresh token
1. Elimina `refresh_token` de localStorage
2. Edita `access_token` con un valor inválido
3. Haz una petición
4. Debería:
   - Recibir 401
   - Intentar renovar pero fallar (sin refresh_token)
   - Redirigir a `/login`

### Paso 5: Verificar cola de peticiones
1. Abre DevTools → Console
2. Edita `access_token` con valor inválido
3. Haz 5-10 peticiones simultáneas (clicks rápidos en varios botones)
4. En DevTools → Network, deberías ver:
   - UNA sola llamada a `/api/token/refresh/` (no 10)
   - Las 5-10 peticiones originales reintentadas

---

## 📊 Variables de entorno

### .env.development
Usado cuando ejecutas `npm run dev`
```
VITE_API_URL=http://localhost:8000/api/
```

### .env.production
Usado cuando ejecutas `npm run build` para producción
```
VITE_API_URL=https://sis-banda-api.onrender.com/api/
```

### .env.local (Local - NO en git)
Para desarrollo con IP específica (192.168.3.179)
```
VITE_API_URL=http://192.168.3.179:8000/api/
```

Vite carga en este orden (última gana):
1. `.env` (default)
2. `.env.development` / `.env.production` (según modo)
3. `.env.local` (local overrides)

---

## 🔍 Archivos modificados

```
frontend/
├── .env.development         ✅ NUEVO
├── .env.production          ✅ NUEVO
├── .env.local               ✅ NUEVO (NO en git)
├── src/
│   ├── services/
│   │   └── api.js          ✅ ACTUALIZADO (interceptor refresh)
│   └── pages/
│       └── Login.jsx       ✅ ACTUALIZADO (URL dinámica)
└── .gitignore              ✅ YA IGNORA *.local
```

---

## ⚙️ Cómo ejecutar en diferentes ambientes

### Desarrollo local
```bash
cd frontend
npm run dev
# Usa .env.local → http://192.168.3.179:8000/api/
```

### Desarrollo estándar
```bash
cd frontend
npm run dev
# Usa .env.development → http://localhost:8000/api/
# (Si no existe .env.local)
```

### Build para producción
```bash
cd frontend
npm run build
# Usa .env.production → https://sis-banda-api.onrender.com/api/
```

---

## 🔐 Seguridad

✅ **Lo que está bien:**
- Tokens en localStorage (estándar web)
- Refresh token solo se envía en body (no en header)
- Access token se renueva automáticamente
- Sesión se limpia en error 401
- Cola previene múltiples refresh simultáneos

⚠️ **Mejoras futuras (Opcional):**
- Usar tokens con corta duración (1-5 min) en lugar de 1 hora
- Implementar refresh token rotation en el backend
- Usar HttpOnly cookies + CSRF token (más seguro)
- Agregar logging de eventos de autenticación

---

## 🚀 Siguiente paso

**FASE 3:** Deployment a Render.com (Cloud)

¿Qué necesitamos?
1. ✅ Backend configurado con variables de entorno (FASE 0)
2. ✅ Android con refresh automático (FASE 1)
3. ✅ React con refresh automático (FASE 2)
4. ⏳ Deploy a cloud (FASE 3)

¿Quieres que proceda con **FASE 3 (Deployment a Render.com)**? 🚀
