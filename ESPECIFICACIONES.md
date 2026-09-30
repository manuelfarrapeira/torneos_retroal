# ESPECIFICACIONES DEL PROYECTO — Arcade High Scores

> Este documento es la referencia de contexto del proyecto. Léelo antes de hacer
> cambios para entender qué es la app, cómo está montada y cómo desplegarla.

## Qué es

Web de tabla de puntuaciones (high scores) para juegos recreativos/arcade, con
estética retro CRT/neón. Permite gestionar juegos, jugadores, sistemas de
puntuación configurables por juego y las puntuaciones registradas.

## Stack

- **Frontend**: React + Vite (`frontend/src/App.jsx` es prácticamente toda la
  app — un único componente grande con subcomponentes internos).
- **Backend**: PHP puro (sin framework) + SQLite (PDO), en `backend/api/*.php`.
- **Hosting**: Synology NAS, servido por Web Station (PHP-FPM + reverse proxy).

## Ubicación del código y despliegue

- **Carpeta de trabajo local**: `C:\Users\mfarr\Dropbox\GITHUB\tornoes_retroal`
  (antes `C:\Users\mfarr\Dropbox\php\retroal`, movido el 30/09/2026 y conectado
  a GitHub — ver `.github/copilot-instructions.md` para más detalle)
- **Destino en producción (NAS)**: `\\nas_farra\web\codefm\retroal`
  (equivale a `/volume1/web/codefm/retroal` visto desde el propio NAS por SSH)
- **Base de datos en producción**: `\\nas_farra\web\codefm\retroal\data\tareas.db`
  (SQLite). ⚠️ Esa misma base de datos la comparte otra app distinta
  ("Mis Tareas", tabla `tareas`) — no tocar esa tabla al hacer cambios de esta app.
- **Acceso al NAS por SSH**: MCP `ssh-nas` (host `192.168.18.10`, puerto `33`,
  usuario `mfarrapeira`). Útil para: probar el backend PHP (no hay PHP instalado
  en local), inspeccionar/editar la base de datos con `sqlite3`, y copiar
  archivos sueltos del backend.

### ⚠️ Flujo obligatorio después de CUALQUIER cambio

1. Si se tocó el **frontend** (`frontend/src`): compilar con
   ```
   cd frontend
   npm run build
   ```
   y copiar el contenido de `frontend/dist/` a `\\nas_farra\web\codefm\retroal\`.

   🚨 **PROHIBIDO usar `robocopy ... /MIR` (ni `/PURGE`) contra la raíz
   `\\nas_farra\web\codefm\retroal\`.** `/MIR` borra en el destino cualquier
   archivo/carpeta que no exista en el origen (`frontend/dist`), y en esa raíz
   viven `api/` (backend PHP), `data/` (la base de datos SQLite en producción)
   y `uploads/` (logos y capturas subidos) — **ninguno de los tres está en
   `dist/`**. Un `/MIR` ya borró estas tres carpetas enteras una vez
   (24/sep/2026), destruyendo la base de datos de producción sin backup
   posible (no hay papelera de reciclaje ni snapshots activados en el NAS).
   Usar siempre uno de estos métodos, más seguros, para copiar el frontend:
   - `robocopy frontend\dist \\nas_farra\web\codefm\retroal /E` (sin `/MIR`
     ni `/PURGE`) — solo añade/actualiza archivos, nunca borra nada fuera de
     `dist`.
   - O copiar solo la subcarpeta `assets/` + `index.html` con `Copy-Item`.
   - Si alguna vez hace falta un mirror real, limitarlo explícitamente a la
     subcarpeta `assets\` (`robocopy frontend\dist\assets ...\assets /MIR`),
     nunca a la raíz del proyecto en el NAS.
2. Si se tocó el **backend** (`backend/api/*.php`): copiar los `.php`
   modificados directamente a `\\nas_farra\web\codefm\retroal\api\` (no
   necesitan compilación) y, si es posible, comprobar con `php -l` por SSH que
   no hay errores de sintaxis antes/después de copiar.
3. Nunca dar el trabajo por terminado sin haber publicado el cambio en el NAS
   — el usuario prueba siempre contra la web real, no en local.

## Estructura de carpetas

```
retroal/
├── frontend/
│   ├── src/App.jsx      # Toda la lógica de UI (componentes, estado, llamadas API)
│   ├── src/App.css      # Todos los estilos (tema retro CRT/neón)
│   └── dist/            # Generado por `npm run build` (lo que se despliega)
└── backend/
    └── api/
        ├── db.php           # Conexión PDO + creación de esquema (CREATE TABLE IF NOT EXISTS)
        ├── helpers.php       # ok()/fail()/bodyJson() y utilidades comunes
        ├── juegos.php        # CRUD de juegos + su configuración de ranking
        ├── usuarios.php      # CRUD de jugadores (el endpoint se llama "usuarios" mas en la UI pone "JUGADORES")
        ├── parametros.php    # CRUD del catálogo de parámetros de puntuación reutilizables
        ├── torneos.php       # CRUD de torneos (nombre, mes/año, juego asociado)
        └── puntuaciones.php  # CRUD de puntuaciones (valores dinámicos según parámetros del juego;
                               # también sirve las puntuaciones de torneos vía ?torneo_id=)
```

## Modelo de datos / conceptos clave

- **Juego**: nombre, año, tipo/género, desarrollador, logo (imagen), screenshot
  (imagen). Editable. Al borrar se piden confirmación y se borran en cascada
  sus puntuaciones.
- **Jugador** ("usuario" a nivel interno/API): solo tiene nombre. Editable.
- **Parámetro** (catálogo reutilizable entre juegos): nombre + tipo
  (`numero` | `tiempo` | `texto`). Ejemplos: Puntos, Tiempo, Fase, Personaje,
  Ronda... Se crean en la pestaña "PARÁMETROS" y luego se asignan a los juegos.
- **Configuración de un juego** (`juego_parametros`): qué parámetros de la
  puntuación usa y en qué orden se muestran; cuáles cuentan para el
  **ranking** (puede haber varios, con prioridad y orden asc/desc por campo,
  para desempatar); tipo `texto` no admite dirección asc/desc (se compara
  alfabéticamente).
- **Puntuación**: jugador + fecha (obligatoria) + un valor por cada parámetro
  configurado en el juego. **Todos los valores son opcionales**: si se deja
  vacío se guarda como `null` y no se muestra nada en la tabla (no se fuerza a
  rellenar campos como "Fase" si no aplica).
- Los inputs de puntuación están restringidos en el momento de escribir según
  el tipo: `numero` solo deja teclear dígitos/punto, `tiempo` usa 3 casillas
  (MM/SS/mmm) que solo aceptan dígitos y autolimitan SS≤59 y mmm≤999.
- **Torneo** (`torneos`): nombre + mes + año + un juego asociado (de los ya
  existentes). Reutiliza los mismos jugadores/juegos/parámetros que la
  clasificación general, pero su clasificación es **independiente**: las
  puntuaciones de un torneo llevan `puntuaciones.torneo_id` relleno (apuntando
  al torneo) y **nunca aparecen en la clasificación general** de ese juego
  (`puntuaciones.php` filtra `torneo_id IS NULL` para la vista general, y por
  `torneo_id=` para la vista de un torneo). Al borrar un torneo se borran en
  cascada sus puntuaciones (no afecta a las puntuaciones generales del juego).
  Pestaña "TORNEOS" en la UI, con dos subvistas: "GESTIONAR" (crear/editar/
  borrar torneos) y "CLASIFICACIÓN Y RÉCORDS" (ver el ranking de un torneo y
  meter/editar/borrar sus puntuaciones, reutilizando `RankingTable` y
  `ScoreForm`).
- **Sin migración de esquemas antiguos**: se eliminó todo el código de
  compatibilidad con el esquema legacy (`puntuaciones_legacy`) a petición
  expresa del usuario. No reintroducir ese tipo de lógica salvo que se pida
  explícitamente.

## Peculiaridades importantes de este NAS/hosting

- **Web Station (Synology) sustituye cualquier respuesta HTTP >=400 (400, 404,
  409, 500...) por su propia página de error genérica**, ocultando el JSON
  real que devuelve el backend (confirmado en
  `/usr/local/etc/nginx/conf.d/.webstation.error_page.default.conf`: cubre
  literalmente todos los códigos 400-599). Por eso `fail()` en `helpers.php`
  **siempre responde con HTTP 200** y mete el código real en un campo
  `status` dentro del JSON (`{ "error": "...", "status": 409 }`); el frontend
  (`apiCall` en `App.jsx`) detecta el fallo mirando si el cuerpo tiene
  `error`, no por `res.ok`/status HTTP. Si añades una nueva llamada `fetch()`
  directa (fuera de `apiCall`), recuerda comprobar también `data?.error` y no
  fiarte solo de `res.ok`, porque siempre será `true`.
- Un jugador no puede tener más de una puntuación por juego en la
  clasificación general, ni más de una por torneo (índices únicos parciales
  `ux_puntuaciones_general`/`ux_puntuaciones_torneo` en `db.php`, más una
  comprobación explícita en `puntuaciones.php` que devuelve un error 409
  legible antes de tocar la base de datos).
- `CREATE TABLE IF NOT EXISTS` en SQLite **no** actualiza una tabla que ya
  existe con un esquema/columnas/FK antiguos. Si cambias el esquema en
  `db.php`, en producción puede hacer falta alterar/recrear la tabla a mano
  (por SSH con `sqlite3`) porque el `IF NOT EXISTS` no aplicará el cambio.
  Ejemplo real: al añadir `torneo_id` a `puntuaciones` hubo que ejecutar a
  mano en producción `ALTER TABLE puntuaciones ADD COLUMN torneo_id INTEGER
  REFERENCES torneos(id) ON DELETE CASCADE;` (con `PRAGMA foreign_keys = ON`)
  antes de que el nuevo código PHP funcionara. Lo mismo aplica a
  `CREATE INDEX IF NOT EXISTS`: si hay datos duplicados previos que violan un
  índice único nuevo, hay que limpiarlos a mano antes de crear el índice.
- El acceso SFTP de la MCP `ssh-nas` no funciona en este NAS (falla el
  subsistema SFTP). Para copiar archivos sueltos del backend, usar en su
  lugar `Copy-Item` de PowerShell contra la ruta SMB
  `\\nas_farra\web\codefm\retroal\...` (o `robocopy` para carpetas), y usar
  `ssh_exec` + `sqlite3`/`php -l` para todo lo que requiera ejecutar comandos
  en el propio NAS.

## Convenciones de UI

- Toda la app usa terminología **"JUGADORES"** de cara al usuario (aunque
  internamente el endpoint/API y variables se llaman "usuarios" — no hace
  falta cambiar eso, es solo texto visible).
- Antes de cualquier borrado (juego, jugador, parámetro, puntuación) se pide
  confirmación mediante un modal.
- Tras guardar con éxito algo (crear/editar juego, jugador, parámetro,
  puntuación) aparece un popup verde de confirmación que se autocierra.
- Los formularios de creación se vacían solos tras guardar (no conservan lo
  escrito anteriormente).
