<?php
// Copia las puntuaciones de un reto (torneo mensual) a la clasificación
// general (Torneíto Retroal) del mismo juego. Solo se permite si el juego
// todavía no tiene ninguna puntuación en la clasificación general (para no
// pisar récords ya existentes); esto se usaba antes a mano, añadiendo las
// puntuaciones una a una al terminar el mes.

require __DIR__ . '/helpers.php';

try {
    $db = getDb();
    $method = $_SERVER['REQUEST_METHOD'];
    if ($method !== 'POST') fail(405, 'Método no permitido');

    $in = bodyJson();
    $torneoId = (int) ($in['torneo_id'] ?? 0);
    $juegoId = (int) ($in['juego_id'] ?? 0);
    if (!$torneoId) fail(400, 'Falta torneo_id');
    if (!$juegoId) fail(400, 'Falta juego_id');

    $t = $db->prepare('SELECT mes, anio FROM torneos WHERE id = :t');
    $t->execute([':t' => $torneoId]);
    $torneo = $t->fetch();
    if (!$torneo) fail(404, 'El torneo no existe');

    // Un reto mensual solo se puede copiar cuando ya ha terminado su mes.
    if ($torneo['mes'] && $torneo['anio']) {
        $ahora = new DateTime('now', new DateTimeZone('Europe/Madrid'));
        if (((int)$torneo['anio'] * 12 + (int)$torneo['mes']) >= ((int)$ahora->format('Y') * 12 + (int)$ahora->format('n'))) {
            fail(400, 'No se puede copiar hasta que termine el mes del reto');
        }
    }

    $pertenece = $db->prepare('SELECT 1 FROM torneo_juegos WHERE torneo_id = :t AND juego_id = :j');
    $pertenece->execute([':t' => $torneoId, ':j' => $juegoId]);
    if (!$pertenece->fetchColumn()) fail(400, 'Ese juego no pertenece a este reto');

    // No se permite si el juego ya tiene alguna puntuación en la general.
    $existeGeneral = $db->prepare('SELECT 1 FROM puntuaciones WHERE juego_id = :j AND torneo_id IS NULL LIMIT 1');
    $existeGeneral->execute([':j' => $juegoId]);
    if ($existeGeneral->fetchColumn()) {
        fail(409, 'Este juego ya tiene puntuaciones en la clasificación general (Torneíto Retroal)');
    }

    $origen = $db->prepare('SELECT id, usuario_id, fecha FROM puntuaciones WHERE torneo_id = :t AND juego_id = :j');
    $origen->execute([':t' => $torneoId, ':j' => $juegoId]);
    $filas = $origen->fetchAll();
    if (empty($filas)) {
        fail(400, 'Este reto no tiene puntuaciones que copiar');
    }

    $db->beginTransaction();
    try {
        $insertPuntuacion = $db->prepare('INSERT INTO puntuaciones (juego_id, usuario_id, torneo_id, fecha) VALUES (:j, :u, NULL, :f)');
        $copiarValores = $db->prepare('
            INSERT INTO puntuacion_valores (puntuacion_id, parametro_id, valor_texto, valor_num)
            SELECT :nuevo, parametro_id, valor_texto, valor_num FROM puntuacion_valores WHERE puntuacion_id = :origen
        ');
        $copiadas = 0;
        foreach ($filas as $f) {
            $insertPuntuacion->execute([':j' => $juegoId, ':u' => $f['usuario_id'], ':f' => $f['fecha']]);
            $nuevoId = (int) $db->lastInsertId();
            $copiarValores->execute([':nuevo' => $nuevoId, ':origen' => (int) $f['id']]);
            $copiadas++;
        }
        $db->commit();
    } catch (Throwable $e) {
        $db->rollBack();
        throw $e;
    }

    ok(['ok' => true, 'copiadas' => $copiadas]);
} catch (Throwable $e) {
    fail(500, 'Error del servidor: ' . $e->getMessage());
}
