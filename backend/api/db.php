<?php
// Conexión a SQLite mediante PDO + creación del esquema (sistema nuevo, sin datos legacy).

function getDb(): PDO {
    // La base de datos vive fuera de la carpeta pública (../data).
    $dbFile = __DIR__ . '/../data/tareas.db';

    $pdo = new PDO('sqlite:' . $dbFile);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    // Mejora la concurrencia de SQLite.
    $pdo->exec('PRAGMA journal_mode = WAL;');
    $pdo->exec('PRAGMA foreign_keys = ON;');

    $pdo->exec('
        CREATE TABLE IF NOT EXISTS tareas (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            titulo     TEXT    NOT NULL,
            hecha      INTEGER NOT NULL DEFAULT 0,
            creada_en  TEXT    NOT NULL DEFAULT (datetime(\'now\'))
        );
    ');

    // ---- Usuarios (jugadores) ----
    $pdo->exec('
        CREATE TABLE IF NOT EXISTS usuarios (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre     TEXT    NOT NULL UNIQUE,
            creado_en  TEXT    NOT NULL DEFAULT (datetime(\'now\'))
        );
    ');

    // ---- Catálogo de parámetros de puntuación (reutilizable entre juegos) ----
    $pdo->exec('
        CREATE TABLE IF NOT EXISTS parametros (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre     TEXT    NOT NULL UNIQUE,
            tipo       TEXT    NOT NULL CHECK (tipo IN (\'numero\',\'tiempo\',\'texto\')),
            creado_en  TEXT    NOT NULL DEFAULT (datetime(\'now\'))
        );
    ');

    // ---- Juegos ----
    $pdo->exec('
        CREATE TABLE IF NOT EXISTS juegos (
            id             INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre         TEXT    NOT NULL UNIQUE,
            anio           INTEGER,
            tipo           TEXT,
            desarrollador  TEXT,
            logo           TEXT,
            caratula       TEXT,
            screenshot     TEXT,
            creado_en      TEXT    NOT NULL DEFAULT (datetime(\'now\'))
        );
    ');

    // Asegurar columna caratula en instalaciones existentes
    $colsJuegos = $pdo->query('PRAGMA table_info(juegos)')->fetchAll();
    $hasCaratula = false;
    foreach ($colsJuegos as $col) {
        if ($col['name'] === 'caratula') {
            $hasCaratula = true;
            break;
        }
    }
    if (!$hasCaratula) {
        $pdo->exec('ALTER TABLE juegos ADD COLUMN caratula TEXT;');
    }

    // ---- Parámetros asignados a cada juego (config. del sistema de puntuación del juego) ----
    $pdo->exec('
        CREATE TABLE IF NOT EXISTS juego_parametros (
            id             INTEGER PRIMARY KEY AUTOINCREMENT,
            juego_id       INTEGER NOT NULL,
            parametro_id   INTEGER NOT NULL,
            orden          INTEGER NOT NULL DEFAULT 0,
            es_ranking     INTEGER NOT NULL DEFAULT 0,
            orden_ranking  INTEGER,
            direccion      TEXT    NOT NULL DEFAULT \'desc\' CHECK (direccion IN (\'asc\',\'desc\')),
            FOREIGN KEY (juego_id) REFERENCES juegos(id) ON DELETE CASCADE,
            FOREIGN KEY (parametro_id) REFERENCES parametros(id) ON DELETE CASCADE,
            UNIQUE (juego_id, parametro_id)
        );
    ');

    // ---- Torneos (mensuales: mes+año+1 juego; supertorneos: nombre libre+varios juegos) ----
    // Si la tabla existe con el esquema antiguo (sin columna "tipo"), se recrea desde
    // cero: no había datos que conservar (confirmado con el usuario).
    $tieneTipo = false;
    foreach ($pdo->query("PRAGMA table_info(torneos)")->fetchAll() as $col) {
        if ($col['name'] === 'tipo') { $tieneTipo = true; break; }
    }
    if (!$tieneTipo) {
        $pdo->exec('DROP TABLE IF EXISTS torneo_juegos;');
        $pdo->exec('DROP TABLE IF EXISTS torneos;');
    }
    $pdo->exec('
        CREATE TABLE IF NOT EXISTS torneos (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            tipo       TEXT    NOT NULL CHECK (tipo IN (\'mensual\',\'super\')),
            nombre     TEXT    NOT NULL,
            mes        INTEGER CHECK (mes IS NULL OR mes BETWEEN 1 AND 12),
            anio       INTEGER,
            creado_en  TEXT    NOT NULL DEFAULT (datetime(\'now\'))
        );
    ');

    // Migración: columna "logo" para la imagen opcional de los supertorneos
    // (si no se sube ninguna, el frontend usa un sprite pixel-art aleatorio).
    $tieneLogo = false;
    foreach ($pdo->query("PRAGMA table_info(torneos)")->fetchAll() as $col) {
        if ($col['name'] === 'logo') { $tieneLogo = true; break; }
    }
    if (!$tieneLogo) {
        $pdo->exec('ALTER TABLE torneos ADD COLUMN logo TEXT;');
    }

    // Migración: columna "imagen_campeon" para el Panteón de los Campeones
    $tieneImagenCampeon = false;
    foreach ($pdo->query("PRAGMA table_info(torneos)")->fetchAll() as $col) {
        if ($col['name'] === 'imagen_campeon') { $tieneImagenCampeon = true; break; }
    }
    if (!$tieneImagenCampeon) {
        $pdo->exec('ALTER TABLE torneos ADD COLUMN imagen_campeon TEXT;');
    }

    // Migración: columna "normas" para normas específicas de supertorneos
    $tieneNormas = false;
    foreach ($pdo->query("PRAGMA table_info(torneos)")->fetchAll() as $col) {
        if ($col['name'] === 'normas') { $tieneNormas = true; break; }
    }
    if (!$tieneNormas) {
        $pdo->exec('ALTER TABLE torneos ADD COLUMN normas TEXT;');
    }

    // ---- Juegos incluidos en cada torneo (1 para mensual, N para supertorneos) ----
    $pdo->exec('
        CREATE TABLE IF NOT EXISTS torneo_juegos (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            torneo_id  INTEGER NOT NULL,
            juego_id   INTEGER NOT NULL,
            orden      INTEGER NOT NULL DEFAULT 0,
            creado_en  TEXT    NOT NULL DEFAULT (datetime(\'now\')),
            FOREIGN KEY (torneo_id) REFERENCES torneos(id) ON DELETE CASCADE,
            FOREIGN KEY (juego_id) REFERENCES juegos(id) ON DELETE CASCADE,
            UNIQUE (torneo_id, juego_id)
        );
    ');

    // ---- Puntuaciones ----
    // torneo_id es NULL para la clasificación general y apunta a un torneo
    // cuando la puntuación pertenece a la clasificación de ese torneo (son
    // independientes: la general nunca incluye puntuaciones de torneos).
    $pdo->exec('
        CREATE TABLE IF NOT EXISTS puntuaciones (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            juego_id   INTEGER NOT NULL,
            usuario_id INTEGER NOT NULL,
            torneo_id  INTEGER,
            fecha      TEXT    NOT NULL,
            creado_en  TEXT    NOT NULL DEFAULT (datetime(\'now\')),
            FOREIGN KEY (juego_id) REFERENCES juegos(id) ON DELETE CASCADE,
            FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
            FOREIGN KEY (torneo_id) REFERENCES torneos(id) ON DELETE CASCADE
        );
    ');

    // Un jugador solo puede tener una puntuación por juego en la clasificación
    // general, y una puntuación por torneo. SQLite trata cada NULL como
    // distinto en un UNIQUE normal, así que se usan dos índices únicos
    // parciales (uno para filas generales con torneo_id NULL, otro para
    // filas de torneo).
    $pdo->exec('
        CREATE UNIQUE INDEX IF NOT EXISTS ux_puntuaciones_general
        ON puntuaciones(juego_id, usuario_id) WHERE torneo_id IS NULL;
    ');
    // Se recrea siempre con la definición actual (incluye juego_id) porque en
    // supertorneos un jugador puede tener una puntuación por cada juego del
    // torneo, no solo una por torneo.
    $pdo->exec('DROP INDEX IF EXISTS ux_puntuaciones_torneo;');
    $pdo->exec('
        CREATE UNIQUE INDEX ux_puntuaciones_torneo
        ON puntuaciones(torneo_id, juego_id, usuario_id) WHERE torneo_id IS NOT NULL;
    ');

    // ---- Valores de cada parámetro para cada puntuación ----
    $pdo->exec('
        CREATE TABLE IF NOT EXISTS puntuacion_valores (
            id             INTEGER PRIMARY KEY AUTOINCREMENT,
            puntuacion_id  INTEGER NOT NULL,
            parametro_id   INTEGER NOT NULL,
            valor_texto    TEXT,
            valor_num      REAL,
            FOREIGN KEY (puntuacion_id) REFERENCES puntuaciones(id) ON DELETE CASCADE,
            FOREIGN KEY (parametro_id) REFERENCES parametros(id) ON DELETE CASCADE,
            UNIQUE (puntuacion_id, parametro_id)
        );
    ');

    return $pdo;
}
