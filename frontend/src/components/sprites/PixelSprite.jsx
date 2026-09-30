// ---- Sprites pixel-art ORIGINALES (dibujados aquí, sin copyright) ----
export const PALETTE = {
  c: '#00f0ff', b: '#0077ff', y: '#ffe600', r: '#ff2e88',
  g: '#39ff14', p: '#b026ff', w: '#ffffff', o: '#ff7b00',
  k: '#141414', s: '#ffcc99', h: '#7a3d00', W: '#f4f4ff',
}

export const SPRITES = {
  nave: [
    '.....y.....', '....yyy....', '....ccc....', '..c.ccc.c..',
    '.ccccccccc.', 'ccccccccccc', 'c.c.ccc.c.c', '....r.r....',
  ],
  alien: [
    '..g.....g..', '...g...g...', '..ggggggg..', '.gg.ggg.gg.',
    'ggggggggggg', 'g.ggggggg.g', 'g.g.....g.g', '...gg.gg...',
  ],
  bola: [
    '..rrrr..', '.rwwrrr.', 'rwwrrrrr', 'rrrrrrrr',
    'rrrrrrrr', 'rrrrrrrr', '.rrrrrr.', '..rrrr..',
  ],
  tanque: [
    '...........', '....ooo....', '...ooooo...', 'gggggggg...',
    'gggggggggoo', 'ggggggggg..', 'gggggggg...', 'g.g.g.g.g..',
  ],
  luchador: [
    '....kkkk....', '...khhhhk...', '..khhhhhhk..', '..hssssssh..',
    '..sskssks...', '..ssssssss..', '...ssssss...', '.WWWWWWWWWW.',
    'sWWWWWWWWWWs', '.WWWWWWWWWW.', '..rrrrrrrr..', '..WWW..WWW..',
    '..WWW..WWW..', '..kkk..kkk..',
  ],
  fantasma: [
    '...pppppp...', '..pppppppp..', '.pppppppppp.', '.pwwppppwwp.',
    '.pkwppppkwp.', '.pppppppppp.', '.pppppppppp.', '.pppppppppp.',
    '.pppppppppp.', '.pppppppppp.', 'p.pp.pp.pp.p',
  ],
  moneda: [
    '..oooo..', '.oyyyyo.', 'oyywyyyo', 'oywyywyo',
    'oywyywyo', 'oyywyyyo', '.oyyyyo.', '..oooo..',
  ],
  calavera: [
    '..WWWWWW..', '.WWWWWWWW.', 'WWWWWWWWWW', 'WWkkWWkkWW',
    'WWkkWWkkWW', 'WWWWWWWWWW', 'WWWkWWkWWW', '.WWWWWWWW.', '..W.WW.W..',
  ],
}

export const SPRITE_NAMES = ['nave', 'luchador', 'alien', 'fantasma', 'bola', 'tanque', 'moneda', 'calavera']

export function PixelSprite({ name, size = 4 }) {
  const rows = SPRITES[name]
  const w = rows[0].length
  const h = rows.length
  const rects = []
  rows.forEach((row, y) => {
    ;[...row].forEach((ch, x) => {
      const fill = PALETTE[ch]
      if (fill) rects.push(<rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={fill} />)
    })
  })
  return (
    <svg className="sprite" width={w * size} height={h * size}
      viewBox={`0 0 ${w} ${h}`} shapeRendering="crispEdges" aria-hidden="true">
      {rects}
    </svg>
  )
}

// Elige un sprite estable a partir del id del juego.
export function spriteForGame(id) {
  return SPRITE_NAMES[id % SPRITE_NAMES.length]
}
