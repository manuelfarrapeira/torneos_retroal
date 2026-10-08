<?php
// Últimas puntuaciones registradas (generales, torneítos, retos y supertorneos)
// con juego, jugador, valor del primer parámetro y posición actual en su ranking.

require __DIR__ . '/helpers.php';

try {
    $db = getDb();
    $limite = isset($_GET['limit']) ? max(1, min(30, (int) $_GET['limit'])) : 10;

    $recientes = $db->query("
        SELECT p.id, p.juego_id, p.torneo_id, p.creado_en, u.nombre AS usuario, j.nombre AS juego,
               t.nombre AS torneo, t.tipo AS torneo_tipo
        FROM puntuaciones p
        JOIN usuarios u ON u.id = p.usuario_id
        JOIN juegos j ON j.id = p.juego_id
        LEFT JOIN torneos t ON t.id = p.torneo_id
        ORDER BY p.creado_en DESC, p.id DESC
        LIMIT $limite
    ")->fetchAll();

    $resultado = [];
    $cache = [];
    foreach ($recientes as $r) {
        $juegoId = (int) $r['juego_id'];
        $torneoId = $r['torneo_id'] !== null ? (int) $r['torneo_id'] : null;
        $clave = $juegoId . '_' . ($torneoId ?? 'null');

        if (!isset($cache[$clave])) {
            $parametros = parametrosDelJuego($db, $juegoId);
            $stmt = $db->prepare('SELECT id, creado_en FROM puntuaciones WHERE juego_id = :j AND torneo_id IS :t');
            $stmt->execute([':j' => $juegoId, ':t' => $torneoId]);
            $filas = $stmt->fetchAll();
            $vals = [];
            if ($filas) {
                $ids = implode(',', array_map(fn($f) => (int) $f['id'], $filas));
                foreach ($db->query("
                    SELECT pv.puntuacion_id, pv.parametro_id, pv.valor_texto, pv.valor_num
                    FROM puntuacion_valores pv WHERE pv.puntuacion_id IN ($ids)
                ")->fetchAll() as $v) {
                    $vals[$v['puntuacion_id']][$v['parametro_id']] = $v;
                }
            }
            foreach ($filas as &$f) { $f['valores'] = $vals[$f['id']] ?? []; }
            unset($f);
            $ordenadas = ordenarPorRanking($filas, $parametros);
            $posiciones = [];
            foreach ($ordenadas as $i => $f) { $posiciones[(int) $f['id']] = $i + 1; }
            $cache[$clave] = ['parametros' => $parametros, 'posiciones' => $posiciones, 'vals' => $vals];
        }

        $c = $cache[$clave];
        $primero = $c['parametros'][0] ?? null;
        $valor = '';
        if ($primero) {
            $v = $c['vals'][$r['id']][$primero['parametro_id']] ?? null;
            if ($v && $v['valor_texto'] !== null) {
                $valor = $primero['tipo'] === 'numero' ? number_format((float) $v['valor_num'], 0, ',', '.') : $v['valor_texto'];
            }
        }

        $resultado[] = [
            'id' => (int) $r['id'],
            'juego_id' => $juegoId,
            'torneo_id' => $torneoId,
            'juego' => $r['juego'],
            'usuario' => $r['usuario'],
            'parametro' => $primero['nombre'] ?? '',
            'valor' => $valor,
            'posicion' => $c['posiciones'][(int) $r['id']] ?? null,
            'total' => count($c['posiciones']),
            'torneo' => $r['torneo'],
            'torneo_tipo' => $r['torneo_tipo'],
        ];
    }

    ok($resultado);
} catch (Throwable $e) {
    fail('Error del servidor: ' . $e->getMessage(), 500);
}
