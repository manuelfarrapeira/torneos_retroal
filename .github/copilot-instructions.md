# Instrucciones para GitHub Copilot — Proyecto RetroAL (torneos_retroal)

> Lee este documento al iniciar cualquier sesión de trabajo en este repositorio.
> Contiene la estructura del proyecto, el flujo de despliegue y las reglas
> que hay que respetar siempre. Complementa (no sustituye) a
> `ESPECIFICACIONES.md`, que tiene el detalle funcional/modelo de datos.

## Qué es este proyecto

Web de tabla de puntuaciones (high scores) para juegos recreativos/arcade,
con estética retro CRT/neón. Gestiona juegos, jugadores, parámetros de
puntuación configurables, torneos mensuales, retos y supertorneos.

- **Frontend**: React + Vite, en `frontend/`.
- **Backend**: PHP puro (sin framework) + SQLite (PDO), en `backend/api/*.php`.
- **Hosting de producción**: Synology NAS, servido por Web Station (PHP-FPM +
  reverse proxy).

## Ubicaciones clave

- **Repositorio local**: `C:\Users\mfarr\Dropbox\GITHUB\tornoes_retroal`
  (movido aquí el 30/09/2026 desde `C:\Users\mfarr\Dropbox\php\retroal` —
  si ves referencias a la ruta antigua en documentación vieja, están obsoletas).
- **Remoto GitHub**: `https://github.com/manuelfarrapeira/torneos_retroal.git`
  (rama `main`).
- **Destino en producción (NAS)**: `\\nas_farra\web\codefm\retroal`
  (= `/volume1/web/codefm/retroal` visto por SSH desde el propio NAS).
- **Base de datos de producción**: `\\nas_farra\web\codefm\retroal\data\tareas.db`
  (SQLite). Esa misma base de datos la comparte otra app distinta
  ("Mis Tareas", tabla `tareas`) — no tocar esa tabla.
- **Acceso al NAS por SSH**: MCP `ssh-nas` (host `192.168.18.10`, puerto `33`,
  usuario `mfarrapeira`). El subsistema SFTP de este NAS NO funciona
  (falla "Unable to start subsystem: sftp"); para copiar archivos usar SMB
  (`Copy-Item`/`robocopy` contra `\\nas_farra\...`) y usar `ssh_exec` solo
  para comandos (sqlite3, php -l, etc.).

## Reglas duras (no negociables)

1. **NUNCA hagas `git commit` ni `git push` si el usuario no lo pide
   explícitamente para ese cambio concreto.** Deja los cambios en el
   working directory sin commitear salvo petición expresa.
2. **NUNCA uses `robocopy /MIR` (ni `/PURGE`) contra la raíz
   `\\nas_farra\web\codefm\retroal\`.** Ahí conviven `api/` (backend),
   `data/` (BD de producción) y `uploads/` (imágenes de usuarios), que NO
   están en `frontend/dist`. Un `/MIR` a la raíz ya borró esas tres carpetas
   una vez (24/sep/2026) sin posibilidad de recuperación (sin papelera ni
   snapshots en el NAS). El `/MIR` solo está permitido limitado a la
   subcarpeta `assets/` (ver `deploy.ps1`), nunca a la raíz.
3. **Nunca borrar ni sobrescribir `backend/uploads/`** (logos, carátulas,
   capturas subidas por usuarios) ni la base de datos `backend/data/tareas.db`
   / la del NAS, salvo petición explícita.
4. Antes de dar por terminado un cambio, publícalo en el NAS (el usuario
   prueba siempre contra la web real, no solo en local) — salvo que el propio
   usuario pida explícitamente no desplegar todavía.

## Flujo de despliegue

Usar siempre el script de la raíz del proyecto, que compila y sincroniza de
forma segura (borra automáticamente los builds antiguos en `assets/`, pero
nunca toca `uploads/`, `data/` ni `api/`):

```powershell
cd C:\Users\mfarr\Dropbox\GITHUB\tornoes_retroal
powershell -ExecutionPolicy Bypass -File deploy.ps1
```

Qué hace `deploy.ps1`:
1. `npm run build` dentro de `frontend/`.
2. `robocopy frontend\dist\assets \\nas_farra\web\codefm\retroal\assets /MIR`
   (con guard de seguridad que aborta si la ruta destino no termina en
   `\assets`) — limpia hashes de builds anteriores de Vite.
3. Copia (`Copy-Item -Force`, sin `/MIR`) los ficheros raíz de `dist/`
   (`index.html`, favicons) a la raíz del NAS.

Si solo se tocó el **backend** (`backend/api/*.php`), no hace falta build:
copiar directamente el/los `.php` modificados a
`\\nas_farra\web\codefm\retroal\api\` con `Copy-Item`, y si es posible
verificar con `php -l` por SSH (`ssh-nas`) que no hay errores de sintaxis.

## Desarrollo local

Entorno probado y funcionando (WebStorm/IntelliJ en Windows):

- PHP no está en el PATH del sistema; el ejecutable está en
  `C:\xampp\php\php.exe` (PHP 8.2.12, con `pdo_sqlite`).
- Hay un `package.json` en la **raíz** del proyecto (no confundir con
  `frontend/package.json`) con scripts de orquestación usando `concurrently`:
  - `npm run backend` → ejecuta `node scripts/start-backend.js`, que lanza
    `php.exe -S localhost:8000` con `backend/` como docroot (evita problemas
    de escapado de rutas que sí daban error al invocar php.exe directamente
    desde un script npm).
  - `npm run frontend` → `npm run dev --prefix frontend` (Vite en :5173).
  - `npm run dev` → ambos a la vez con `concurrently`.
- `frontend/vite.config.js` tiene proxy configurado para desarrollo:
  `/api` → `http://localhost:8000` y `/uploads` → `http://localhost:8000`
  (necesario para que las imágenes de `backend/uploads/` carguen en local;
  si se pierde este proxy, la app carga datos pero ninguna imagen).
- Run configurations de WebStorm en `.idea/runConfigurations/` (tipo
  `js.build_tools.npm`, NO usar `ShConfigurationType` ni
  `BatchConfigurationType` — no están soportados/fiables en esta instalación
  de WebStorm): `Backend (PHP server)`, `Frontend (dev)`, `Frontend (build)`,
  `Frontend (preview build)`, y el compuesto `Local (backend + frontend)`
  que lanza los dos primeros a la vez.
- `backend/start-server.bat` existe como alternativa manual (doble clic) para
  arrancar el backend sin pasar por npm/WebStorm.

## Estructura del frontend (`frontend/src/`)

Refactorizado el 30/09/2026 desde un único `App.jsx` de 4247 líneas a una
estructura modular (App.jsx quedó en ~1999 líneas, solo orquesta estado
global y pasa props a cada pestaña):

```
src/
├── App.jsx              # Estado global (useState), handlers, layout, navegación de pestañas
├── App.css              # Todos los estilos (tema retro CRT/neón) — NO dividido, sigue siendo un único fichero
├── main.jsx
├── api/
│   └── endpoints.js      # Constantes de rutas API (API_JUEGOS, API_USUARIOS, etc.)
├── hooks/
│   └── useDragScroll.js  # Scroll horizontal arrastrando con el ratón
├── utils/
│   ├── constants.js      # TIPO_LABEL, MESES, AÑOS_TORNEO, JUEGOS_DEMO
│   ├── date.js           # fechaLarga, hoyISO
│   ├── file.js           # fileToDataUrl
│   ├── format.jsx        # formatearValorParam, formatearNombreJuegoClasificacion
│   └── text.js           # normalizarTexto
└── components/
    ├── sprites/PixelSprite.jsx        # Sprites pixel-art SVG originales (sin copyright)
    ├── common/                        # AsyncImage, DropZone, LogoThumb, BannerPlaceholder,
    │                                   # SelectorJuego, SelectorJuegoMultiAdd, SelectorUsuario,
    │                                   # SelectorTorneo, TiempoInput
    ├── forms/                         # JuegoForm, UsuarioForm, ParametroForm, ScoreForm, TorneoForm
    ├── tables/                        # RankingTable, SuperGeneralTable
    └── tabs/                          # VerTab, MeterTab, JuegosTab, UsuariosTab, ParametrosTab, TorneosTab
                                        # (una por cada valor de la variable de estado `tab` en App.jsx)
```

Convenciones al añadir código nuevo:
- Componentes/lógica reutilizable → su carpeta correspondiente en
  `components/`, `utils/` o `hooks/`, NO añadir todo de vuelta a `App.jsx`.
- El estado global (useState) y los handlers que llaman a la API se quedan
  en `App.jsx`; los componentes de pestaña (`components/tabs/`) los reciben
  por **props** (no se usa React Context ni Redux en este proyecto).
- No tocar `App.css` al mover componentes — todos siguen compartiendo las
  mismas clases CSS globales.

## Estructura del backend (`backend/api/`)

- `db.php` — conexión PDO + `CREATE TABLE IF NOT EXISTS` del esquema.
  ⚠️ `IF NOT EXISTS` no actualiza tablas ya existentes: si cambias el
  esquema, en producción puede hacer falta un `ALTER TABLE`/`CREATE INDEX`
  manual por SSH con `sqlite3`.
- `helpers.php` — `ok()`/`fail()`/`bodyJson()`. `fail()` responde SIEMPRE
  HTTP 200 (Web Station sustituye cualquier código ≥400 por su página de
  error genérica), metiendo el código real en `status` dentro del JSON. El
  frontend detecta fallos mirando `data?.error`, nunca `res.ok`.
- `juegos.php`, `usuarios.php` (= "JUGADORES" en la UI), `parametros.php`,
  `torneos.php`, `puntuaciones.php`, `clasificacion.php`,
  `torneos_jugador.php`, `auth.php`, `normas.php`.

Ver `ESPECIFICACIONES.md` para el modelo de datos completo (juegos,
jugadores, parámetros, puntuaciones, torneos/retos/supertorneos) y
peculiaridades del hosting.

## Git / control de versiones

- `.gitignore` excluye: `backend/uploads/`, `frontend/node_modules/`,
  `frontend/dist/`, `deploy/` (carpeta obsoleta eliminada), `node_modules/`
  y `package-lock.json` de la raíz, `.idea/` (config de WebStorm) y
  `backend/data/tareas.db` (base de datos con datos reales, no se versiona).
- Recuerda la regla dura: nunca commit/push sin petición explícita del usuario.

## Mobile / responsive

La app tiene una versión de escritorio y otra optimizada para móvil (media
queries en `App.css`, principalmente `@media (max-width: 768px)`). Ha habido
mucho trabajo de pulido específico para móvil (popups que no exceden el
viewport, columnas apiladas al 100% de ancho, imágenes carátula+screenshot
en línea con alturas igualadas, subtabs del modal de detalle de jugador
visibles en móvil, etc.) — al tocar CSS, comprobar siempre el efecto en
ambas resoluciones y tener cuidado con la especificidad de `:not()` en
selectores (añade especificidad extra que puede saltarse el orden de
cascada esperado; usar `@media` para overrides de escritorio en vez de
depender del orden de las reglas).
