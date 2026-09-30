import sqlite3

conn = sqlite3.connect(r"C:\Users\mfarr\Dropbox\php\retroal\backend\data\tareas.db")
c = conn.cursor()

PUNTOS_POS = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1]

# Get Súper Torneo SEGA games
torneo_id = 6
juegos_torneo = c.execute("""
    SELECT j.id, j.nombre 
    FROM torneo_juegos tj 
    JOIN juegos j ON j.id = tj.juego_id 
    WHERE tj.torneo_id = ? 
    ORDER BY tj.orden
""", (torneo_id,)).fetchall()

print("=== DEGLOSE DE PUNTOS PARA JAVI OXYGEN EN SUPERTORNEO SEGA ===")
total_javi = 0

for j_id, j_nombre in juegos_torneo:
    # Get scores for this game in torneo 6
    scores = c.execute("""
        SELECT p.id, u.nombre, p.usuario_id, pv1.valor_num, pv1.valor_texto
        FROM puntuaciones p
        JOIN usuarios u ON u.id = p.usuario_id
        LEFT JOIN puntuacion_valores pv1 ON pv1.puntuacion_id = p.id AND pv1.parametro_id = 1
        WHERE p.torneo_id = ? AND p.juego_id = ?
        ORDER BY pv1.valor_num DESC
    """, (torneo_id, j_id)).fetchall()
    
    print(f"\nJuego: {j_nombre} (Total jugadores: {len(scores)})")
    javi_pos = None
    javi_pts = 0
    for idx, s in enumerate(scores):
        pos = idx + 1
        pts = PUNTOS_POS[idx] if idx < len(PUNTOS_POS) else 0
        is_javi = "Javi Oxygen" in s[1]
        prefix = "-> " if is_javi else "   "
        print(f"{prefix}Pos {pos}: {s[1]} - {s[3]} pts ({s[4]}) -> {pts} PTS")
        if is_javi:
            javi_pos = pos
            javi_pts = pts
            
    total_javi += javi_pts
    print(f"   => Javi Oxygen en {j_nombre}: Posición {javi_pos}ª = {javi_pts} PTS")

print(f"\n==========================================")
print(f"SUMA TOTAL DE JAVI OXYGEN: {total_javi} PTS")
print(f"==========================================")
