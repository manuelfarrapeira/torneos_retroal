<?php
// CRUD de usuarios (jugadores) que registran puntuaciones.

require __DIR__ . '/helpers.php';

try {
    $db = getDb();
    $method = $_SERVER['REQUEST_METHOD'];
    $id = isset($_GET['id']) ? (int) $_GET['id'] : null;

    switch ($method) {
        case 'GET':
            $sql = '
                SELECT u.id, u.nombre, u.creado_en,
                       COUNT(p.id) AS total_scores
                FROM usuarios u
                LEFT JOIN puntuaciones p ON p.usuario_id = u.id
                GROUP BY u.id
                ORDER BY u.nombre COLLATE NOCASE ASC
            ';
            ok($db->query($sql)->fetchAll());
            break;

        case 'POST':
            $in = bodyJson();
            $nombre = trim($in['nombre'] ?? '');
            if ($nombre === '') {
                fail(400, 'El nombre del usuario es obligatorio');
            }
            if (mb_strlen($nombre) > 40) {
                fail(400, 'El nombre es demasiado largo (máx. 40)');
            }
            try {
                $stmt = $db->prepare('INSERT INTO usuarios (nombre) VALUES (:n)');
                $stmt->execute([':n' => $nombre]);
            } catch (PDOException $e) {
                if (str_contains($e->getMessage(), 'UNIQUE')) {
                    fail(409, 'Ese usuario ya existe');
                }
                throw $e;
            }
            $newId = (int) $db->lastInsertId();
            $row = $db->query("SELECT id, nombre, creado_en, 0 AS total_scores FROM usuarios WHERE id = $newId")->fetch();
            ok($row, 201);
            break;

        case 'PUT':
            if (!$id) {
                fail(400, 'Falta el id');
            }
            $in = bodyJson();
            $nombre = trim($in['nombre'] ?? '');
            if ($nombre === '') {
                fail(400, 'El nombre del usuario es obligatorio');
            }
            if (mb_strlen($nombre) > 40) {
                fail(400, 'El nombre es demasiado largo (máx. 40)');
            }
            try {
                $stmt = $db->prepare('UPDATE usuarios SET nombre = :n WHERE id = :id');
                $stmt->execute([':n' => $nombre, ':id' => $id]);
            } catch (PDOException $e) {
                if (str_contains($e->getMessage(), 'UNIQUE')) {
                    fail(409, 'Ese nombre de usuario ya existe');
                }
                throw $e;
            }
            $row = $db->query("
                SELECT u.id, u.nombre, u.creado_en, COUNT(p.id) AS total_scores
                FROM usuarios u LEFT JOIN puntuaciones p ON p.usuario_id = u.id
                WHERE u.id = $id GROUP BY u.id
            ")->fetch();
            if (!$row) fail(404, 'Usuario no encontrado');
            ok($row);
            break;

        case 'DELETE':
            if (!$id) {
                fail(400, 'Falta el id');
            }
            // ON DELETE CASCADE elimina también sus puntuaciones.
            $stmt = $db->prepare('DELETE FROM usuarios WHERE id = :id');
            $stmt->execute([':id' => $id]);
            ok(['ok' => true, 'eliminado' => $id]);
            break;

        default:
            fail(405, 'Método no permitido');
    }
} catch (Throwable $e) {
    fail(500, 'Error del servidor: ' . $e->getMessage());
}
