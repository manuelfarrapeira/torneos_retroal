<?php
header('Content-Type: application/json');
require_once 'helpers.php';
require_once 'db.php';

// Solo admin
if (!isAdmin()) {
    fail('Acceso denegado');
    exit;
}

$torneo_id = $_POST['torneo_id'] ?? null;
if (!$torneo_id) {
    fail('torneo_id requerido');
    exit;
}

try {
    $db = getDb();
    
    $stmt = $db->prepare('SELECT caratula_reto FROM torneos WHERE id = ?');
    $stmt->execute([$torneo_id]);
    $torneo = $stmt->fetch();
    
    if (!$torneo) {
        fail('Reto no encontrado');
        exit;
    }
    
    // Eliminar archivo si existe
    if ($torneo['caratula_reto']) {
        $filepath = __DIR__ . '/../' . $torneo['caratula_reto'];
        if (file_exists($filepath)) {
            unlink($filepath);
        }
    }
    
    // Limpiar BD
    $stmt = $db->prepare('UPDATE torneos SET caratula_reto = NULL WHERE id = ?');
    $stmt->execute([$torneo_id]);
    
    success(['message' => 'Carátula eliminada']);
    
} catch (Exception $e) {
    fail($e->getMessage());
}
