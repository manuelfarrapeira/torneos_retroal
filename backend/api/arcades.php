<?php
// CRUD de Arcades Retroal (galerías con imagen y enlace web)
require __DIR__ . '/helpers.php';

// Obtener directorio de arcades
function arcadesDir(): string {
    $dir = __DIR__ . '/../uploads/arcades';
    if (!is_dir($dir)) {
        mkdir($dir, 0775, true);
    }
    return $dir;
}

// Guardar imagen de arcade desde data URL
function guardarImagenArcade(?string $dataUrl): ?string {
    if ($dataUrl === null || trim($dataUrl) === '') {
        return null;
    }
    if (!preg_match('/^data:(image\/(png|jpe?g|gif|webp));base64,(.+)$/i', trim($dataUrl), $m)) {
        fail(400, 'Formato no válido (usa PNG, JPG, GIF o WEBP)');
    }
    $ext = strtolower($m[2] === 'jpeg' ? 'jpg' : $m[2]);
    $bin = base64_decode($m[3], true);
    if ($bin === false) {
        fail(400, 'No se pudo decodificar la imagen');
    }
    $maxBytes = 1 * 1024 * 1024; // 1 MB máximo (mismo límite que el resto de imágenes)
    if (strlen($bin) > $maxBytes) {
        fail(400, 'La imagen supera el tamaño máximo permitido (1MB)');
    }
    $nombre = 'arcade_' . time() . '_' . uniqid() . '.' . $ext;
    $ruta = arcadesDir() . '/' . $nombre;
    file_put_contents($ruta, $bin);
    return 'uploads/arcades/' . $nombre;
}

// Eliminar imagen de arcade
function borrarImagenArcade(?string $rutaRelativa): void {
    if (!$rutaRelativa) return;
    $ruta = __DIR__ . '/../' . $rutaRelativa;
    if (is_file($ruta)) {
        @unlink($ruta);
    }
}

// Asigna hasta 2 jugadores a un arcade (lista vacía = liberar). Un jugador solo
// puede estar en un arcade.
function asignarJugadoresArcade(PDO $db, int $arcadeId, $usuarioIds): void {
    if (!is_array($usuarioIds)) {
        $usuarioIds = $usuarioIds ? [$usuarioIds] : [];
    }
    $ids = array_values(array_unique(array_filter(array_map('intval', $usuarioIds))));
    if (count($ids) > 2) {
        fail(400, 'Un arcade admite como máximo 2 jugadores');
    }
    foreach ($ids as $uid) {
        $stmt = $db->prepare('SELECT id FROM usuarios WHERE id = :id');
        $stmt->execute([':id' => $uid]);
        if (!$stmt->fetch()) {
            fail(400, 'El jugador no existe');
        }
        $stmt = $db->prepare('SELECT id FROM arcades WHERE (usuario_id = :u OR usuario_id2 = :u) AND id <> :a');
        $stmt->execute([':u' => $uid, ':a' => $arcadeId]);
        if ($stmt->fetch()) {
            fail(400, 'Un jugador ya tiene otro arcade asignado');
        }
    }
    $stmt = $db->prepare('UPDATE arcades SET usuario_id = :u1, usuario_id2 = :u2 WHERE id = :a');
    $stmt->execute([':u1' => $ids[0] ?? null, ':u2' => $ids[1] ?? null, ':a' => $arcadeId]);
}

try {
    $db = getDb();
    $method = $_SERVER['REQUEST_METHOD'];

    if ($method === 'GET') {
        // Más recientes primero (los nuevos arcades reciben orden = max + 1)
        $stmt = $db->prepare('
            SELECT id, nombre, imagen, enlace, orden, creado_en, usuario_id, usuario_id2
            FROM arcades
            ORDER BY orden DESC, id DESC
        ');
        $stmt->execute();
        ok($stmt->fetchAll());

    } elseif ($method === 'POST') {
        // Crear un nuevo arcade - SOLO ADMIN
        if (!isAdmin()) {
            fail(403, 'No tienes permisos para crear arcades');
        }

        $in = bodyJson();
        $imagen = $in['imagen'] ?? null;
        $enlace = trim($in['enlace'] ?? '');
        
        if (!$imagen) {
            fail(400, 'La imagen es requerida');
        }

        if (!$enlace) {
            fail(400, 'El enlace web es requerido');
        }

        // Guardar imagen en directorio
        $imagenPath = guardarImagenArcade($imagen);

        // Generar nombre automático basado en el ID siguiente
        $stmt = $db->prepare('SELECT MAX(CAST(SUBSTR(nombre, 7) AS INTEGER)) FROM arcades WHERE nombre LIKE "Arcade %"');
        $stmt->execute();
        $maxNum = (int)($stmt->fetchColumn() ?? 0);
        $nombre = "Arcade " . ($maxNum + 1);

        // Obtener el máximo orden actual
        $stmt = $db->prepare('SELECT MAX(orden) FROM arcades');
        $stmt->execute();
        $maxOrden = (int)($stmt->fetchColumn() ?? 0);

        $stmt = $db->prepare('
            INSERT INTO arcades (nombre, imagen, enlace, orden)
            VALUES (:nombre, :imagen, :enlace, :orden)
        ');
        $stmt->execute([
            ':nombre' => $nombre,
            ':imagen' => $imagenPath,
            ':enlace' => $enlace,
            ':orden' => $maxOrden + 1
        ]);

        $newArcadeId = (int)$db->lastInsertId();
        if (array_key_exists('usuario_ids', $in)) {
            asignarJugadoresArcade($db, $newArcadeId, $in['usuario_ids']);
        }

        ok(['id' => $newArcadeId]);

    } elseif ($method === 'PUT') {
        // Actualizar un arcade - SOLO ADMIN
        if (!isAdmin()) {
            fail(403, 'No tienes permisos para editar arcades');
        }

        $in = bodyJson();
        $id = (int)($in['id'] ?? 0);
        $imagen = $in['imagen'] ?? null;
        $enlace = trim($in['enlace'] ?? '');

        if (!$id) {
            fail(400, 'ID es requerido');
        }

        if (!$enlace) {
            fail(400, 'El enlace web es requerido');
        }

        // Obtener arcade actual
        $stmt = $db->prepare('SELECT id, imagen FROM arcades WHERE id = :id');
        $stmt->execute([':id' => $id]);
        $arcade = $stmt->fetch();
        if (!$arcade) {
            fail(404, 'Arcade no encontrado');
        }

        $imagenPath = $arcade['imagen'];
        
        // Si hay imagen nueva, guardarla y eliminar la vieja
        if ($imagen && strpos($imagen, 'data:image') === 0) {
            $newImagenPath = guardarImagenArcade($imagen);
            borrarImagenArcade($imagenPath);
            $imagenPath = $newImagenPath;
        }

        if (!$imagenPath) {
            fail(400, 'La imagen es requerida');
        }

        $stmt = $db->prepare('
            UPDATE arcades
            SET imagen = :imagen, enlace = :enlace
            WHERE id = :id
        ');
        $stmt->execute([
            ':id' => $id,
            ':imagen' => $imagenPath,
            ':enlace' => $enlace
        ]);

        if (array_key_exists('usuario_ids', $in)) {
            asignarJugadoresArcade($db, $id, $in['usuario_ids']);
        }

        ok(['ok' => true]);

    } elseif ($method === 'DELETE') {
        // Eliminar un arcade - SOLO ADMIN
        if (!isAdmin()) {
            fail(403, 'No tienes permisos para eliminar arcades');
        }

        $id = (int)($_GET['id'] ?? 0);
        
        if (!$id) {
            fail(400, 'ID es requerido');
        }

        $stmt = $db->prepare('SELECT id, imagen FROM arcades WHERE id = :id');
        $stmt->execute([':id' => $id]);
        $arcade = $stmt->fetch();
        if (!$arcade) {
            fail(404, 'Arcade no encontrado');
        }

        // Borrar imagen del servidor
        borrarImagenArcade($arcade['imagen']);

        $stmt = $db->prepare('DELETE FROM arcades WHERE id = :id');
        $stmt->execute([':id' => $id]);

        ok(['ok' => true]);

    } else {
        fail(405, 'Método no permitido');
    }

} catch (Throwable $e) {
    fail(500, 'Error del servidor: ' . $e->getMessage());
}

