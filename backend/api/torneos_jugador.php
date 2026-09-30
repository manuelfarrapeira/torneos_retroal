<?php
// Devuelve, para un jugador, la lista de torneos MENSUALES y SUPERTORNEOS
// en los que ha participado, con su posición y puntuación en cada uno.

require __DIR__ . '/helpers.php';

const MESES_ES_TJ = [
    1 => 'Enero', 2 => 'Febrero', 3 => 'Marzo', 4 => 'Abril', 5 => 'Mayo', 6 => 'Junio',
    7 => 'Julio', 8 => 'Agosto', 9 => 'Septiembre', 10 => 'Octubre', 11 => 'Noviembre', 12 => 'Diciembre',
];

const PUNTOS_POS_TJ = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1];

try {
    $db = getDb();
    $usuarioId = isset($_GET['usuario_id']) ? (int) $_GET['usuario_id'] : 0;
    if (!$usuarioId) fail(400, 'Falta usuario_id');

    $tipoQuery = $_GET['tipo'] ?? 'all';

    // 1. TORNEOS MENSUALES (RETOS)
    $resultadoMensuales = [];
    if ($tipoQuery === 'all' || $tipoQuery === 'mensual') {
        $torneos = $db->query("
            SELECT t.id AS torneo_id, t.nombre AS torneo_nombre, t.mes, t.anio,
                   tj.juego_id, j.nombre AS juego_nombre, j.logo AS juego_logo
            FROM torneos t
            JOIN torneo_juegos tj ON tj.torneo_id = t.id
            JOIN juegos j ON j.id = tj.juego_id
            WHERE t.tipo = 'mensual'
            ORDER BY t.anio DESC, t.mes DESC, t.id DESC
        ")->fetchAll();

        foreach ($torneos as $t) {
            $juegoId = (int) $t['juego_id'];
            $torneoId = (int) $t['torneo_id'];

            $parametrosJuego = parametrosDelJuego($db, $juegoId);
            if (empty($parametrosJuego)) continue;

            $stmt = $db->prepare('
                SELECT p.id, p.usuario_id, p.fecha, p.creado_en, u.nombre AS usuario
                FROM puntuaciones p
                JOIN usuarios u ON u.id = p.usuario_id
                WHERE p.torneo_id = :t AND p.juego_id = :j
            ');
            $stmt->execute([':t' => $torneoId, ':j' => $juegoId]);
            $filas = $stmt->fetchAll();
            if (empty($filas)) continue;

            $participa = false;
            foreach ($filas as $f) {
                if ((int) $f['usuario_id'] === $usuarioId) { $participa = true; break; }
            }
            if (!$participa) continue;

            $ids = implode(',', array_map(fn($f) => (int) $f['id'], $filas));
            $vRows = $db->query("
                SELECT pv.puntuacion_id, pv.parametro_id, pa.nombre, pa.tipo, pv.valor_texto, pv.valor_num
                FROM puntuacion_valores pv
                JOIN parametros pa ON pa.id = pv.parametro_id
                WHERE pv.puntuacion_id IN ($ids)
            ")->fetchAll();
            $porPuntuacion = [];
            foreach ($vRows as $v) {
                $porPuntuacion[$v['puntuacion_id']][$v['parametro_id']] = $v;
            }
            foreach ($filas as &$f) {
                $f['valores'] = $porPuntuacion[$f['id']] ?? [];
            }
            unset($f);

            $filas = ordenarPorRanking($filas, $parametrosJuego);

            $pos = null;
            foreach ($filas as $i => $f) {
                if ((int) $f['usuario_id'] === $usuarioId) { $pos = $i + 1; break; }
            }
            if ($pos === null) continue;

            $miFila = null;
            foreach ($filas as $f) {
                if ((int) $f['usuario_id'] === $usuarioId) { $miFila = $f; break; }
            }
            $miFila['valores'] = array_values($miFila['valores']);

            $nombreReto = !empty($t['torneo_nombre'])
                ? $t['torneo_nombre']
                : (isset(MESES_ES_TJ[(int)$t['mes']]) ? MESES_ES_TJ[(int)$t['mes']] . ' ' . $t['anio'] : 'Reto');

            $resultadoMensuales[] = [
                'torneo_id' => $torneoId,
                'nombre' => $nombreReto,
                'mes' => (int) $t['mes'],
                'anio' => (int) $t['anio'],
                'juego' => ['id' => $juegoId, 'nombre' => $t['juego_nombre'], 'logo' => $t['juego_logo']],
                'pos' => $pos,
                'total' => count($filas),
                'valores' => $miFila['valores'],
            ];
        }
    }

    // 2. SUPERTORNEOS
    $resultadoSuper = [];
    if ($tipoQuery === 'all' || $tipoQuery === 'super') {
        $superTorneos = $db->query("
            SELECT t.id AS torneo_id, t.nombre AS torneo_nombre, t.logo AS torneo_logo, t.mes, t.anio
            FROM torneos t
            WHERE t.tipo = 'super'
            ORDER BY t.anio DESC, t.mes DESC, t.id DESC
        ")->fetchAll();

        foreach ($superTorneos as $st) {
            $torneoId = (int) $st['torneo_id'];

            $stmtJuegoList = $db->prepare("
                SELECT tj.juego_id, j.nombre AS juego_nombre, j.logo AS juego_logo
                FROM torneo_juegos tj
                JOIN juegos j ON j.id = tj.juego_id
                WHERE tj.torneo_id = :t
                ORDER BY tj.orden ASC, j.nombre ASC
            ");
            $stmtJuegoList->execute([':t' => $torneoId]);
            $juegos = $stmtJuegoList->fetchAll();

            $generalUserMap = [];
            $juegosResultadosJugador = [];
            $jugadorParticipa = false;

            foreach ($juegos as $jg) {
                $juegoId = (int) $jg['juego_id'];
                $parametrosJuego = parametrosDelJuego($db, $juegoId);
                if (empty($parametrosJuego)) continue;

                $stmtP = $db->prepare('
                    SELECT p.id, p.usuario_id, p.fecha, p.creado_en, u.nombre AS usuario
                    FROM puntuaciones p
                    JOIN usuarios u ON u.id = p.usuario_id
                    WHERE p.torneo_id = :t AND p.juego_id = :j
                ');
                $stmtP->execute([':t' => $torneoId, ':j' => $juegoId]);
                $filas = $stmtP->fetchAll();
                if (empty($filas)) continue;

                $ids = implode(',', array_map(fn($f) => (int) $f['id'], $filas));
                $vRows = $db->query("
                    SELECT pv.puntuacion_id, pv.parametro_id, pa.nombre, pa.tipo, pv.valor_texto, pv.valor_num
                    FROM puntuacion_valores pv
                    JOIN parametros pa ON pa.id = pv.parametro_id
                    WHERE pv.puntuacion_id IN ($ids)
                ")->fetchAll();
                $porPuntuacion = [];
                foreach ($vRows as $v) {
                    $porPuntuacion[$v['puntuacion_id']][$v['parametro_id']] = $v;
                }
                foreach ($filas as &$f) {
                    $f['valores'] = $porPuntuacion[$f['id']] ?? [];
                }
                unset($f);

                $filas = ordenarPorRanking($filas, $parametrosJuego);

                foreach ($filas as $idx => $f) {
                    $uid = (int) $f['usuario_id'];
                    $pts = $idx < count(PUNTOS_POS_TJ) ? PUNTOS_POS_TJ[$idx] : 0;

                    if (!isset($generalUserMap[$uid])) {
                        $generalUserMap[$uid] = [
                            'usuario_id' => $uid,
                            'usuario' => $f['usuario'],
                            'puntos' => 0,
                            'juegos' => 0,
                        ];
                    }
                    $generalUserMap[$uid]['puntos'] += $pts;
                    $generalUserMap[$uid]['juegos'] += 1;

                    if ($uid === $usuarioId) {
                        $jugadorParticipa = true;
                        $miFila = $f;
                        $miFila['valores'] = array_values($miFila['valores']);
                        $juegosResultadosJugador[] = [
                            'juego' => ['id' => $juegoId, 'nombre' => $jg['juego_nombre'], 'logo' => $jg['juego_logo']],
                            'pos' => $idx + 1,
                            'total' => count($filas),
                            'puntos' => $pts,
                            'valores' => $miFila['valores'],
                        ];
                    }
                }
            }

            if (!$jugadorParticipa) continue;

            $standings = array_values($generalUserMap);
            usort($standings, fn($a, $b) => $b['puntos'] <=> $a['puntos']);

            $posGeneral = null;
            $puntosGeneral = 0;
            foreach ($standings as $idx => $gu) {
                if ($gu['usuario_id'] === $usuarioId) {
                    $posGeneral = $idx + 1;
                    $puntosGeneral = $gu['puntos'];
                    break;
                }
            }

            $resultadoSuper[] = [
                'torneo_id' => $torneoId,
                'nombre' => $st['torneo_nombre'],
                'logo' => $st['torneo_logo'],
                'pos_general' => $posGeneral,
                'puntos_general' => $puntosGeneral,
                'total_general' => count($standings),
                'juegos' => $juegosResultadosJugador,
            ];
        }
    }

    if ($tipoQuery === 'mensual') {
        ok($resultadoMensuales);
    } elseif ($tipoQuery === 'super') {
        ok($resultadoSuper);
    } else {
        ok([
            'mensuales' => $resultadoMensuales,
            'supertorneos' => $resultadoSuper,
        ]);
    }
} catch (Throwable $e) {
    fail(500, 'Error del servidor: ' . $e->getMessage());
}
