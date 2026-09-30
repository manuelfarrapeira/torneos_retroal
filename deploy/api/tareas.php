<?php
// API REST mínima para gestionar tareas (CRUD) sobre SQLite.

require __DIR__ . '/db.php';

header('Content-Type: application/json; charset=utf-8');

// CORS solo útil en desarrollo (Vite en otro puerto). En Web Station,
// al ir todo bajo el mismo origen, no molesta.
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function bodyJson(): array {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function fail(int $code, string $msg): void {
    http_response_code($code);
    echo json_encode(['error' => $msg], JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    $db = getDb();
    $method = $_SERVER['REQUEST_METHOD'];
    $id = isset($_GET['id']) ? (int) $_GET['id'] : null;

    switch ($method) {
        case 'GET':
            $stmt = $db->query('SELECT * FROM tareas ORDER BY id DESC');
            echo json_encode($stmt->fetchAll(), JSON_UNESCAPED_UNICODE);
            break;

        case 'POST':
            $in = bodyJson();
            $titulo = trim($in['titulo'] ?? '');
            if ($titulo === '') {
                fail(400, 'El título es obligatorio');
            }
            $stmt = $db->prepare('INSERT INTO tareas (titulo) VALUES (:t)');
            $stmt->execute([':t' => $titulo]);
            $newId = (int) $db->lastInsertId();
            $row = $db->query("SELECT * FROM tareas WHERE id = $newId")->fetch();
            http_response_code(201);
            echo json_encode($row, JSON_UNESCAPED_UNICODE);
            break;

        case 'PUT':
            if (!$id) {
                fail(400, 'Falta el id');
            }
            $in = bodyJson();
            $fields = [];
            $params = [':id' => $id];
            if (isset($in['titulo'])) {
                $fields[] = 'titulo = :t';
                $params[':t'] = trim($in['titulo']);
            }
            if (isset($in['hecha'])) {
                $fields[] = 'hecha = :h';
                $params[':h'] = $in['hecha'] ? 1 : 0;
            }
            if (!$fields) {
                fail(400, 'Nada que actualizar');
            }
            $sql = 'UPDATE tareas SET ' . implode(', ', $fields) . ' WHERE id = :id';
            $db->prepare($sql)->execute($params);
            $row = $db->query("SELECT * FROM tareas WHERE id = $id")->fetch();
            if (!$row) {
                fail(404, 'Tarea no encontrada');
            }
            echo json_encode($row, JSON_UNESCAPED_UNICODE);
            break;

        case 'DELETE':
            if (!$id) {
                fail(400, 'Falta el id');
            }
            $stmt = $db->prepare('DELETE FROM tareas WHERE id = :id');
            $stmt->execute([':id' => $id]);
            echo json_encode(['ok' => true, 'eliminada' => $id]);
            break;

        default:
            fail(405, 'Método no permitido');
    }
} catch (Throwable $e) {
    fail(500, 'Error del servidor: ' . $e->getMessage());
}
