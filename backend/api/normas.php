<?php
// Endpoint para consultar y guardar las normas de Retos y Torneito Retroal.
require __DIR__ . '/helpers.php';

const DEFAULT_NORMAS_RETOS = "<h3>📜 Normas de los retos</h3>\n<ul>\n" .
    "  <li>Esta competición temporal, tendrá un mes de duración como Reto y luego pasará al grupo de Torneos y todas las puntuaciones de los participantes, absorbidas en la clasificación general.</li>\n" .
    "  <li>Podrá participar cualquiera que sea miembro de los Retorneítos (tener ficha, en la clasificación general de los Torneos).</li>\n" .
    "  <li>Solo se participará teniendo y jugando a una arcade Retroal (o en conexión a una TV, desde ella).</li>\n" .
    "  <li>No se permite farmear (perder tiempo haciendo puntos, sin avanzar en la historia).</li>\n" .
    "  <li>Después de jugar al juego del Reto, se tendrá que publicar una foto de la puntuación y escribir esta, con la fase (y personaje si requiere), en el chat de Retorneítos.</li>\n" .
    "  <li>También es obligatorio grabar la partida y colgarla, en dicho chat, sea por móvil o a través de la arcade y la grabación (debe verse en todo momento bien el juego y sobretodo la puntuación). No se aceptarán vídeos con la partida empezada o con cortes.</li>\n" .
    "  <li>El Reto de Retroal acaba el último día de mes a las 00.00 en punto y no se aceptará ninguna partida colgada más allá de esa hora, ni segundo.</li>\n" .
    "  <li>Si hay empate a puntos, ganará el que haya llegado más lejos y si aún persiste el empate, el que la haya publicado antes.</li>\n" .
    "  <li>El ganador recibirá un regalo de premio, por quedar campeón y su nombre quedará resaltado, cuando el juego del Reto finalizado, sea trasladado al grupo de Torneos de Retroal, de manera permanente.</li>\n" .
    "</ul>";

const DEFAULT_NORMAS_GENERAL = "<h3>📜 Normas de Torneito Retroal</h3>\n<ul>\n" .
    "  <li>Podrá participar cualquiera que sea miembro de los Retorneítos (tener ficha, en la clasificación general de los Torneos).</li>\n" .
    "  <li>Solo se participará teniendo y jugando a una arcade Retroal (o en conexión a una TV, desde ella).</li>\n" .
    "  <li>No se permite farmear (perder tiempo haciendo puntos, sin avanzar en la historia).</li>\n" .
    "  <li>Después de jugar, se tendrá que publicar una foto de la puntuación y escribir esta, con la fase (y personaje si requiere), en el chat de Retorneítos.</li>\n" .
    "  <li>Si dicha partida queda entre los cinco primeros de la tabla de ese juego, también será obligatorio colgar el video de la partida. Si queda por debajo del quinto en la tabla, no será obligatorio, aunque siempre recomendable.</li>\n" .
    "  <li>En los Torneos Retroal hay una clasificación general, donde se acumulan nuestros puntos automáticamente y aparte de ser una competición, és nuestra memoria de juego.</li>\n" .
    "</ul>";

try {
    $db = getDb();
    $db->exec('
        CREATE TABLE IF NOT EXISTS ajustes (
            clave TEXT PRIMARY KEY,
            valor TEXT
        );
    ');

    $method = $_SERVER['REQUEST_METHOD'];

    if ($method === 'GET') {
        if (isset($_GET['torneo_id'])) {
            $torneoId = (int) $_GET['torneo_id'];
            $stmtT = $db->prepare('SELECT id, normas FROM torneos WHERE id = :id');
            $stmtT->execute([':id' => $torneoId]);
            $rowT = $stmtT->fetch();
            ok([
                'torneo_id' => $torneoId,
                'normas' => $rowT ? ($rowT['normas'] ?? '') : ''
            ]);
        }

        $stmtRetos = $db->prepare("SELECT valor FROM ajustes WHERE clave = 'normas_torneo'");
        $stmtRetos->execute();
        $rowRetos = $stmtRetos->fetch();
        $normasRetos = $rowRetos ? $rowRetos['valor'] : null;

        if ($normasRetos === null || strpos($normasRetos, '1. Participación:') !== false || strpos($normasRetos, 'NORMAS DE LOS RETOS RETROAL') !== false) {
            $normasRetos = DEFAULT_NORMAS_RETOS;
            $stmtSave = $db->prepare("INSERT OR REPLACE INTO ajustes (clave, valor) VALUES ('normas_torneo', :v)");
            $stmtSave->execute([':v' => $normasRetos]);
        }

        $stmtGeneral = $db->prepare("SELECT valor FROM ajustes WHERE clave = 'normas_general'");
        $stmtGeneral->execute();
        $rowGeneral = $stmtGeneral->fetch();
        $normasGeneral = $rowGeneral ? $rowGeneral['valor'] : null;

        if ($normasGeneral === null) {
            $normasGeneral = DEFAULT_NORMAS_GENERAL;
            $stmtSaveG = $db->prepare("INSERT OR REPLACE INTO ajustes (clave, valor) VALUES ('normas_general', :v)");
            $stmtSaveG->execute([':v' => $normasGeneral]);
        }

        ok([
            'normas' => $normasRetos,
            'retos' => $normasRetos,
            'general' => $normasGeneral
        ]);
    } else if ($method === 'PUT' || $method === 'POST') {
        $in = bodyJson();
        $tipo = $in['tipo'] ?? 'retos';
        $normas = $in['normas'] ?? '';
        $torneoId = (int) ($in['torneo_id'] ?? 0);

        if ($torneoId > 0 || $tipo === 'supertorneo' || $tipo === 'supertorneos') {
            if (!$torneoId) fail(400, 'Falta el id del torneo');
            $stmt = $db->prepare('UPDATE torneos SET normas = :n WHERE id = :id');
            $stmt->execute([':n' => $normas, ':id' => $torneoId]);
            ok(['ok' => true, 'tipo' => 'supertorneos', 'torneo_id' => $torneoId, 'normas' => $normas]);
        } else {
            $clave = ($tipo === 'general' || $tipo === 'torneito') ? 'normas_general' : 'normas_torneo';

            $stmt = $db->prepare("INSERT OR REPLACE INTO ajustes (clave, valor) VALUES (:c, :v)");
            $stmt->execute([':c' => $clave, ':v' => $normas]);
            ok(['ok' => true, 'tipo' => $tipo, 'normas' => $normas]);
        }
    } else {
        fail(405, 'Método no permitido');
    }
} catch (Throwable $e) {
    fail(500, 'Error del servidor: ' . $e->getMessage());
}
