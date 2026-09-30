<?php
// Conexión a SQLite mediante PDO + creación de la tabla si no existe.

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

    return $pdo;
}
