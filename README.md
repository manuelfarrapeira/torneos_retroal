# Arcade High Scores — React + PHP + SQLite (Synology Web Station)

> Ver también `ESPECIFICACIONES.md` para el contexto completo del proyecto
> (modelo de datos, reglas de negocio y flujo de despliegue obligatorio).

React llama al API con rutas **relativas** (`api/juegos.php`, etc.), así
funciona igual en cualquier NAS sin depender del dominio ni la IP.

```
retroal/
├── frontend/            # Código React (se compila en tu PC, NO en el NAS)
│   ├── src/
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
└── backend/
    ├── api/
    │   ├── db.php       # Conexión PDO + creación de tablas
    │   ├── helpers.php
    │   ├── juegos.php
    │   ├── usuarios.php
    │   ├── parametros.php
    │   └── puntuaciones.php
    └── data/
        ├── .htaccess    # Bloquea acceso web a la BD
        └── tareas.db    # (se crea sola al primer uso; compartida con la app "Mis Tareas")
```

---

## 1. Desarrollo en tu PC (opcional, para probar)

Necesitas Node.js y PHP instalados **solo en el PC** (en el NAS no hacen falta).

**Terminal 1 — servidor PHP (backend):**
```bash
cd backend
php -S localhost:8000
```

**Terminal 2 — React (frontend):**
```bash
cd frontend
npm install
npm run dev
```

Abre lo que indique Vite (normalmente http://localhost:5173).
Vite redirige `/api` a `http://localhost:8000` (ver `vite.config.js`).

---

## 2. Compilar React para producción

```bash
cd frontend
npm install
npm run build
```

Esto genera la carpeta `frontend/dist/` con la web estática.

---

## 3. Desplegar en Web Station

En producción se usa `\\nas_farra\web\codefm\retroal` (= `/volume1/web/codefm/retroal`
visto desde el NAS). Estructura:

```
retroal/  (en el NAS)
├── index.html          ← contenido de frontend/dist/
├── assets/             ← contenido de frontend/dist/assets/
├── api/                ← backend/api/  (db.php, helpers.php, juegos.php, usuarios.php, parametros.php, puntuaciones.php)
├── data/                ← backend/data/ (.htaccess)  [carpeta con permiso de ESCRITURA]
└── uploads/             ← backend/uploads/ (se crea sola) [carpeta con permiso de ESCRITURA, logos y capturas]
```

Pasos:
1. **Web Station → PHP**: crea/edita un perfil PHP y activa la extensión **pdo_sqlite**.
2. **Web Station → Servicio web**: crea uno que apunte a `/web/miapp` con ese perfil PHP.
3. Da **permisos de escritura** a las carpetas `data/` y `uploads/` (el usuario del servidor web debe poder crear `tareas.db` y guardar logos/capturas).
4. Abre `http://IP-DEL-NAS:puerto/` y listo.

> La BD `tareas.db` se crea automáticamente (esquema nuevo) la primera vez que se llama al API.
> El `.htaccess` de `data/` impide que nadie la descargue por URL (requiere Apache;
> con Nginx, protege la ruta `/data/` en la config del servidor). La carpeta `uploads/`
> sí debe ser accesible públicamente, ya que ahí se sirven los logos y capturas de los juegos.

---

## Portar a otro NAS
Copia la misma carpeta `/web/miapp/` a otro Web Station. Como el frontend usa
rutas relativas, **no hay que cambiar nada**.
