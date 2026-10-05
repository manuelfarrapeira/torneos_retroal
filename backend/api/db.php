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
    $pdo->exec('
        CREATE TABLE IF NOT EXISTS torneos (
            id             INTEGER PRIMARY KEY AUTOINCREMENT,
            tipo           TEXT    NOT NULL CHECK (tipo IN (\'mensual\',\'super\')),
            nombre         TEXT    NOT NULL,
            mes            INTEGER CHECK (mes IS NULL OR mes BETWEEN 1 AND 12),
            anio           INTEGER,
            logo           TEXT,
            imagen_campeon TEXT,
            normas         TEXT,
            caratula_reto  TEXT,
            creado_en      TEXT    NOT NULL DEFAULT (datetime(\'now\'))
        );
    ');

    // Auto-migraciones de columnas para bases de datos importadas/restauradas
    $colsTorneos = $pdo->query("PRAGMA table_info(torneos)")->fetchAll(PDO::FETCH_COLUMN, 1);
    if (!in_array('caratula_reto', $colsTorneos)) {
        $pdo->exec('ALTER TABLE torneos ADD COLUMN caratula_reto TEXT;');
    }
    if (!in_array('imagen_campeon', $colsTorneos)) {
        $pdo->exec('ALTER TABLE torneos ADD COLUMN imagen_campeon TEXT;');
    }
    if (!in_array('normas', $colsTorneos)) {
        $pdo->exec('ALTER TABLE torneos ADD COLUMN normas TEXT;');
    }
    if (!in_array('logo', $colsTorneos)) {
        $pdo->exec('ALTER TABLE torneos ADD COLUMN logo TEXT;');
    }

    $colsJuegos = $pdo->query("PRAGMA table_info(juegos)")->fetchAll(PDO::FETCH_COLUMN, 1);
    if (!in_array('caratula', $colsJuegos)) {
        $pdo->exec('ALTER TABLE juegos ADD COLUMN caratula TEXT;');
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
    // Nota: en supertorneos un jugador puede tener una puntuación por cada
    // juego del torneo, no solo una por torneo. Se usa IF NOT EXISTS para
    // evitar race conditions cuando hay múltiples peticiones concurrentes.
    $pdo->exec('
        CREATE UNIQUE INDEX IF NOT EXISTS ux_puntuaciones_torneo
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

    // ---- Arcades Retroal (galerías de arcades con imagen y enlace web) ----
    $pdo->exec('
        CREATE TABLE IF NOT EXISTS arcades (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre     TEXT    NOT NULL,
            imagen     TEXT,
            enlace     TEXT,
            orden      INTEGER NOT NULL DEFAULT 0,
            creado_en  TEXT    NOT NULL DEFAULT (datetime(\'now\'))
        );
    ');
    $colsArcades = $pdo->query("PRAGMA table_info(arcades)")->fetchAll(PDO::FETCH_COLUMN, 1);
    if (!in_array('usuario_id', $colsArcades)) {
        $pdo->exec('ALTER TABLE arcades ADD COLUMN usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL;');
    }
    if (!in_array('usuario_id2', $colsArcades)) {
        $pdo->exec('ALTER TABLE arcades ADD COLUMN usuario_id2 INTEGER REFERENCES usuarios(id) ON DELETE SET NULL;');
    }
    return $pdo;
}
