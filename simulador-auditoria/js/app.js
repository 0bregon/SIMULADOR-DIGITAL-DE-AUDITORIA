/**
 * app.js — INTERFAZ (vistas y eventos).
 *
 * Depende de: ESCENARIOS (escenarios.js), Motor (motor.js), Almacen (almacenamiento.js).
 * No contiene reglas de negocio: solo dibuja y reacciona a clics.
 *
 * Los botones usan  data-accion="nombre"  y un único listener (delegación de eventos),
 * en vez de onclick="..." dentro del HTML.
 */
(function () {
  "use strict";

  const { ESCENARIOS, Motor, Almacen } = window;
  const $ = (id) => document.getElementById(id);

  // ---------- Estado ----------
  const estado = {
    vista: "inicio",   // "inicio" | "auditoria" | "informe"
    actual: null       // {id, auditor, organizacion, respuestas, observaciones, resultado?, fecha?}
  };

  const rol = () => $("rol").value;
  const escenarioActual = () => ESCENARIOS.find((e) => e.id === estado.actual.id);

  /** Escapa texto para insertarlo de forma segura en HTML. */
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (m) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));

  // ---------- Avisos visibles (reemplazan a los errores silenciosos) ----------
  function mostrarAviso(tipo, texto) {
    const colores = { error: "bg-red-600", ok: "bg-emerald-600", info: "bg-slate-700" };
    const div = document.createElement("div");
    div.setAttribute("role", "alert");
    div.className = `${colores[tipo] || colores.info} text-white text-sm rounded-lg px-4 py-3 shadow-lg`;
    div.textContent = texto;
    $("avisos").appendChild(div);
    setTimeout(() => div.remove(), 6000);
  }

  // ---------- Vista: inicio ----------
  function vistaInicio() {
    const esAuditor = rol() === "Auditor";
    const borrador = Almacen.cargarBorrador();

    const tarjetas = ESCENARIOS.map((s) => {
      const reales = s.controles.filter((c) => c.hallazgo).length;
      const accion = esAuditor
        ? `<button class="btn-primario" data-accion="iniciar" data-id="${s.id}">Iniciar auditoría</button>`
        : `<p class="text-xs">Hallazgos reales: <b>${reales}</b> de ${s.controles.length}</p>`;
      return `<div class="card p-4 flex flex-col gap-2">
        <b>${esc(s.nombre)}</b><span class="text-xs mut">${esc(s.norma)}</span>
        <p class="text-xs font-semibold">${esc(s.contexto.organizacion)}</p>
        <p class="text-sm flex-1">${esc(s.descripcion)}</p>
        <p class="text-xs mut">${s.controles.length} controles</p>${accion}</div>`;
    }).join("");

    const aviso = esAuditor && borrador && ESCENARIOS.some((e) => e.id === borrador.id)
      ? `<div class="card p-4 flex flex-wrap items-center justify-between gap-2 border-indigo-500">
           <p class="text-sm">Tiene una auditoría sin terminar: <b>${esc(ESCENARIOS.find((e) => e.id === borrador.id).nombre)}</b>.</p>
           <span class="flex gap-2">
             <button class="btn-primario" data-accion="reanudar">Continuar</button>
             <button class="btn-borde" data-accion="descartar">Descartar</button>
           </span></div>`
      : "";

    $("app").innerHTML = `${aviso}
      <section class="card p-5">
        <h2 class="font-bold mb-1">${esAuditor ? "Seleccione un escenario de auditoría" : "Panel del administrador"}</h2>
        <p class="text-sm mut mb-3">Revise la evidencia de cada control y decida si Cumple o No cumple. El simulador compara su juicio con los hallazgos reales, calcula el riesgo (probabilidad × impacto) y genera el informe.</p>
        <div class="grid md:grid-cols-3 gap-3">${tarjetas}</div>
      </section>
      ${esAuditor ? "" : htmlHistorial()}`;
  }

  function htmlHistorial() {
    const h = Almacen.cargarHistorial();
    const filas = h.map((x) => `<tr class="border-t fila">
        <td>${esc(x.fecha)}</td><td>${esc(x.auditor)}</td><td>${esc(x.escenario)}</td>
        <td>${x.precision}%</td><td>${x.residual}</td><td>${esc(x.dictamen || "—")}</td></tr>`).join("");
    return `<section class="card p-5">
      <div class="flex flex-wrap justify-between items-center gap-2 mb-2">
        <h3 class="font-bold">Historial de auditorías (${h.length})</h3>
        <div class="flex flex-wrap gap-2 text-sm">
          <button class="btn-borde" data-accion="exportar">Exportar JSON</button>
          <button class="btn-borde" data-accion="importar">Importar JSON</button>
          <input type="file" id="archivo" accept="application/json,.json" class="hide">
          ${h.length ? `<button class="btn-borde text-red-500" data-accion="borrar-hist">Borrar todo</button>` : ""}
        </div>
      </div>
      ${h.length
        ? `<div class="overflow-x-auto"><table class="w-full text-sm">
            <tr class="mut text-xs uppercase text-left"><th>Fecha</th><th>Auditor</th><th>Escenario</th><th>Precisión</th><th>Riesgo residual</th><th>Dictamen</th></tr>
            ${filas}</table></div>`
        : `<p class="text-sm mut">Aún no hay auditorías guardadas.</p>`}
      <p class="text-xs mut mt-3">El historial se guarda en este navegador. Use Exportar/Importar para pasarlo a otro equipo.</p>
    </section>`;
  }

  // ---------- Vista: auditoría en curso ----------
  function iniciar(id) {
    const esc0 = ESCENARIOS.find((e) => e.id === id);
    estado.actual = { id, auditor: "", organizacion: esc0.contexto.organizacion, respuestas: {}, observaciones: {} };
    estado.vista = "auditoria";
    Almacen.guardarBorrador(estado.actual);
    vistaAuditoria();
  }

  function reanudar() {
    const b = Almacen.cargarBorrador();
    if (!b || !ESCENARIOS.some((e) => e.id === b.id)) { Almacen.borrarBorrador(); return dibujar(); }
    estado.actual = b;
    estado.vista = "auditoria";
    vistaAuditoria();
  }

  /** Lista de evidencias de un control (etiqueta de tipo + fuente + texto). */
  function htmlEvidencias(c) {
    return c.evidencias.map((e) => `
      <div class="evidencia text-sm">
        <span class="tag" data-tipo="${esc(e.tipo)}">${esc(e.tipo)}</span>
        <span class="text-xs mut">${esc(e.fuente)}</span>
        <p>${esc(e.texto)}</p>
      </div>`).join("");
  }

  /** Panel con el contexto de la situación auditada. */
  function htmlContexto(ctx) {
    const parrafos = ctx.situacion.map((p) => `<p>${esc(p)}</p>`).join("");
    const antecedentes = ctx.antecedentes && ctx.antecedentes.length
      ? `<p class="font-semibold mt-3">Antecedentes</p><ul class="list-disc pl-5">${ctx.antecedentes.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : "";
    const personas = ctx.personas && ctx.personas.length
      ? `<p class="font-semibold mt-3">Personas con quienes se pudo hablar</p><ul class="list-disc pl-5">${ctx.personas.map((p) => `<li><b>${esc(p.cargo)}:</b> ${esc(p.detalle)}</li>`).join("")}</ul>` : "";
    return `<details open class="card p-4 contexto text-sm">
      <summary>Contexto de la auditoría: ${esc(ctx.organizacion)}</summary>
      <div class="mt-3">
        ${parrafos}${antecedentes}
        <p class="mt-3"><b>Alcance:</b> ${esc(ctx.alcance)}</p>
        <p><b>Fuera de alcance:</b> ${esc(ctx.fueraDeAlcance || "—")}</p>
        <p><b>Por qué esta norma:</b> ${esc(ctx.criterio)}</p>
        ${personas}
      </div></details>`;
  }

  function vistaAuditoria() {
    const s = escenarioActual(), a = estado.actual;
    const opciones = [["C", "Cumple"], ["NC", "No cumple"], ["NA", "N/A"]];

    const controles = s.controles.map((c, k) => `
      <div class="card p-4 space-y-3">
        <p class="font-semibold">${k + 1}. ${esc(c.control)}</p>
        <div class="space-y-2">${htmlEvidencias(c)}</div>
        <div class="grid md:grid-cols-12 gap-2 items-center">
          <div class="md:col-span-4 flex gap-3 text-xs font-semibold">
            ${opciones.map(([v, t]) => `<label><input type="radio" name="r${k}" data-k="${k}" value="${v}" ${a.respuestas[k] === v ? "checked" : ""}> ${t}</label>`).join("")}
          </div>
          <div class="md:col-span-8">
            <input type="text" data-obs="${k}" placeholder="Observación (opcional)..." value="${esc(a.observaciones[k] || "")}">
          </div>
        </div>
      </div>`).join("");

    $("app").innerHTML = `<section class="card p-5 space-y-4">
      <div class="flex flex-wrap justify-between gap-2">
        <h2 class="font-bold">${esc(s.nombre)} <span class="text-xs mut">· ${esc(s.norma)}</span></h2>
        <button class="text-sm mut" data-accion="volver">← Volver (el avance queda guardado)</button>
      </div>
      ${htmlContexto(s.contexto)}
      <div class="grid md:grid-cols-2 gap-3">
        <input type="text" data-campo="auditor" placeholder="Nombre del auditor" value="${esc(a.auditor)}">
        <input type="text" data-campo="organizacion" placeholder="Organización auditada" value="${esc(a.organizacion)}">
      </div>
      <p class="text-xs mut">Pondere todas las evidencias de cada control: pueden contradecirse o incluir atenuantes. Un detalle sospechoso no siempre es un hallazgo.</p>
      <p class="text-xs mut" id="progreso"></p>
      ${controles}
      <button class="btn-ok" data-accion="finalizar">Finalizar y generar informe</button>
    </section>`;
    actualizarProgreso();
  }

  function actualizarProgreso() {
    const el = $("progreso");
    if (!el) return;
    const total = escenarioActual().controles.length;
    el.textContent = `Progreso: ${Object.keys(estado.actual.respuestas).length} de ${total} controles respondidos.`;
  }

  function finalizar() {
    const s = escenarioActual(), a = estado.actual;
    let resultado;
    try {
      resultado = Motor.evaluar(s, a.respuestas);
    } catch (e) {
      mostrarAviso("error", e.message);
      return;
    }
    a.resultado = resultado;
    a.fecha = new Date().toLocaleDateString("es-PA");

    Almacen.guardarAuditoria({
      fecha: a.fecha,
      hora: new Date().toLocaleTimeString("es-PA"),
      auditor: a.auditor || "—",
      organizacion: a.organizacion || "—",
      escenario: s.nombre,
      precision: resultado.precision,
      residual: resultado.riesgoResidual,
      cobertura: resultado.cobertura,
      dictamen: resultado.dictamen
    });
    Almacen.borrarBorrador();
    estado.vista = "informe";
    dibujar();
    window.scrollTo(0, 0);
  }

  // ---------- Vista: informe ----------
  function vistaInforme() {
    const s = escenarioActual(), a = estado.actual, r = a.resultado;
    const D = Motor.filasInforme(s, r.detectados);
    const M = Motor.filasInforme(s, r.omitidos);

    const cabecera = `<thead><tr class="mut text-xs uppercase text-left"><th>#</th><th>Control / justificación del riesgo</th><th>P×I</th><th>Nivel</th><th class="pl-2">Observación</th></tr></thead>`;
    const filas = (L) => L.map((x, n) => `<tr class="border-t fila align-top">
        <td class="py-2 pr-2">${n + 1}</td>
        <td class="pr-2 py-2"><b>${esc(x.control.control)}</b><br><span class="mut">${esc(x.control.justificacionRiesgo)}</span></td>
        <td class="pr-2">${x.control.prob}×${x.control.impacto}=${x.puntaje}</td>
        <td class="font-bold ${x.nivel.clase}">${x.nivel.nombre}</td>
        <td class="pl-2">${esc(a.observaciones[x.k])}</td></tr>`).join("");

    const tarjetas = [
      ["Precisión del juicio", r.precision + "%"],
      ["Hallazgos detectados", `${r.detectados.length} / ${r.totalHallazgos}`],
      ["Cobertura de riesgo", r.cobertura + "%"],
      ["Riesgo residual", r.riesgoResidual]
    ].map(([t, v]) => `<div class="card p-3"><p class="text-xs mut">${t}</p><p class="text-2xl font-extrabold">${v}</p></div>`).join("");

    const etiqueta = { C: "Cumple", NC: "No cumple", NA: "N/A" };
    const retro = s.controles.map((c, k) => {
      const resp = a.respuestas[k];
      const acerto = (c.hallazgo && resp === "NC") || (!c.hallazgo && resp === "C");
      return `<li class="py-1"><b>${esc(c.control)}</b> — su respuesta: ${etiqueta[resp]} ·
        <b class="${acerto ? "text-emerald-600" : "text-red-600"}">${acerto ? "Correcto" : "Incorrecto"}</b>
        (real: ${c.hallazgo ? "No cumple" : "Cumple"}). <span class="mut">${esc(c.pista)} Ref.: ${esc(c.ref)}.</span></li>`;
    }).join("");

    $("app").innerHTML = `
      <div class="no-print flex gap-2">
        <button class="btn-primario" data-accion="imprimir">Imprimir / Guardar PDF</button>
        <button class="btn-borde" data-accion="repetir">Repetir escenario</button>
        <button class="btn-borde" data-accion="inicio">Inicio</button>
      </div>
      <section class="card p-5">
        <h2 class="text-xl font-bold border-b pb-2 mb-2 sep">INFORME DE AUDITORÍA: RIESGOS Y REQUERIMIENTOS</h2>
        <p class="text-sm"><b>Escenario:</b> ${esc(s.nombre)} · <b>Norma:</b> ${esc(s.norma)} · <b>Auditor:</b> ${esc(a.auditor) || "—"} · <b>Organización:</b> ${esc(a.organizacion) || "—"} · <b>Fecha:</b> ${esc(a.fecha)}</p>
      </section>
      <section class="grid grid-cols-2 md:grid-cols-4 gap-3">${tarjetas}</section>
      <section class="card p-5"><h3 class="font-bold mb-2">1. Matriz de riesgos encontrados</h3>
        <div class="overflow-x-auto"><table class="w-full text-sm">${cabecera}<tbody>${D.length ? filas(D) : `<tr><td colspan="5" class="py-2 mut">No se detectó ningún hallazgo.</td></tr>`}</tbody></table></div></section>
      <section class="card p-5"><h3 class="font-bold mb-2">2. Requerimientos y acciones correctivas</h3>
        <ol class="list-decimal pl-5 text-sm space-y-1">${D.map((x) => `<li><b class="${x.nivel.clase}">[${x.nivel.nombre}]</b> ${esc(x.control.correccion)} <span class="mut">(${esc(x.control.ref)})</span></li>`).join("") || `<li class="mut">Sin requerimientos.</li>`}</ol></section>
      <section class="card p-5"><h3 class="font-bold mb-2">3. Hallazgos no detectados (riesgo residual)</h3>
        ${M.length ? `<div class="overflow-x-auto"><table class="w-full text-sm">${cabecera}<tbody>${filas(M)}</tbody></table></div>` : `<p class="text-sm text-emerald-600">No se omitió ningún hallazgo.</p>`}
        ${r.falsosPos.length ? `<h3 class="font-bold mt-4 mb-1">Falsos positivos (controles que sí cumplían)</h3>
          <ul class="list-disc pl-5 text-sm">${r.falsosPos.map((k) => `<li><b>${esc(s.controles[k].control)}:</b> ${esc(s.controles[k].pista)}</li>`).join("")}</ul>` : ""}</section>
      <section class="card p-5"><h3 class="font-bold mb-1">4. Dictamen sugerido</h3>
        <p class="text-xl font-extrabold">${r.dictamen}</p>
        <p class="text-sm mut">${r.altosDetectados} hallazgo(s) alto/crítico detectado(s); cobertura de riesgo ${r.cobertura}%.</p>
        <div class="grid grid-cols-2 gap-8 pt-10">
          <div class="text-center"><div class="border-b h-8 sep-fuerte"></div><p class="text-xs font-bold uppercase mt-1">Firma del auditor</p></div>
          <div class="text-center"><div class="border-b h-8 sep-fuerte"></div><p class="text-xs font-bold uppercase mt-1">Recibido por (Responsable TI)</p></div>
        </div></section>
      <section class="card p-5"><h3 class="font-bold mb-2">5. Retroalimentación por control</h3>
        <ul class="text-sm divide-y fila-lista">${retro}</ul></section>`;
  }

  // ---------- Exportar / importar ----------
  function descargarJSON() {
    const blob = new Blob([Almacen.exportarJSON()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = `historial-auditorias-${new Date().toISOString().slice(0, 10)}.json`;
    enlace.click();
    URL.revokeObjectURL(url);
  }

  function leerArchivoImportado(archivo) {
    if (!archivo) return;
    const lector = new FileReader();
    lector.onload = () => {
      const res = Almacen.importarJSON(String(lector.result));
      mostrarAviso(res.ok ? "ok" : "error", res.mensaje);
      dibujar();
    };
    lector.onerror = () => mostrarAviso("error", "No se pudo leer el archivo.");
    lector.readAsText(archivo);
  }

  // ---------- Dibujo y eventos ----------
  function dibujar() {
    if (estado.vista === "informe") vistaInforme();
    else if (estado.vista === "auditoria") vistaAuditoria();
    else vistaInicio();
  }

  const acciones = {
    iniciar: (el) => iniciar(el.dataset.id),
    reanudar,
    descartar: () => { Almacen.borrarBorrador(); dibujar(); },
    volver: () => { estado.vista = "inicio"; dibujar(); },
    inicio: () => { estado.vista = "inicio"; dibujar(); },
    finalizar,
    repetir: () => iniciar(estado.actual.id),
    imprimir: () => window.print(),
    exportar: descargarJSON,
    importar: () => $("archivo").click(),
    "borrar-hist": () => {
      if (confirm("¿Borrar todo el historial? Esta acción no se puede deshacer.")) {
        Almacen.borrarHistorial();
        dibujar();
      }
    }
  };

  function iniciarApp() {
    Almacen.alAvisar(mostrarAviso);

    // Un solo listener de clics para todos los botones con data-accion
    $("app").addEventListener("click", (ev) => {
      const el = ev.target.closest("[data-accion]");
      if (el && acciones[el.dataset.accion]) acciones[el.dataset.accion](el);
    });

    // Cambios en respuestas, observaciones y datos del encabezado (guardan el borrador)
    $("app").addEventListener("input", (ev) => {
      const t = ev.target, a = estado.actual;
      if (estado.vista !== "auditoria" || !a) return;
      if (t.dataset.k !== undefined) { a.respuestas[t.dataset.k] = t.value; actualizarProgreso(); }
      else if (t.dataset.obs !== undefined) a.observaciones[t.dataset.obs] = t.value;
      else if (t.dataset.campo) a[t.dataset.campo] = t.value;
      else return;
      Almacen.guardarBorrador(a);
    });

    // Importar: cuando el usuario elige un archivo
    $("app").addEventListener("change", (ev) => {
      if (ev.target.id === "archivo") leerArchivoImportado(ev.target.files[0]);
    });

    $("rol").addEventListener("change", () => { estado.vista = "inicio"; dibujar(); });

    // Revisar que los escenarios estén bien formados (ayuda al editar escenarios.js)
    ESCENARIOS.forEach((e) => {
      const problemas = Motor.validarEscenario(e);
      if (problemas.length) mostrarAviso("error", `Escenario "${e.nombre}": ${problemas[0]}`);
    });

    dibujar();
  }

  document.addEventListener("DOMContentLoaded", iniciarApp);
})();
