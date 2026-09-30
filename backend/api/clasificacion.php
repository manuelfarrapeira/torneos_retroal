<?php
// Devuelve, en una sola llamada, el top10 de la clasificación general (no de
// torneos) de todos los juegos que tienen puntuaciones y parámetros
// configurados. Antes el frontend hacía 1 petición HTTP por juego (decenas de
// peticiones); aquí se resuelve todo con unas pocas consultas SQL.

require __DIR__ . '/helpers.php';

try {
    $db = getDb();

    $juegos = $db->query('SELECT id FROM juegos')->fetchAll();

    $parametrosPorJuego = [];
    foreach ($juegos as $j) {
        $pj = parametrosDelJuego($db, (int) $j['id']);
        if (!empty($pj)) {
            $parametrosPorJuego[(int) $j['id']] = $pj;
        }
    }

    if (empty($parametrosPorJuego)) {
        ok([]);
    }

    $juegoIds = implode(',', array_keys($parametrosPorJuego));
    $filasTodas = $db->query("
        SELECT p.id, p.juego_id, p.usuario_id, p.fecha, p.creado_en, u.nombre AS usuario
        FROM puntuaciones p
        JOIN usuarios u ON u.id = p.usuario_id
        WHERE p.juego_id IN ($juegoIds) AND p.torneo_id IS NULL
    ")->fetchAll();

    $porPuntuacion = [];
    if (!empty($filasTodas)) {
        $ids = implode(',', array_map(fn($f) => (int) $f['id'], $filasTodas));
        $vRows = $db->query("
            SELECT pv.puntuacion_id, pv.parametro_id, pa.nombre, pa.tipo, pv.valor_texto, pv.valor_num
            FROM puntuacion_valores pv
            JOIN parametros pa ON pa.id = pv.parametro_id
            WHERE pv.puntuacion_id IN ($ids)
        ")->fetchAll();
        foreach ($vRows as $v) {
            $porPuntuacion[$v['puntuacion_id']][$v['parametro_id']] = $v;
        }
    }

    $porJuego = [];
    foreach ($filasTodas as $f) {
        $f['valores'] = $porPuntuacion[$f['id']] ?? [];
        $porJuego[(int) $f['juego_id']][] = $f;
    }

    $resultado = [];
    foreach ($parametrosPorJuego as $juegoId => $pj) {
        $filas = $porJuego[$juegoId] ?? [];
        if (empty($filas)) continue;
        $filas = ordenarPorRanking($filas, $pj);
        $top10 = array_slice($filas, 0, 10);
        foreach ($top10 as &$f) {
            $f['valores'] = array_values($f['valores']);
            unset($f['juego_id']);
        }
        unset($f);
        $resultado[] = ['juego_id' => $juegoId, 'top10' => $top10];
    }

    ok($resultado);
} catch (Throwable $e) {
    fail(500, 'Error del servidor: ' . $e->getMessage());
}
