<?php
header('Content-Type: application/json');
require_once 'helpers.php';
require_once 'db.php';

// Solo admin puede subir carátulas de retos
if (!isAdmin()) {
    fail('Acceso denegado');
    exit;
}

// POST con torneo_id y archivo
$torneo_id = $_POST['torneo_id'] ?? null;
if (!$torneo_id) {
    fail('torneo_id requerido');
    exit;
}

if (!isset($_FILES['caratula']) || $_FILES['caratula']['error'] !== UPLOAD_ERR_OK) {
    fail('Error al subir archivo');
    exit;
}

$file = $_FILES['caratula'];

// Validaciones
$maxSize = 1 * 1024 * 1024; // 1 MB
if ($file['size'] > $maxSize) {
    fail('Archivo demasiado grande (máximo 1 MB)');
    exit;
}

$mimeAllowed = ['image/jpeg', 'image/png'];
$mime = mime_content_type($file['tmp_name']);
if (!in_array($mime, $mimeAllowed)) {
    fail('Solo se permiten JPG y PNG');
    exit;
}

try {
    $db = getDb();
    
    // Verificar que el torneo existe y es mensual
    $stmt = $db->prepare('SELECT id, caratula_reto, tipo FROM torneos WHERE id = ?');
    $stmt->execute([$torneo_id]);
    $torneo = $stmt->fetch();
    
    if (!$torneo) {
        fail('Reto no encontrado');
        exit;
    }
    
    if ($torneo['tipo'] !== 'mensual') {
        fail('Solo retos (torneos mensuales) pueden tener carátula');
        exit;
    }
    
    // Eliminar archivo anterior si existe
    if ($torneo['caratula_reto']) {
        $oldPath = __DIR__ . '/../' . $torneo['caratula_reto'];
        if (file_exists($oldPath)) {
            unlink($oldPath);
        }
    }
    
    // Crear carpeta si no existe
    $uploadDir = __DIR__ . '/../uploads/retos';
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }
    
    // Guardar con nombre único basado en timestamp + torneo_id
    $ext = $mime === 'image/jpeg' ? 'jpg' : 'png';
    $filename = "{$torneo_id}_caratula_" . time() . ".{$ext}";
    $filepath = "uploads/retos/{$filename}";
    $fullpath = __DIR__ . '/../' . $filepath;
    
    if (!move_uploaded_file($file['tmp_name'], $fullpath)) {
        fail('Error al guardar archivo');
        exit;
    }
    
    // Actualizar BD
    $stmt = $db->prepare('UPDATE torneos SET caratula_reto = ? WHERE id = ?');
    $stmt->execute([$filepath, $torneo_id]);
    
    success(['caratula_reto' => $filepath]);
    
} catch (Exception $e) {
    fail($e->getMessage());
}
