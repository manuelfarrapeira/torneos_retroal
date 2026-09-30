<?php
// Utilidades comunes a todos los endpoints del API.

require_once __DIR__ . '/db.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-cache, no-store, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');
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

// NOTA: El proxy nginx del NAS (Synology Web Station) intercepta CUALQUIER
// respuesta con código >=400 y la sustituye por su propia página de error
// genérica en HTML, ocultando nuestro JSON. Por eso devolvemos siempre 200
// y marcamos el fallo dentro del cuerpo (con el código real en "status")
// para que el frontend pueda leer el mensaje de error.
function fail(int $code, string $msg): void {
    http_response_code(200);
    echo json_encode(['error' => $msg, 'status' => $code], JSON_UNESCAPED_UNICODE);
    exit;
}

function ok($data, int $code = 200): void {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

// Carpeta pública (fuera de data/) donde se guardan logos y capturas.
function uploadsDir(): string {
    $dir = __DIR__ . '/../uploads/juegos';
    if (!is_dir($dir)) {
        mkdir($dir, 0775, true);
    }
    return $dir;
}

function sanitizeNombreArchivo(string $nombre): string {
    $unaccented = strtr(
        mb_convert_encoding($nombre, 'UTF-8', 'auto'),
        [
            'á'=>'a', 'é'=>'e', 'í'=>'i', 'ó'=>'o', 'ú'=>'u',
            'Á'=>'A', 'É'=>'E', 'Í'=>'I', 'Ó'=>'O', 'Ú'=>'U',
            'à'=>'a', 'è'=>'e', 'ì'=>'i', 'ò'=>'o', 'ù'=>'u',
            'À'=>'A', 'È'=>'E', 'Ì'=>'I', 'Ò'=>'O', 'Ù'=>'U',
            'ä'=>'a', 'ë'=>'e', 'ï'=>'i', 'ö'=>'o', 'ü'=>'u',
            'Ä'=>'A', 'Ë'=>'E', 'Ï'=>'I', 'Ö'=>'O', 'Ü'=>'U',
            'â'=>'a', 'ê'=>'e', 'î'=>'i', 'ô'=>'o', 'û'=>'u',
            'Â'=>'A', 'Ê'=>'E', 'Î'=>'I', 'Ô'=>'O', 'Û'=>'U',
            'ñ'=>'n', 'Ñ'=>'N', 'ç'=>'c', 'Ç'=>'C'
        ]
    );
    $clean = preg_replace('/[^a-zA-Z0-9\s_]/', '', $unaccented);
    $clean = preg_replace('/\s+/', '_', trim($clean));
    $clean = preg_replace('/_+/', '_', $clean);
    return $clean;
}

/**
 * Decodifica una imagen en Data URL (data:image/png;base64,....) y la guarda.
 * Devuelve la ruta relativa (para servir desde el frontend) o null si $dataUrl es null/vacío.
 * Lanza excepción si el formato no es válido o supera el tamaño máximo.
 */
function guardarImagen(?string $dataUrl, int $juegoId, string $sufijo, string $juegoNombre = ''): ?string {
    if ($dataUrl === null || trim($dataUrl) === '') {
        return null;
    }
    if (!preg_match('/^data:(image\/(png|jpe?g|gif|webp)|video\/mp4);base64,(.+)$/i', trim($dataUrl), $m)) {
        fail(400, 'Formato no válido (usa PNG, JPG, GIF, WEBP o MP4)');
    }
    $mime = strtolower($m[1]);
    $isMp4 = ($mime === 'video/mp4');
    $ext = $isMp4 ? 'mp4' : strtolower($m[2] === 'jpeg' ? 'jpg' : $m[2]);
    $bin = base64_decode($m[3], true);
    if ($bin === false) {
        fail(400, 'No se pudo decodificar el archivo');
    }
    $maxBytes = 1 * 1024 * 1024; // 1 MB máximo para cualquier archivo
    if (strlen($bin) > $maxBytes) {
        fail(400, 'El archivo supera el tamaño máximo permitido (1MB)');
    }
    $sNombre = $juegoNombre !== '' ? sanitizeNombreArchivo($juegoNombre) : '';
    $prefix = $sNombre !== '' ? $juegoId . '_' . $sNombre : (string) $juegoId;
    $nombre = $prefix . '_' . $sufijo . '_' . time() . '.' . $ext;
    $ruta = uploadsDir() . '/' . $nombre;
    file_put_contents($ruta, $bin);
    return 'uploads/juegos/' . $nombre;
}

// Elimina un fichero de uploads dada su ruta relativa guardada en BD.
function borrarImagen(?string $rutaRelativa): void {
    if (!$rutaRelativa) return;
    $ruta = __DIR__ . '/../' . $rutaRelativa;
    if (is_file($ruta)) {
        @unlink($ruta);
    }
}

// ---- Ranking: compartido entre puntuaciones.php y clasificacion.php ----

function parametrosDelJuego(PDO $db, int $juegoId): array {
    $stmt = $db->prepare('
        SELECT jp.parametro_id, pa.nombre, pa.tipo, jp.es_ranking, jp.orden_ranking, jp.direccion, jp.orden
        FROM juego_parametros jp
        JOIN parametros pa ON pa.id = jp.parametro_id
        WHERE jp.juego_id = :j
        ORDER BY jp.orden ASC, jp.id ASC
    ');
    $stmt->execute([':j' => $juegoId]);
    return $stmt->fetchAll();
}

// Ordena las puntuaciones según los parámetros marcados como "ranking" del juego (en orden de prioridad).
function ordenarPorRanking(array $filas, array $parametrosJuego): array {
    $ranking = array_values(array_filter($parametrosJuego, fn($p) => $p['es_ranking']));
    usort($ranking, fn($a, $b) => ($a['orden_ranking'] ?? 0) <=> ($b['orden_ranking'] ?? 0));

    usort($filas, function ($a, $b) use ($ranking) {
        foreach ($ranking as $param) {
            $pid = $param['parametro_id'];
            $va = $a['valores'][$pid] ?? null;
            $vb = $b['valores'][$pid] ?? null;
            $cmp = 0;
            if ($param['tipo'] === 'texto') {
                $cmp = strcasecmp((string) ($va['valor_texto'] ?? ''), (string) ($vb['valor_texto'] ?? ''));
            } else {
                $na = $va['valor_num'] ?? null;
                $nb = $vb['valor_num'] ?? null;
                $cmp = ($na ?? 0) <=> ($nb ?? 0);
            }
            if ($param['direccion'] === 'asc') $cmp = -$cmp;
            if ($cmp !== 0) return -$cmp; // descendente = mejor primero
        }
        // Empate total: más antigua primero (llegó antes).
        return strcmp($a['creado_en'], $b['creado_en']);
    });
    return $filas;
}
