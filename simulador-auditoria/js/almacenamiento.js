/**
 * almacenamiento.js — PERSISTENCIA (localStorage con validación y avisos).
 *
 * Guarda tres cosas:
 *   1. historial   auditorías finalizadas (máx. 50)
 *   2. borrador    auditoría en curso, para no perder el progreso al recargar
 *   3. exportar/importar JSON, para pasar el historial entre equipos o navegadores
 *
 * Todas las funciones devuelven { ok, ... } o lanzan nada: los errores se
 * reportan por el callback `avisar` para que la interfaz los muestre al usuario
 * (antes se ignoraban en silencio).
 *
 * Nota de diseño: la interfaz solo usa esta API. Si más adelante se cambia a una BD
 * real (IndexedDB, SQLite, Firebase), solo hay que reescribir este archivo.
 */
(function (global) {
  "use strict";

  const CLAVE_HIST = "simaud.historial.v3";
  // v4: los escenarios cambiaron (10 controles con evidencias); un borrador v3 ya no encajaría.
  const CLAVE_BORRADOR = "simaud.borrador.v4";
  const MAX_HIST = 50;

  let avisar = () => {};
  /** Registra la función que mostrará los avisos (tipo: "error" | "ok" | "info"). */
  function alAvisar(fn) { avisar = typeof fn === "function" ? fn : () => {}; }

  /** ¿Es una entrada de historial con la forma esperada? */
  function esRegistroValido(h) {
    return h && typeof h === "object"
      && typeof h.fecha === "string"
      && typeof h.escenario === "string"
      && Number.isFinite(h.precision)
      && Number.isFinite(h.residual);
  }

  function leer(clave) {
    try {
      const txt = localStorage.getItem(clave);
      return txt === null ? null : JSON.parse(txt);
    } catch (e) {
      avisar("error", "No se pudieron leer los datos guardados (¿datos corruptos o almacenamiento bloqueado?).");
      return null;
    }
  }

  function escribir(clave, valor) {
    try {
      localStorage.setItem(clave, JSON.stringify(valor));
      return true;
    } catch (e) {
      avisar("error", "No se pudo guardar: el almacenamiento está lleno o bloqueado por el navegador.");
      return false;
    }
  }

  /** Devuelve el historial, descartando registros dañados. */
  function cargarHistorial() {
    const datos = leer(CLAVE_HIST);
    if (datos === null) return [];
    if (!Array.isArray(datos)) {
      avisar("error", "El historial guardado estaba dañado y se reinició.");
      try { localStorage.removeItem(CLAVE_HIST); } catch (e) { /* sin acción */ }
      return [];
    }
    const validos = datos.filter(esRegistroValido);
    if (validos.length !== datos.length) {
      avisar("info", `Se omitieron ${datos.length - validos.length} registro(s) dañado(s) del historial.`);
    }
    return validos;
  }

  /** Agrega una auditoría al inicio del historial. */
  function guardarAuditoria(registro) {
    if (!esRegistroValido(registro)) {
      avisar("error", "El registro de auditoría no es válido y no se guardó.");
      return false;
    }
    const lista = [registro, ...cargarHistorial()].slice(0, MAX_HIST);
    return escribir(CLAVE_HIST, lista);
  }

  function borrarHistorial() {
    try { localStorage.removeItem(CLAVE_HIST); return true; }
    catch (e) { avisar("error", "No se pudo borrar el historial."); return false; }
  }

  // ---- Borrador (auditoría en curso) ----

  /** Guarda el avance. `borrador` = {id, auditor, organizacion, respuestas, observaciones} */
  function guardarBorrador(borrador) { return escribir(CLAVE_BORRADOR, borrador); }

  function cargarBorrador() {
    const b = leer(CLAVE_BORRADOR);
    if (b === null) return null;
    const ok = b && typeof b === "object" && typeof b.id === "string"
      && b.respuestas && typeof b.respuestas === "object"
      && b.observaciones && typeof b.observaciones === "object";
    if (!ok) { borrarBorrador(); return null; }
    return b;
  }

  function borrarBorrador() {
    try { localStorage.removeItem(CLAVE_BORRADOR); } catch (e) { /* sin acción */ }
  }

  // ---- Exportar / importar ----

  /** Devuelve el historial como texto JSON, listo para descargar. */
  function exportarJSON() {
    return JSON.stringify({ version: 3, exportado: new Date().toISOString(), historial: cargarHistorial() }, null, 2);
  }

  /**
   * Fusiona un JSON exportado con el historial actual.
   * @returns {{ok:boolean, agregados:number, mensaje:string}}
   */
  function importarJSON(texto) {
    let datos;
    try { datos = JSON.parse(texto); }
    catch (e) { return { ok: false, agregados: 0, mensaje: "El archivo no es un JSON válido." }; }

    if (!datos || !Array.isArray(datos.historial)) {
      return { ok: false, agregados: 0, mensaje: "El archivo no tiene el formato del simulador." };
    }
    const nuevos = datos.historial.filter(esRegistroValido);
    const actual = cargarHistorial();
    const firma = (h) => [h.fecha, h.auditor, h.escenario, h.precision, h.residual, h.hora].join("|");
    const existentes = new Set(actual.map(firma));
    const agregar = nuevos.filter((h) => !existentes.has(firma(h)));

    const fusion = [...agregar, ...actual].slice(0, MAX_HIST);
    if (!escribir(CLAVE_HIST, fusion)) return { ok: false, agregados: 0, mensaje: "No se pudo guardar." };
    return { ok: true, agregados: agregar.length, mensaje: `Se importaron ${agregar.length} auditoría(s).` };
  }

  const Almacen = {
    alAvisar, cargarHistorial, guardarAuditoria, borrarHistorial,
    guardarBorrador, cargarBorrador, borrarBorrador, exportarJSON, importarJSON, esRegistroValido
  };

  global.Almacen = Almacen;
  if (typeof module !== "undefined" && module.exports) module.exports = Almacen;
})(typeof window !== "undefined" ? window : globalThis);
