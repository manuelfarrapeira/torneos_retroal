<?php
// Endpoint de autenticación para la administración de la web.
require __DIR__ . '/helpers.php';

try {
    $db = getDb();

    // Asegurar que existe la tabla admin_usuarios
    $db->exec('
        CREATE TABLE IF NOT EXISTS admin_usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            creado_en DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ');

    // Inicializar el usuario admin con contraseña "retroal" si no existe
    $checkAdmin = $db->query("SELECT id, password_hash FROM admin_usuarios WHERE usuario = 'admin'")->fetch();
    if (!$checkAdmin) {
        $hash = password_hash('retroal', PASSWORD_DEFAULT);
        $stmt = $db->prepare("INSERT INTO admin_usuarios (usuario, password_hash) VALUES ('admin', :h)");
        $stmt->execute([':h' => $hash]);
        $hashActual = $hash;
    } else {
        $hashActual = $checkAdmin['password_hash'];
    }

    $method = $_SERVER['REQUEST_METHOD'];

    if ($method === 'POST') {
        $in = bodyJson();
        $usuarioIn = trim($in['usuario'] ?? '');
        $passwordIn = trim($in['password'] ?? '');

        if (!$usuarioIn || !$passwordIn) {
            fail(400, 'Introduce usuario y contraseña');
        }

        if (strtolower($usuarioIn) === 'admin' && password_verify($passwordIn, $hashActual)) {
            $expiraEn = (time() + 3600) * 1000; // 1 hora en milisegundos (timestamp JS)
            ok([
                'ok' => true,
                'usuario' => 'admin',
                'expira_en' => $expiraEn,
                'token' => md5($hashActual . $expiraEn)
            ]);
        } else {
            fail(401, 'Usuario o contraseña incorrectos');
        }
    } else {
        fail(405, 'Método no permitido');
    }

} catch (Throwable $e) {
    fail(500, 'Error del servidor: ' . $e->getMessage());
}
