<?php
// CRUD del catálogo de parámetros de puntuación (puntos, tiempo, fase, personaje...).
// Son reutilizables: se pueden asignar a varios juegos.

require __DIR__ . '/helpers.php';

const TIPOS_VALIDOS = ['numero', 'tiempo', 'texto'];

try {
    $db = getDb();
    $method = $_SERVER['REQUEST_METHOD'];
    $id = isset($_GET['id']) ? (int) $_GET['id'] : null;

    switch ($method) {
        case 'GET':
            $sql = '
                SELECT pa.id, pa.nombre, pa.tipo, pa.creado_en,
                       COUNT(DISTINCT jp.id) AS en_uso,
                       COUNT(DISTINCT pv.id) AS total_valores
                FROM parametros pa
                LEFT JOIN juego_parametros jp ON jp.parametro_id = pa.id
                LEFT JOIN puntuacion_valores pv ON pv.parametro_id = pa.id
                GROUP BY pa.id
                ORDER BY en_uso DESC, total_valores DESC, pa.nombre COLLATE NOCASE ASC
            ';
            ok($db->query($sql)->fetchAll());
            break;

        case 'POST':
            $in = bodyJson();
            $nombre = trim($in['nombre'] ?? '');
            $tipo = trim($in['tipo'] ?? '');
            if ($nombre === '') {
                fail(400, 'El nombre del parámetro es obligatorio');
            }
            if (mb_strlen($nombre) > 40) {
                fail(400, 'El nombre es demasiado largo (máx. 40)');
            }
            if (!in_array($tipo, TIPOS_VALIDOS, true)) {
                fail(400, 'El tipo debe ser numero, tiempo o texto');
            }
            try {
                $stmt = $db->prepare('INSERT INTO parametros (nombre, tipo) VALUES (:n, :t)');
                $stmt->execute([':n' => $nombre, ':t' => $tipo]);
            } catch (PDOException $e) {
                if (str_contains($e->getMessage(), 'UNIQUE')) {
                    fail(409, 'Ese parámetro ya existe');
                }
                throw $e;
            }
            $newId = (int) $db->lastInsertId();
            $row = $db->query("SELECT id, nombre, tipo, creado_en, 0 AS en_uso, 0 AS total_valores FROM parametros WHERE id = $newId")->fetch();
            ok($row, 201);
            break;

        case 'PUT':
            if (!$id) {
                fail(400, 'Falta el id');
            }
            $in = bodyJson();
            $nombre = trim($in['nombre'] ?? '');
            $tipo = trim($in['tipo'] ?? '');
            if ($nombre === '') {
                fail(400, 'El nombre del parámetro es obligatorio');
            }
            if (!in_array($tipo, TIPOS_VALIDOS, true)) {
                fail(400, 'El tipo debe ser numero, tiempo o texto');
            }
            try {
                $stmt = $db->prepare('UPDATE parametros SET nombre = :n, tipo = :t WHERE id = :id');
                $stmt->execute([':n' => $nombre, ':t' => $tipo, ':id' => $id]);
            } catch (PDOException $e) {
                if (str_contains($e->getMessage(), 'UNIQUE')) {
                    fail(409, 'Ese nombre de parámetro ya existe');
                }
                throw $e;
            }
            $row = $db->query("
                SELECT pa.id, pa.nombre, pa.tipo, pa.creado_en,
                       COUNT(DISTINCT jp.id) AS en_uso,
                       COUNT(DISTINCT pv.id) AS total_valores
                FROM parametros pa
                LEFT JOIN juego_parametros jp ON jp.parametro_id = pa.id
                LEFT JOIN puntuacion_valores pv ON pv.parametro_id = pa.id
                WHERE pa.id = $id GROUP BY pa.id
            ")->fetch();
            if (!$row) fail(404, 'Parámetro no encontrado');
            ok($row);
            break;

        case 'DELETE':
            if (!$id) {
                fail(400, 'Falta el id');
            }
            $cnt = $db->prepare('SELECT COUNT(*) FROM puntuacion_valores WHERE parametro_id = :id');
            $cnt->execute([':id' => $id]);
            if ((int) $cnt->fetchColumn() > 0) {
                fail(400, 'No se puede eliminar un parámetro que ya tiene datos guardados');
            }
            // ON DELETE CASCADE quita también su uso en juegos si no tiene datos asociados.
            $stmt = $db->prepare('DELETE FROM parametros WHERE id = :id');
            $stmt->execute([':id' => $id]);
            ok(['ok' => true, 'eliminado' => $id]);
            break;

        default:
            fail(405, 'Método no permitido');
    }
} catch (Throwable $e) {
    fail(500, 'Error del servidor: ' . $e->getMessage());
}
