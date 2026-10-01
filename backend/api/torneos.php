<?php
// CRUD de torneos. Hay dos tipos:
// - "mensual": título automático "Mes Año", con 0 o 1 juego asociado (se puede
//   crear vacío y asignar el juego después editándolo).
// - "super": título libre elegido por el usuario, con 0+ juegos (se pueden
//   ir añadiendo con el tiempo). Cada juego del torneo lleva sus propias
//   puntuaciones (independientes entre juegos, ver puntuaciones.php).

require __DIR__ . '/helpers.php';

const MESES_ES = [
    1 => 'Enero', 2 => 'Febrero', 3 => 'Marzo', 4 => 'Abril', 5 => 'Mayo', 6 => 'Junio',
    7 => 'Julio', 8 => 'Agosto', 9 => 'Septiembre', 10 => 'Octubre', 11 => 'Noviembre', 12 => 'Diciembre',
];

function juegosDelTorneo(PDO $db, int $torneoId): array {
    $stmt = $db->prepare('
        SELECT j.id, j.nombre, j.logo,
               (SELECT COUNT(*) FROM puntuaciones p WHERE p.torneo_id = tj.torneo_id AND p.juego_id = j.id) AS total_scores
        FROM torneo_juegos tj
        JOIN juegos j ON j.id = tj.juego_id
        WHERE tj.torneo_id = :t
        ORDER BY tj.orden ASC, tj.id ASC
    ');
    $stmt->execute([':t' => $torneoId]);
    return $stmt->fetchAll();
}

function campeonDelTorneo(PDO $db, int $torneoId): ?string {
    $stmtJuego = $db->prepare('SELECT juego_id FROM torneo_juegos WHERE torneo_id = :t ORDER BY orden ASC LIMIT 1');
    $stmtJuego->execute([':t' => $torneoId]);
    $jid = $stmtJuego->fetchColumn();
    if (!$jid) return null;

    $parametrosJuego = parametrosDelJuego($db, (int) $jid);

    $stmt = $db->prepare('
        SELECT p.id, p.juego_id, p.usuario_id, p.torneo_id, p.fecha, p.creado_en, u.nombre AS usuario
        FROM puntuaciones p
        JOIN usuarios u ON u.id = p.usuario_id
        WHERE p.torneo_id = :t AND p.juego_id = :j
    ');
    $stmt->execute([':t' => $torneoId, ':j' => $jid]);
    $filas = $stmt->fetchAll();
    if (empty($filas)) return null;

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
    return $filas[0]['usuario'] ?? null;
}

function torneoRow(PDO $db, int $id): ?array {
    $stmt = $db->prepare('SELECT id, tipo, nombre, mes, anio, logo, imagen_campeon, normas, caratula_reto, creado_en FROM torneos WHERE id = :id');
    $stmt->execute([':id' => $id]);
    $row = $stmt->fetch();
    if (!$row) return null;
    $row['juegos'] = juegosDelTorneo($db, $id);
    $row['total_scores'] = array_sum(array_column($row['juegos'], 'total_scores'));
    $row['campeon'] = campeonDelTorneo($db, $id);
    return $row;
}

function todosLosTorneos(PDO $db): array {
    $filas = $db->query('SELECT id, tipo, nombre, mes, anio, logo, imagen_campeon, normas, caratula_reto, creado_en FROM torneos ORDER BY anio DESC, mes DESC, nombre COLLATE NOCASE ASC')->fetchAll();
    foreach ($filas as &$f) {
        $f['juegos'] = juegosDelTorneo($db, (int) $f['id']);
        $f['total_scores'] = array_sum(array_column($f['juegos'], 'total_scores'));
        $f['campeon'] = campeonDelTorneo($db, (int) $f['id']);
    }
    unset($f);
    return $filas;
}

// Valida el payload y devuelve [tipo, nombre, mes, anio, juegoIds].
function validarDatosTorneo(PDO $db, array $in, ?string $tipoActual): array {
    $tipo = $tipoActual ?? trim($in['tipo'] ?? '');
    if (!in_array($tipo, ['mensual', 'super'], true)) fail(400, 'El tipo de torneo no es válido');

    $juegoIds = array_values(array_unique(array_map('intval', $in['juegos'] ?? []), SORT_NUMERIC));
    foreach ($juegoIds as $jid) {
        $existe = $db->prepare('SELECT 1 FROM juegos WHERE id = :id');
        $existe->execute([':id' => $jid]);
        if (!$existe->fetchColumn()) fail(400, 'Uno de los juegos elegidos ya no existe');
    }

    if ($tipo === 'mensual') {
        $mes = (int) ($in['mes'] ?? 0);
        if ($mes < 1 || $mes > 12) fail(400, 'El mes no es válido');
        $anio = (int) ($in['anio'] ?? 0);
        if ($anio < 1950 || $anio > 2100) fail(400, 'El año no es válido');
        if (count($juegoIds) > 1) fail(400, 'Un torneo mensual solo puede tener 1 juego');
        $nombre = MESES_ES[$mes] . ' ' . $anio;
        return [$tipo, $nombre, $mes, $anio, $juegoIds];
    }

    // super
    $nombre = trim($in['nombre'] ?? '');
    if ($nombre === '') fail(400, 'El nombre del supertorneo es obligatorio');
    if (mb_strlen($nombre) > 60) fail(400, 'El nombre es demasiado largo (máx. 60)');
    return [$tipo, $nombre, null, null, $juegoIds];
}

function sincronizarJuegosTorneo(PDO $db, int $torneoId, array $juegoIds): void {
    $db->prepare('DELETE FROM torneo_juegos WHERE torneo_id = :t')->execute([':t' => $torneoId]);
    $stmt = $db->prepare('INSERT INTO torneo_juegos (torneo_id, juego_id, orden) VALUES (:t, :j, :o)');
    foreach (array_values($juegoIds) as $orden => $juegoId) {
        $stmt->execute([':t' => $torneoId, ':j' => $juegoId, ':o' => $orden]);
    }
}

try {
    $db = getDb();
    $method = $_SERVER['REQUEST_METHOD'];
    $id = isset($_GET['id']) ? (int) $_GET['id'] : null;

    switch ($method) {
        case 'GET':
            if ($id) {
                $row = torneoRow($db, $id);
                if (!$row) fail(404, 'Torneo no encontrado');
                ok($row);
            }
            ok(todosLosTorneos($db));
            break;

        case 'POST':
            $in = bodyJson();
            [$tipo, $nombre, $mes, $anio, $juegoIds] = validarDatosTorneo($db, $in, null);
            $db->beginTransaction();
            try {
                $stmt = $db->prepare('INSERT INTO torneos (tipo, nombre, mes, anio) VALUES (:t, :n, :m, :a)');
                $stmt->execute([':t' => $tipo, ':n' => $nombre, ':m' => $mes, ':a' => $anio]);
                $newId = (int) $db->lastInsertId();
                sincronizarJuegosTorneo($db, $newId, $juegoIds);
                $logo = guardarImagen($in['logo'] ?? null, $newId, 'super');
                if ($logo) {
                    $db->prepare('UPDATE torneos SET logo = :l WHERE id = :id')->execute([':l' => $logo, ':id' => $newId]);
                }
                $db->commit();
            } catch (Throwable $e) {
                $db->rollBack();
                throw $e;
            }
            ok(torneoRow($db, $newId), 201);
            break;

        case 'PUT':
            if (!$id) fail(400, 'Falta el id');
            $actual = torneoRow($db, $id);
            if (!$actual) fail(404, 'Torneo no encontrado');
            $in = bodyJson();

            // Si es únicamente una actualización de la imagen del Panteón (campeón)
            if (array_key_exists('imagen_campeon', $in) || !empty($in['imagen_campeon_borrar'])) {
                if (!empty($in['imagen_campeon_borrar'])) {
                    borrarImagen($actual['imagen_campeon']);
                    $db->prepare('UPDATE torneos SET imagen_campeon = NULL WHERE id = :id')->execute([':id' => $id]);
                } elseif (!empty($in['imagen_campeon'])) {
                    if (!empty($actual['imagen_campeon'])) {
                        fail(409, 'Este torneo ya tiene una imagen de campeón asignada. Elimínala primero para subir una nueva.');
                    }
                    $nuevoPanteon = guardarImagen($in['imagen_campeon'], $id, 'panteon');
                    $db->prepare('UPDATE torneos SET imagen_campeon = :img WHERE id = :id')->execute([':img' => $nuevoPanteon, ':id' => $id]);
                }
                ok(torneoRow($db, $id));
                break;
            }
            // El tipo no se puede cambiar una vez creado el torneo.
            [$tipo, $nombre, $mes, $anio, $juegoIds] = validarDatosTorneo($db, $in, $actual['tipo']);
            $idsAntiguos = array_map('intval', array_column($actual['juegos'], 'id'));
            $idsEliminados = array_diff($idsAntiguos, $juegoIds);
            // No se puede quitar/cambiar un juego del torneo si ya tiene récords en él.
            $scoresPorJuego = [];
            foreach ($actual['juegos'] as $jg) {
                $scoresPorJuego[(int) $jg['id']] = (int) $jg['total_scores'];
            }
            foreach ($idsEliminados as $jidElim) {
                if (($scoresPorJuego[$jidElim] ?? 0) > 0) {
                    fail(409, 'No se puede quitar o cambiar un juego que ya tiene récords en este torneo');
                }
            }
            $db->beginTransaction();
            try {
                $stmt = $db->prepare('UPDATE torneos SET nombre = :n, mes = :m, anio = :a WHERE id = :id');
                $stmt->execute([':n' => $nombre, ':m' => $mes, ':a' => $anio, ':id' => $id]);
                sincronizarJuegosTorneo($db, $id, $juegoIds);
                // Imagen del supertorneo: reemplazar si llega 'logo', borrar si llega 'logo_borrar'.
                if (!empty($in['logo_borrar'])) {
                    borrarImagen($actual['logo']);
                    $db->prepare('UPDATE torneos SET logo = NULL WHERE id = :id')->execute([':id' => $id]);
                } elseif (!empty($in['logo'])) {
                    $nuevo = guardarImagen($in['logo'], $id, 'super');
                    borrarImagen($actual['logo']);
                    $db->prepare('UPDATE torneos SET logo = :l WHERE id = :id')->execute([':l' => $nuevo, ':id' => $id]);
                }
                $db->commit();
            } catch (Throwable $e) {
                $db->rollBack();
                throw $e;
            }
            ok(torneoRow($db, $id));
            break;

        case 'DELETE':
            if (!$id) fail(400, 'Falta el id');
            $actual = torneoRow($db, $id);
            if ($actual && (int) $actual['total_scores'] > 0) {
                fail(409, 'No se puede eliminar un torneo que ya tiene récords');
            }
            // ON DELETE CASCADE elimina también torneo_juegos y sus puntuaciones.
            $stmt = $db->prepare('DELETE FROM torneos WHERE id = :id');
            $stmt->execute([':id' => $id]);
            if ($actual) {
                borrarImagen($actual['logo']);
                if ($actual['caratula_reto']) {
                    borrarImagen($actual['caratula_reto']);
                }
            }
            ok(['ok' => true, 'eliminado' => $id]);
            break;

        default:
            fail(405, 'Método no permitido');
    }
} catch (Throwable $e) {
    fail(500, 'Error del servidor: ' . $e->getMessage());
}
