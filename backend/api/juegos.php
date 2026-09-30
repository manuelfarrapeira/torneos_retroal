<?php
// CRUD de juegos, incluyendo su ficha (año, tipo, desarrollador, logo, capturas)
// y la configuración de su sistema de puntuación (parámetros asignados).

require __DIR__ . '/helpers.php';

// Parámetros configurados para un juego, en el orden en que deben mostrarse.
function parametrosDeJuego(PDO $db, int $juegoId): array {
    $stmt = $db->prepare('
        SELECT jp.id, jp.parametro_id, pa.nombre, pa.tipo,
               jp.orden, jp.es_ranking, jp.orden_ranking, jp.direccion
        FROM juego_parametros jp
        JOIN parametros pa ON pa.id = jp.parametro_id
        WHERE jp.juego_id = :j
        ORDER BY jp.orden ASC, jp.id ASC
    ');
    $stmt->execute([':j' => $juegoId]);
    return $stmt->fetchAll();
}

function juegoRow(PDO $db, int $id): ?array {
    $stmt = $db->prepare('
        SELECT j.id, j.nombre, j.anio, j.tipo, j.desarrollador, j.logo, j.caratula, j.screenshot, j.creado_en,
               COUNT(CASE WHEN p.torneo_id IS NULL THEN p.id END) AS total_scores,
               COUNT(p.id) AS total_scores_all
        FROM juegos j
        LEFT JOIN puntuaciones p ON p.juego_id = j.id
        WHERE j.id = :id
        GROUP BY j.id
    ');
    $stmt->execute([':id' => $id]);
    $row = $stmt->fetch();
    if (!$row) return null;
    $row['parametros'] = parametrosDeJuego($db, $id);
    return $row;
}

// Reemplaza la configuración de parámetros de un juego a partir del array recibido.
function guardarParametrosJuego(PDO $db, int $juegoId, array $parametros): void {
    // Si el juego ya tiene puntuaciones guardadas, no se permite eliminar parámetros existentes.
    $stmtScores = $db->prepare('SELECT COUNT(*) FROM puntuaciones WHERE juego_id = :j');
    $stmtScores->execute([':j' => $juegoId]);
    $totalScores = (int) $stmtScores->fetchColumn();

    if ($totalScores > 0) {
        $stmtExistentes = $db->prepare('SELECT parametro_id FROM juego_parametros WHERE juego_id = :j');
        $stmtExistentes->execute([':j' => $juegoId]);
        $existentesIds = $stmtExistentes->fetchAll(PDO::FETCH_COLUMN);

        $nuevosIds = array_map(fn($p) => (int)($p['parametro_id'] ?? 0), $parametros);

        foreach ($existentesIds as $existenteId) {
            if (!in_array((int)$existenteId, $nuevosIds, true)) {
                fail(409, 'No se pueden eliminar parámetros de un juego que ya tiene récords guardados');
            }
        }
    }

    $db->prepare('DELETE FROM juego_parametros WHERE juego_id = :j')->execute([':j' => $juegoId]);
    if (empty($parametros)) return;

    $existeParametro = $db->prepare('SELECT 1 FROM parametros WHERE id = :id');
    $stmt = $db->prepare('
        INSERT INTO juego_parametros (juego_id, parametro_id, orden, es_ranking, orden_ranking, direccion)
        VALUES (:j, :p, :o, :r, :or, :d)
    ');
    $orden = 0;
    foreach ($parametros as $p) {
        $parametroId = (int) ($p['parametro_id'] ?? 0);
        if (!$parametroId) continue;
        $existeParametro->execute([':id' => $parametroId]);
        if (!$existeParametro->fetchColumn()) {
            fail(400, 'Uno de los parámetros seleccionados ya no existe. Recarga la página e inténtalo de nuevo.');
        }
        $direccion = ($p['direccion'] ?? 'desc') === 'asc' ? 'asc' : 'desc';
        $esRanking = !empty($p['es_ranking']) ? 1 : 0;
        $ordenRanking = $esRanking ? (int) ($p['orden_ranking'] ?? ($orden + 1)) : null;
        $stmt->execute([
            ':j' => $juegoId,
            ':p' => $parametroId,
            ':o' => $orden,
            ':r' => $esRanking,
            ':or' => $ordenRanking,
            ':d' => $direccion,
        ]);
        $orden++;
    }
}

function validarDatosJuego(array $in): array {
    $nombre = trim($in['nombre'] ?? '');
    if ($nombre === '') fail(400, 'El nombre del juego es obligatorio');
    if (mb_strlen($nombre) > 60) fail(400, 'El nombre es demasiado largo (máx. 60)');

    $anio = $in['anio'] ?? null;
    if ($anio !== null && $anio !== '') {
        if (!is_numeric($anio) || (int) $anio < 1950 || (int) $anio > 2100) {
            fail(400, 'El año no es válido');
        }
        $anio = (int) $anio;
    } else {
        $anio = null;
    }

    $tipo = trim($in['tipo'] ?? '');
    if (mb_strlen($tipo) > 40) fail(400, 'El tipo/género es demasiado largo (máx. 40)');

    $desarrollador = trim($in['desarrollador'] ?? '');
    if (mb_strlen($desarrollador) > 60) fail(400, 'El desarrollador es demasiado largo (máx. 60)');

    return [$nombre, $anio, $tipo ?: null, $desarrollador ?: null];
}

try {
    $db = getDb();
    $method = $_SERVER['REQUEST_METHOD'];
    $id = isset($_GET['id']) ? (int) $_GET['id'] : null;

    switch ($method) {
        case 'GET':
            if ($id) {
                $row = juegoRow($db, $id);
                if (!$row) fail(404, 'Juego no encontrado');
                ok($row);
            }
            // Lista de juegos con el nº de puntuaciones de cada uno.
            $sql = '
                SELECT j.id, j.nombre, j.anio, j.tipo, j.desarrollador, j.logo, j.caratula, j.screenshot, j.creado_en,
                       COUNT(CASE WHEN p.torneo_id IS NULL THEN p.id END) AS total_scores,
                       COUNT(p.id) AS total_scores_all
                FROM juegos j
                LEFT JOIN puntuaciones p ON p.juego_id = j.id
                GROUP BY j.id
                ORDER BY j.nombre COLLATE NOCASE ASC
            ';
            $rows = $db->query($sql)->fetchAll();
            foreach ($rows as &$r) {
                $r['parametros'] = parametrosDeJuego($db, (int) $r['id']);
            }
            ok($rows);
            break;

        case 'POST':
            $in = bodyJson();
            [$nombre, $anio, $tipo, $desarrollador] = validarDatosJuego($in);

            try {
                $stmt = $db->prepare('
                    INSERT INTO juegos (nombre, anio, tipo, desarrollador)
                    VALUES (:n, :a, :t, :d)
                ');
                $stmt->execute([':n' => $nombre, ':a' => $anio, ':t' => $tipo, ':d' => $desarrollador]);
            } catch (PDOException $e) {
                if (str_contains($e->getMessage(), 'UNIQUE')) fail(409, 'Ese juego ya existe');
                throw $e;
            }
            $newId = (int) $db->lastInsertId();

            $logo = guardarImagen($in['logo'] ?? null, $newId, 'logo', $nombre);
            $caratula = guardarImagen($in['caratula'] ?? null, $newId, 'cover', $nombre);
            $screenshot = guardarImagen($in['screenshot'] ?? null, $newId, 'shot', $nombre);
            if ($logo || $caratula || $screenshot) {
                $upd = $db->prepare('UPDATE juegos SET logo = COALESCE(:l, logo), caratula = COALESCE(:c, caratula), screenshot = COALESCE(:s, screenshot) WHERE id = :id');
                $upd->execute([':l' => $logo, ':c' => $caratula, ':s' => $screenshot, ':id' => $newId]);
            }

            guardarParametrosJuego($db, $newId, $in['parametros'] ?? []);

            ok(juegoRow($db, $newId), 201);
            break;

        case 'PUT':
            if (!$id) fail(400, 'Falta el id');
            $actual = juegoRow($db, $id);
            if (!$actual) fail(404, 'Juego no encontrado');

            $in = bodyJson();
            [$nombre, $anio, $tipo, $desarrollador] = validarDatosJuego($in);

            try {
                $stmt = $db->prepare('
                    UPDATE juegos SET nombre = :n, anio = :a, tipo = :t, desarrollador = :d WHERE id = :id
                ');
                $stmt->execute([':n' => $nombre, ':a' => $anio, ':t' => $tipo, ':d' => $desarrollador, ':id' => $id]);
            } catch (PDOException $e) {
                if (str_contains($e->getMessage(), 'UNIQUE')) fail(409, 'Ese nombre de juego ya existe');
                throw $e;
            }

            // Imágenes: si llega 'logo'/'caratula'/'screenshot' se reemplaza; si llega '..._borrar' se elimina.
            if (!empty($in['logo_borrar'])) {
                borrarImagen($actual['logo']);
                $db->prepare('UPDATE juegos SET logo = NULL WHERE id = :id')->execute([':id' => $id]);
            } elseif (!empty($in['logo'])) {
                $nuevo = guardarImagen($in['logo'], $id, 'logo', $nombre);
                borrarImagen($actual['logo']);
                $db->prepare('UPDATE juegos SET logo = :l WHERE id = :id')->execute([':l' => $nuevo, ':id' => $id]);
            }
            if (!empty($in['caratula_borrar'])) {
                borrarImagen($actual['caratula']);
                $db->prepare('UPDATE juegos SET caratula = NULL WHERE id = :id')->execute([':id' => $id]);
            } elseif (!empty($in['caratula'])) {
                $nuevo = guardarImagen($in['caratula'], $id, 'cover', $nombre);
                borrarImagen($actual['caratula']);
                $db->prepare('UPDATE juegos SET caratula = :c WHERE id = :id')->execute([':c' => $nuevo, ':id' => $id]);
            }
            if (!empty($in['screenshot_borrar'])) {
                borrarImagen($actual['screenshot']);
                $db->prepare('UPDATE juegos SET screenshot = NULL WHERE id = :id')->execute([':id' => $id]);
            } elseif (!empty($in['screenshot'])) {
                $nuevo = guardarImagen($in['screenshot'], $id, 'shot', $nombre);
                borrarImagen($actual['screenshot']);
                $db->prepare('UPDATE juegos SET screenshot = :s WHERE id = :id')->execute([':s' => $nuevo, ':id' => $id]);
            }

            if (array_key_exists('parametros', $in)) {
                guardarParametrosJuego($db, $id, $in['parametros'] ?? []);
            }

            ok(juegoRow($db, $id));
            break;

        case 'DELETE':
            if (!$id) fail(400, 'Falta el id');
            $actual = juegoRow($db, $id);
            if ($actual && (int) $actual['total_scores'] > 0) {
                fail(409, 'No se puede eliminar un juego que ya tiene récords');
            }
            // ON DELETE CASCADE elimina también sus puntuaciones y su config. de parámetros.
            $stmt = $db->prepare('DELETE FROM juegos WHERE id = :id');
            $stmt->execute([':id' => $id]);
            if ($actual) {
                borrarImagen($actual['logo']);
                borrarImagen($actual['caratula']);
                borrarImagen($actual['screenshot']);
            }
            ok(['ok' => true, 'eliminado' => $id]);
            break;

        default:
            fail(405, 'Método no permitido');
    }
} catch (Throwable $e) {
    fail(500, 'Error del servidor: ' . $e->getMessage());
}
