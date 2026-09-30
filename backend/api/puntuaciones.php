<?php
// CRUD de puntuaciones asociadas a un juego, con valores dinámicos según los
// parámetros configurados en el juego (puntos, tiempo, fase, personaje...).

require __DIR__ . '/helpers.php';

// Convierte una entrada de tipo "tiempo" a segundos (float).
// Admite "HH:MM:SS.mmm", "MM:SS.mmm", "SS.mmm" o un número de segundos plano.
function tiempoASegundos(string $valor): ?float {
    $valor = trim($valor);
    if ($valor === '') return null;
    if (is_numeric($valor)) return (float) $valor;
    $partes = explode(':', $valor);
    if (count($partes) < 2 || count($partes) > 3) return null;
    foreach ($partes as $p) {
        if (!is_numeric($p)) return null;
    }
    $segundos = 0.0;
    foreach ($partes as $p) {
        $segundos = $segundos * 60 + (float) $p;
    }
    return $segundos;
}

// Formatea segundos a "MM:SS.mmm" (o "H:MM:SS.mmm" si supera la hora) para mostrar.
function segundosATiempo(float $segundos): string {
    $horas = (int) floor($segundos / 3600);
    $resto = $segundos - $horas * 3600;
    $mins = (int) floor($resto / 60);
    $secs = $resto - $mins * 60;
    $secsStr = number_format($secs, 3, '.', '');
    if ($horas > 0) {
        return sprintf('%d:%02d:%06.3f', $horas, $mins, $secs);
    }
    return sprintf('%d:%06.3f', $mins, $secs);
}

// Normaliza un valor recibido según el tipo del parámetro.
// Devuelve [valor_texto, valor_num] o lanza fail() si no es válido.
// Un campo vacío es válido para cualquier tipo: se guarda como null (no
// obligatorio) y sencillamente no se muestra en la tabla de puntuaciones.
function normalizarValor(array $parametro, $valor): array {
    $tipo = $parametro['tipo'];
    $vacio = $valor === null || (is_string($valor) && trim($valor) === '');
    if ($vacio) {
        return [null, null];
    }
    if ($tipo === 'numero') {
        if (!is_numeric($valor)) {
            fail(400, "El campo \"{$parametro['nombre']}\" debe ser un número");
        }
        $num = (float) $valor;
        $texto = (fmod($num, 1.0) === 0.0) ? (string) (int) $num : rtrim(rtrim(number_format($num, 3, '.', ''), '0'), '.');
        return [$texto, $num];
    }
    if ($tipo === 'tiempo') {
        $segundos = is_string($valor) || is_numeric($valor) ? tiempoASegundos((string) $valor) : null;
        if ($segundos === null) {
            fail(400, "El campo \"{$parametro['nombre']}\" debe ser un tiempo válido (MM:SS.mmm)");
        }
        return [segundosATiempo($segundos), $segundos];
    }
    // texto
    $texto = trim((string) $valor);
    if (mb_strlen($texto) > 60) {
        fail(400, "El campo \"{$parametro['nombre']}\" es demasiado largo (máx. 60)");
    }
    return [$texto, null];
}

function guardarValores(PDO $db, int $puntuacionId, array $parametrosJuego, array $valoresIn): void {
    $db->prepare('DELETE FROM puntuacion_valores WHERE puntuacion_id = :p')->execute([':p' => $puntuacionId]);
    $stmt = $db->prepare('
        INSERT INTO puntuacion_valores (puntuacion_id, parametro_id, valor_texto, valor_num)
        VALUES (:p, :param, :vt, :vn)
    ');
    foreach ($parametrosJuego as $param) {
        $crudo = $valoresIn[(string) $param['parametro_id']] ?? $valoresIn[$param['parametro_id']] ?? null;
        [$texto, $num] = normalizarValor($param, $crudo);
        $stmt->execute([
            ':p' => $puntuacionId,
            ':param' => $param['parametro_id'],
            ':vt' => $texto,
            ':vn' => $num,
        ]);
    }
}

// Comprueba que un juego forma parte de un torneo (necesario en supertorneos,
// que pueden tener varios juegos, cada uno con sus propias puntuaciones).
function juegoPerteneceATorneo(PDO $db, int $torneoId, int $juegoId): bool {
    $stmt = $db->prepare('SELECT 1 FROM torneo_juegos WHERE torneo_id = :t AND juego_id = :j');
    $stmt->execute([':t' => $torneoId, ':j' => $juegoId]);
    return (bool) $stmt->fetchColumn();
}

// Comprueba si un jugador ya tiene una puntuación en ese juego/torneo
// (excluyendo, en su caso, la propia puntuación que se está editando).
function existeDuplicado(PDO $db, int $juegoId, int $usuarioId, ?int $torneoId, ?int $excludeId = null): bool {
    $sql = 'SELECT id FROM puntuaciones WHERE juego_id = :j AND usuario_id = :u AND torneo_id IS :t';
    if ($excludeId) $sql .= ' AND id != :id';
    $sql .= ' LIMIT 1';
    $stmt = $db->prepare($sql);
    $params = [':j' => $juegoId, ':u' => $usuarioId, ':t' => $torneoId];
    if ($excludeId) $params[':id'] = $excludeId;
    $stmt->execute($params);
    return (bool) $stmt->fetchColumn();
}

function puntuacionCompleta(PDO $db, int $id): ?array {
    $stmt = $db->prepare('
        SELECT p.id, p.juego_id, p.usuario_id, p.torneo_id, p.fecha, p.creado_en, u.nombre AS usuario
        FROM puntuaciones p
        JOIN usuarios u ON u.id = p.usuario_id
        WHERE p.id = :id
    ');
    $stmt->execute([':id' => $id]);
    $row = $stmt->fetch();
    if (!$row) return null;

    $vStmt = $db->prepare('
        SELECT pv.parametro_id, pa.nombre, pa.tipo, pv.valor_texto, pv.valor_num
        FROM puntuacion_valores pv
        JOIN parametros pa ON pa.id = pv.parametro_id
        WHERE pv.puntuacion_id = :id
    ');
    $vStmt->execute([':id' => $id]);
    $row['valores'] = $vStmt->fetchAll();
    return $row;
}

try {
    $db = getDb();
    $method = $_SERVER['REQUEST_METHOD'];
    $id = isset($_GET['id']) ? (int) $_GET['id'] : null;
    $juegoId = isset($_GET['juego_id']) ? (int) $_GET['juego_id'] : null;
    $torneoId = isset($_GET['torneo_id']) ? (int) $_GET['torneo_id'] : null;

    switch ($method) {
        case 'GET':
            if ($torneoId) {
                // Un torneo (mensual o super) puede tener varios juegos; hay que
                // indicar cuál de ellos se quiere consultar (o sin juego_id para obtener todos).
                $t = $db->prepare('SELECT 1 FROM torneos WHERE id = :t');
                $t->execute([':t' => $torneoId]);
                if (!$t->fetchColumn()) fail(404, 'El torneo no existe');
                if ($juegoId && !juegoPerteneceATorneo($db, $torneoId, $juegoId)) {
                    fail(400, 'Ese juego no pertenece a este torneo');
                }
            } elseif (!$juegoId) {
                fail(400, 'Falta juego_id');
            }

            if ($torneoId && !$juegoId) {
                $stmt = $db->prepare('
                    SELECT p.id, p.juego_id, p.usuario_id, p.torneo_id, p.fecha, p.creado_en, u.nombre AS usuario
                    FROM puntuaciones p
                    JOIN usuarios u ON u.id = p.usuario_id
                    WHERE p.torneo_id = :t
                ');
                $stmt->execute([':t' => $torneoId]);
                $filas = $stmt->fetchAll();

                if (!empty($filas)) {
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
                        $f['valores'] = array_values($porPuntuacion[$f['id']] ?? []);
                    }
                    unset($f);
                } else {
                    $filas = [];
                }
                ok($filas);
                break;
            }

            $parametrosJuego = parametrosDelJuego($db, $juegoId);

            if ($torneoId) {
                $stmt = $db->prepare('
                    SELECT p.id, p.juego_id, p.usuario_id, p.torneo_id, p.fecha, p.creado_en, u.nombre AS usuario
                    FROM puntuaciones p
                    JOIN usuarios u ON u.id = p.usuario_id
                    WHERE p.torneo_id = :t AND p.juego_id = :j
                ');
                $stmt->execute([':t' => $torneoId, ':j' => $juegoId]);
            } else {
                // Clasificación general: nunca incluye puntuaciones de torneos.
                $stmt = $db->prepare('
                    SELECT p.id, p.juego_id, p.usuario_id, p.torneo_id, p.fecha, p.creado_en, u.nombre AS usuario
                    FROM puntuaciones p
                    JOIN usuarios u ON u.id = p.usuario_id
                    WHERE p.juego_id = :j AND p.torneo_id IS NULL
                ');
                $stmt->execute([':j' => $juegoId]);
            }
            $filas = $stmt->fetchAll();

            if (!empty($filas)) {
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
            } else {
                foreach ($filas as &$f) { $f['valores'] = []; }
                unset($f);
            }

            $filas = ordenarPorRanking($filas, $parametrosJuego);
            // Reindexa 'valores' como lista simple para el frontend (más fácil de iterar).
            foreach ($filas as &$f) {
                $f['valores'] = array_values($f['valores']);
            }
            unset($f);

            ok($filas);
            break;

        case 'POST':
            $in = bodyJson();
            $torneoIdIn = (int) ($in['torneo_id'] ?? 0);
            $juego = (int) ($in['juego_id'] ?? 0);
            $usuarioId = (int) ($in['usuario_id'] ?? 0);
            $fecha = trim($in['fecha'] ?? '');

            if ($torneoIdIn) {
                // Un torneo puede tener varios juegos (supertorneos); hay que
                // indicar explícitamente cuál de ellos se está puntuando.
                $t = $db->prepare('SELECT 1 FROM torneos WHERE id = :t');
                $t->execute([':t' => $torneoIdIn]);
                if (!$t->fetchColumn()) fail(404, 'El torneo no existe');
                if (!$juego) fail(400, 'Falta juego_id');
                if (!juegoPerteneceATorneo($db, $torneoIdIn, $juego)) {
                    fail(400, 'Ese juego no pertenece a este torneo');
                }
            } else {
                if (!$juego) fail(400, 'Falta juego_id');
                $existe = $db->prepare('SELECT 1 FROM juegos WHERE id = :j');
                $existe->execute([':j' => $juego]);
                if (!$existe->fetchColumn()) fail(404, 'El juego no existe');
            }

            if (!$usuarioId) fail(400, 'Falta usuario_id (elige un jugador)');
            if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $fecha)) fail(400, 'La fecha es obligatoria (AAAA-MM-DD)');

            $existeU = $db->prepare('SELECT 1 FROM usuarios WHERE id = :u');
            $existeU->execute([':u' => $usuarioId]);
            if (!$existeU->fetchColumn()) fail(404, 'El usuario no existe');

            $parametrosJuego = parametrosDelJuego($db, $juego);
            if (empty($parametrosJuego)) {
                fail(400, 'Este juego no tiene parámetros de puntuación configurados');
            }

            if (existeDuplicado($db, $juego, $usuarioId, $torneoIdIn ?: null)) {
                fail(409, $torneoIdIn
                    ? 'Este jugador ya tiene una puntuación en este torneo'
                    : 'Este jugador ya tiene una puntuación en la clasificación general de este juego');
            }

            $db->beginTransaction();
            try {
                $stmt = $db->prepare('INSERT INTO puntuaciones (juego_id, usuario_id, torneo_id, fecha) VALUES (:j, :u, :t, :f)');
                $stmt->execute([':j' => $juego, ':u' => $usuarioId, ':t' => $torneoIdIn ?: null, ':f' => $fecha]);
                $newId = (int) $db->lastInsertId();
                guardarValores($db, $newId, $parametrosJuego, $in['valores'] ?? []);
                $db->commit();
            } catch (Throwable $e) {
                $db->rollBack();
                throw $e;
            }

            ok(puntuacionCompleta($db, $newId), 201);
            break;

        case 'PUT':
            if (!$id) fail(400, 'Falta el id');
            $actual = $db->prepare('SELECT * FROM puntuaciones WHERE id = :id');
            $actual->execute([':id' => $id]);
            $actual = $actual->fetch();
            if (!$actual) fail(404, 'Puntuación no encontrada');

            $in = bodyJson();
            $usuarioId = (int) ($in['usuario_id'] ?? $actual['usuario_id']);
            $fecha = trim($in['fecha'] ?? $actual['fecha']);
            if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $fecha)) fail(400, 'La fecha es obligatoria (AAAA-MM-DD)');

            $existeU = $db->prepare('SELECT 1 FROM usuarios WHERE id = :u');
            $existeU->execute([':u' => $usuarioId]);
            if (!$existeU->fetchColumn()) fail(404, 'El usuario no existe');

            $torneoIdActual = $actual['torneo_id'] !== null ? (int) $actual['torneo_id'] : null;
            if (existeDuplicado($db, (int) $actual['juego_id'], $usuarioId, $torneoIdActual, $id)) {
                fail(409, $torneoIdActual
                    ? 'Este jugador ya tiene una puntuación en este torneo'
                    : 'Este jugador ya tiene una puntuación en la clasificación general de este juego');
            }

            $parametrosJuego = parametrosDelJuego($db, (int) $actual['juego_id']);

            $db->beginTransaction();
            try {
                $stmt = $db->prepare('UPDATE puntuaciones SET usuario_id = :u, fecha = :f WHERE id = :id');
                $stmt->execute([':u' => $usuarioId, ':f' => $fecha, ':id' => $id]);
                if (array_key_exists('valores', $in)) {
                    guardarValores($db, $id, $parametrosJuego, $in['valores'] ?? []);
                }
                $db->commit();
            } catch (Throwable $e) {
                $db->rollBack();
                throw $e;
            }

            ok(puntuacionCompleta($db, $id));
            break;

        case 'DELETE':
            if (!$id) fail(400, 'Falta el id');
            $stmt = $db->prepare('DELETE FROM puntuaciones WHERE id = :id');
            $stmt->execute([':id' => $id]);
            ok(['ok' => true, 'eliminada' => $id]);
            break;

        default:
            fail(405, 'Método no permitido');
    }
} catch (Throwable $e) {
    fail(500, 'Error del servidor: ' . $e->getMessage());
}
