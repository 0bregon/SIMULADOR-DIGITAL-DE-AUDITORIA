/**
 * motor.js — MOTOR DE EVALUACIÓN (lógica de negocio pura).
 *
 * No toca el DOM ni localStorage: recibe datos y devuelve resultados.
 * Por eso se puede probar desde Node (ver tests/motor.test.js) y desde el navegador.
 *
 * Respuestas válidas del auditor por control:
 *   "C"  = Cumple      "NC" = No cumple      "NA" = No aplica
 *
 * Regla para "NA": en este simulador todos los controles son aplicables,
 * así que marcar "NA" equivale a NO haber evaluado el control:
 *   - si había hallazgo real  -> hallazgo NO detectado (riesgo residual).
 *   - si no había hallazgo    -> no suma como acierto.
 */
(function (global) {
  "use strict";

  const RESPUESTAS = Object.freeze({ CUMPLE: "C", NO_CUMPLE: "NC", NO_APLICA: "NA" });
  const VALIDAS = Object.values(RESPUESTAS);

  /** Umbrales de la matriz de riesgo (probabilidad × impacto, máximo 25). */
  const UMBRALES = Object.freeze({ CRITICO: 20, ALTO: 12, MEDIO: 6 });

  /**
   * Convierte una puntuación P×I en un nivel de riesgo.
   * @param {number} puntaje Producto probabilidad × impacto (0-25).
   * @returns {{nombre:string, clase:string}}
   */
  function nivelRiesgo(puntaje) {
    if (puntaje >= UMBRALES.CRITICO) return { nombre: "Crítico", clase: "text-red-600" };
    if (puntaje >= UMBRALES.ALTO)    return { nombre: "Alto",    clase: "text-orange-500" };
    if (puntaje >= UMBRALES.MEDIO)   return { nombre: "Medio",   clase: "text-amber-500" };
    return { nombre: "Bajo", clase: "text-emerald-500" };
  }

  /** Puntaje de riesgo de un control: probabilidad × impacto. */
  function puntajeControl(c) {
    return c.hallazgo ? c.prob * c.impacto : 0;
  }

  /**
   * Comprueba que el escenario tenga datos coherentes (útil al agregar escenarios nuevos).
   * @returns {string[]} lista de problemas; vacía si todo está bien.
   */
  function validarEscenario(esc) {
    const errores = [];
    if (!esc || !Array.isArray(esc.controles) || esc.controles.length === 0) {
      return ["El escenario no tiene controles."];
    }

    // Contexto de la situación auditada
    const ctx = esc.contexto;
    if (!ctx || !ctx.organizacion || !ctx.alcance || !ctx.criterio) {
      errores.push("Falta el contexto (organización, alcance o criterio de la norma).");
    } else if (!Array.isArray(ctx.situacion) || ctx.situacion.length === 0) {
      errores.push("El contexto necesita al menos un párrafo en 'situacion'.");
    }

    // Controles y sus evidencias
    esc.controles.forEach((c, i) => {
      const n = `Control ${i + 1} (${c.control || "sin nombre"})`;
      if (!c.control) errores.push(`${n}: falta el nombre.`);
      if (!Array.isArray(c.evidencias) || c.evidencias.length < 2) {
        errores.push(`${n}: debe tener al menos 2 evidencias.`);
      } else if (c.evidencias.some((e) => !e || !e.tipo || !e.fuente || !e.texto)) {
        errores.push(`${n}: cada evidencia necesita tipo, fuente y texto.`);
      }
      if (!c.ref || !c.pista) errores.push(`${n}: falta la referencia de norma o la pista.`);
      if (typeof c.hallazgo !== "boolean") errores.push(`${n}: 'hallazgo' debe ser true/false.`);
      if (c.hallazgo) {
        const ok = (v) => Number.isInteger(v) && v >= 1 && v <= 5;
        if (!ok(c.prob) || !ok(c.impacto)) errores.push(`${n}: prob e impacto deben ser enteros 1-5.`);
        if (!c.correccion) errores.push(`${n}: falta la acción correctiva.`);
        if (!c.justificacionRiesgo) errores.push(`${n}: falta la justificación del riesgo.`);
      }
    });
    return errores;
  }

  /**
   * Evalúa las respuestas del auditor contra los hallazgos reales.
   *
   * @param {object} esc        Escenario (ver escenarios.js).
   * @param {object} respuestas Mapa {indiceControl: "C"|"NC"|"NA"}.
   * @returns {object} resultado con:
   *   detectados[]  índices de hallazgos reales marcados "No cumple"
   *   omitidos[]    índices de hallazgos reales NO detectados
   *   falsosPos[]   índices de controles que cumplían pero se marcaron "No cumple"
   *   aciertos      cantidad de juicios correctos
   *   precision     % de juicios correctos
   *   riesgoTotal   suma de P×I de todos los hallazgos reales
   *   riesgoResidual suma de P×I de los hallazgos no detectados
   *   cobertura     % del riesgo total que sí se detectó
   *   dictamen      FAVORABLE | FAVORABLE CON SALVEDADES | DESFAVORABLE
   * @throws {Error} si falta alguna respuesta o hay un valor inválido.
   */
  function evaluar(esc, respuestas) {
    if (!esc || !Array.isArray(esc.controles)) throw new Error("Escenario inválido.");
    if (!respuestas || typeof respuestas !== "object") throw new Error("Respuestas inválidas.");

    esc.controles.forEach((c, k) => {
      if (!(k in respuestas)) throw new Error(`Falta responder el control ${k + 1}: ${c.control}.`);
      if (!VALIDAS.includes(respuestas[k])) {
        throw new Error(`Respuesta inválida en el control ${k + 1}: "${respuestas[k]}".`);
      }
    });

    const r = { detectados: [], omitidos: [], falsosPos: [], aciertos: 0 };

    esc.controles.forEach((c, k) => {
      const dijoNC = respuestas[k] === RESPUESTAS.NO_CUMPLE;
      const dijoC = respuestas[k] === RESPUESTAS.CUMPLE;

      if (c.hallazgo && dijoNC) { r.detectados.push(k); r.aciertos++; }
      else if (c.hallazgo)      { r.omitidos.push(k); }              // dijo C o NA
      else if (dijoNC)          { r.falsosPos.push(k); }
      else if (dijoC)           { r.aciertos++; }                    // NA no suma
    });

    const suma = (indices) => indices.reduce((t, k) => t + puntajeControl(esc.controles[k]), 0);
    const reales = esc.controles.map((_, k) => k).filter((k) => esc.controles[k].hallazgo);

    r.precision = Math.round((r.aciertos / esc.controles.length) * 100);
    r.riesgoTotal = suma(reales);
    r.riesgoResidual = suma(r.omitidos);
    r.cobertura = r.riesgoTotal
      ? Math.round(((r.riesgoTotal - r.riesgoResidual) / r.riesgoTotal) * 100)
      : 100;
    r.totalHallazgos = reales.length;
    r.altosDetectados = r.detectados.filter((k) => puntajeControl(esc.controles[k]) >= UMBRALES.ALTO).length;
    r.dictamen = dictamen(esc, r);
    return r;
  }

  /**
   * Dictamen sugerido:
   *  FAVORABLE                 cobertura ≥ 85 % y no se omitió ningún riesgo alto/crítico
   *  FAVORABLE CON SALVEDADES  cobertura ≥ 60 %
   *  DESFAVORABLE              en otro caso
   */
  function dictamen(esc, r) {
    const omitioAlto = r.omitidos.some((k) => puntajeControl(esc.controles[k]) >= UMBRALES.ALTO);
    if (r.cobertura >= 85 && !omitioAlto) return "FAVORABLE";
    if (r.cobertura >= 60) return "FAVORABLE CON SALVEDADES";
    return "DESFAVORABLE";
  }

  /**
   * Convierte una lista de índices en filas del informe, ordenadas de mayor a menor riesgo.
   * @returns {{k:number, control:object, puntaje:number, nivel:object}[]}
   */
  function filasInforme(esc, indices) {
    return indices
      .map((k) => {
        const control = esc.controles[k];
        const puntaje = puntajeControl(control);
        return { k, control, puntaje, nivel: nivelRiesgo(puntaje) };
      })
      .sort((a, b) => b.puntaje - a.puntaje);
  }

  const Motor = { RESPUESTAS, UMBRALES, nivelRiesgo, puntajeControl, validarEscenario, evaluar, dictamen, filasInforme };

  global.Motor = Motor;
  if (typeof module !== "undefined" && module.exports) module.exports = Motor;
})(typeof window !== "undefined" ? window : globalThis);
