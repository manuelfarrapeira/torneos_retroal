import { ParametroForm } from '../forms/ParametroForm'
import { TIPO_LABEL } from '../../utils/constants'

export function ParametrosTab({
  esAdmin,
  formParametro,
  parametroFormKey,
  guardarParametro,
  setFormParametro,
  avisarError,
  parametros,
  eliminarParametro,
}) {
  return (
    <section className="screen">
      <h2 className="panel-title">▸ PARÁMETROS DE PUNTUACIÓN</h2>
      <p className="form-ayuda">
        Crea aquí los campos que luego podrás asignar a cada juego (Puntos, Tiempo, Fase, Personaje...).
      </p>

      {esAdmin && (
        <ParametroForm
          key={formParametro && typeof formParametro === 'object' ? `edit-${formParametro.id}` : `nuevo-${parametroFormKey}`}
          parametro={formParametro}
          onGuardar={guardarParametro}
          onCancelar={() => setFormParametro(null)}
          onError={avisarError}
        />
      )}

      <ul className="lista-juegos lista-parametros">
        {parametros.length === 0 && <li className="vacio">No hay parámetros todavía</li>}
        {[...parametros]
          .sort((a, b) => (b.en_uso || 0) - (a.en_uso || 0) || (b.total_valores || 0) - (a.total_valores || 0) || a.nombre.localeCompare(b.nombre))
          .map((p) => (
            <li key={p.id} className={formParametro && formParametro !== 'nuevo' && formParametro.id === p.id ? 'activo' : ''}>
              <div className="jinfo">
                <span className="jnombre">{p.nombre} <span className="chip-tipo">{TIPO_LABEL[p.tipo]}</span></span>
                <span className="jmeta">Usado en {p.en_uso} juego(s)</span>
              </div>
              {esAdmin && (
                <>
                  <button className="borrar editar" onClick={() => setFormParametro(p)} data-tooltip="Editar parámetro" data-tooltip-pos="left">✎</button>
                  {p.total_valores > 0 ? (
                    <button className="borrar bloqueado" disabled data-tooltip="No se puede eliminar: ya tiene datos guardados" data-tooltip-pos="left">🔒</button>
                  ) : (
                    <button className="borrar" onClick={() => eliminarParametro(p)} data-tooltip="Eliminar parámetro" data-tooltip-pos="left">✕</button>
                  )}
                </>
              )}
            </li>
          ))}
      </ul>
    </section>
  )
}
