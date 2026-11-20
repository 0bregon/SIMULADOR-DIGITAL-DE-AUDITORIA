/**
 * Pruebas del motor de evaluación y del almacenamiento (caja negra y caja blanca).
 * Se ejecutan con:   node --test tests/
 * Requiere Node 18 o superior; no necesita instalar nada.
 */
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");

require("../js/escenarios.js");            // define globalThis.ESCENARIOS
const Motor = require("../js/motor.js");
const ESCENARIOS = globalThis.ESCENARIOS;

const porId = (id) => ESCENARIOS.find((e) => e.id === id);

/** Respuestas "perfectas": NC donde hay hallazgo, C donde no. */
const perfectas = (esc) => Object.fromEntries(esc.controles.map((c, k) => [k, c.hallazgo ? "NC" : "C"]));
/** Mismo valor para todos los controles. */
const todas = (esc, v) => Object.fromEntries(esc.controles.map((_, k) => [k, v]));
/** Copia de las perfectas cambiando una respuesta. */
const conCambio = (esc, k, v) => ({ ...perfectas(esc), [k]: v });
const indiceDe = (esc, nombre) => esc.controles.findIndex((c) => c.control === nombre);

// ───────────── Datos ─────────────

test("DAT-01: hay al menos 3 escenarios y todos pasan la validación", () => {
  assert.ok(ESCENARIOS.length >= 3);
  ESCENARIOS.forEach((e) => assert.deepEqual(Motor.validarEscenario(e), [], `Escenario ${e.id}`));
});

test("DAT-02: cada escenario mezcla hallazgos y controles que cumplen", () => {
  ESCENARIOS.forEach((e) => {
    const h = e.controles.filter((c) => c.hallazgo).length;
    assert.ok(h > 0 && h < e.controles.length, `Escenario ${e.id}: ${h}/${e.controles.length}`);
  });
});

test("DAT-03: validarEscenario detecta datos mal formados", () => {
  assert.ok(Motor.validarEscenario(null).length > 0);
  assert.ok(Motor.validarEscenario({ controles: [] }).length > 0);
  const malo = { controles: [{ control: "X", evidencias: [], hallazgo: true, prob: 9, impacto: 2, correccion: "" }] };
  const errores = Motor.validarEscenario(malo).join(" | ");
  assert.match(errores, /contexto/i);                 // falta el contexto
  assert.match(errores, /al menos 2 evidencias/);     // evidencias insuficientes
  assert.match(errores, /prob e impacto/);            // prob fuera de rango
  assert.match(errores, /justificación del riesgo/);  // hallazgo sin justificar
});

test("DAT-04: cada escenario tiene contexto completo, 10+ controles y evidencias variadas", () => {
  ESCENARIOS.forEach((e) => {
    const ctx = e.contexto;
    assert.ok(ctx.organizacion && ctx.alcance && ctx.fueraDeAlcance && ctx.criterio, `Contexto de ${e.id}`);
    assert.ok(ctx.situacion.length >= 2 && ctx.antecedentes.length >= 1 && ctx.personas.length >= 3, `Detalle de ${e.id}`);
    assert.ok(e.controles.length >= 10, `${e.id}: ${e.controles.length} controles`);
    const tipos = new Set(e.controles.flatMap((c) => c.evidencias.map((x) => x.tipo)));
    assert.ok(tipos.size >= 4, `${e.id}: solo ${tipos.size} tipos de evidencia`);
    e.controles.forEach((c) => assert.ok(c.evidencias.length >= 2, `${e.id}/${c.control}`));
  });
});

test("DAT-05: los nombres de control son únicos dentro de cada escenario", () => {
  ESCENARIOS.forEach((e) => {
    const nombres = e.controles.map((c) => c.control);
    assert.equal(new Set(nombres).size, nombres.length, e.id);
  });
});

// ───────────── Niveles de riesgo (valores límite) ─────────────

test("RIE-01: niveles en los valores límite", () => {
  const casos = [[25, "Crítico"], [20, "Crítico"], [19, "Alto"], [12, "Alto"],
                 [11, "Medio"], [6, "Medio"], [5, "Bajo"], [1, "Bajo"], [0, "Bajo"]];
  casos.forEach(([p, n]) => assert.equal(Motor.nivelRiesgo(p).nombre, n, `puntaje ${p}`));
});

test("RIE-02: puntajeControl = prob × impacto solo si hay hallazgo", () => {
  assert.equal(Motor.puntajeControl({ hallazgo: true, prob: 4, impacto: 5 }), 20);
  assert.equal(Motor.puntajeControl({ hallazgo: false, prob: 4, impacto: 5 }), 0);
});

// ───────────── Evaluación: casos de caja negra ─────────────

test("EVA-01: auditoría perfecta -> 100 %, sin riesgo residual, FAVORABLE", () => {
  ESCENARIOS.forEach((e) => {
    const r = Motor.evaluar(e, perfectas(e));
    assert.equal(r.precision, 100);
    assert.equal(r.cobertura, 100);
    assert.equal(r.riesgoResidual, 0);
    assert.equal(r.omitidos.length, 0);
    assert.equal(r.falsosPos.length, 0);
    assert.equal(r.dictamen, "FAVORABLE");
  });
});

test("EVA-02: todo 'Cumple' -> no detecta nada, DESFAVORABLE", () => {
  ESCENARIOS.forEach((e) => {
    const r = Motor.evaluar(e, todas(e, "C"));
    const reales = e.controles.filter((c) => c.hallazgo).length;
    assert.equal(r.detectados.length, 0);
    assert.equal(r.omitidos.length, reales);
    assert.equal(r.cobertura, 0);
    assert.equal(r.riesgoResidual, r.riesgoTotal);
    assert.equal(r.dictamen, "DESFAVORABLE");
    assert.equal(r.precision, Math.round(((e.controles.length - reales) / e.controles.length) * 100));
  });
});

test("EVA-03: todo 'No cumple' -> detecta todo pero genera falsos positivos", () => {
  ESCENARIOS.forEach((e) => {
    const r = Motor.evaluar(e, todas(e, "NC"));
    const reales = e.controles.filter((c) => c.hallazgo).length;
    assert.equal(r.detectados.length, reales);
    assert.equal(r.omitidos.length, 0);
    assert.equal(r.falsosPos.length, e.controles.length - reales);
    assert.equal(r.cobertura, 100);
    assert.equal(r.precision, Math.round((reales / e.controles.length) * 100));
  });
});

test("EVA-04: todo 'N/A' -> precisión 0 y todo el riesgo queda residual", () => {
  ESCENARIOS.forEach((e) => {
    const r = Motor.evaluar(e, todas(e, "NA"));
    assert.equal(r.precision, 0);
    assert.equal(r.aciertos, 0);
    assert.equal(r.falsosPos.length, 0);
    assert.equal(r.riesgoResidual, r.riesgoTotal);
    assert.equal(r.dictamen, "DESFAVORABLE");
  });
});

// ───────────── Cálculos exactos (valores calculados a mano) ─────────────

test("CAL-01: riesgo total del laboratorio = 20+20+15+20+12+12 = 99", () => {
  // credenciales 5×4, FTP 4×5, USB 3×5, parches 4×5, incidentes 4×3, cuentas de asistentes 3×4
  assert.equal(Motor.evaluar(porId("lab"), perfectas(porId("lab"))).riesgoTotal, 99);
});

test("CAL-02: riesgo total de la nube = 20+25+15+16+15+16 = 107", () => {
  // MFA 4×5, grupos de seguridad 5×5, DRP 3×5, llaves 4×4, aislamiento 3×5, terceros 4×4
  assert.equal(Motor.evaluar(porId("cloud"), perfectas(porId("cloud"))).riesgoTotal, 107);
});

test("CAL-02b: riesgo total del ERP = 20+16+20+12+9 = 77", () => {
  // SoD 4×5, cambios 4×4, bajas 5×4, proveedores 3×4, conciliación 3×3
  assert.equal(Motor.evaluar(porId("erp"), perfectas(porId("erp"))).riesgoTotal, 77);
});

test("CAL-03: omitir solo un riesgo MEDIO mantiene el dictamen FAVORABLE", () => {
  const e = porId("erp"), k = indiceDe(e, "Conciliación de pagos");   // 3×3 = 9 (Medio)
  const r = Motor.evaluar(e, conCambio(e, k, "C"));
  assert.equal(r.riesgoResidual, 9);
  assert.equal(r.cobertura, 88);          // (77-9)/77 = 88.3 -> 88
  assert.equal(r.dictamen, "FAVORABLE");
});

test("CAL-04: omitir un riesgo ALTO baja a FAVORABLE CON SALVEDADES aunque la cobertura sea ≥ 85 %", () => {
  const e = porId("cloud"), k = indiceDe(e, "Aislamiento de entornos");    // 3×5 = 15 (Alto)
  const r = Motor.evaluar(e, conCambio(e, k, "C"));
  assert.equal(r.cobertura, 86);          // (107-15)/107 = 85.98 -> 86
  assert.equal(r.dictamen, "FAVORABLE CON SALVEDADES");
});

test("CAL-05: cobertura baja -> DESFAVORABLE; cobertura 85 % con un riesgo alto omitido -> SALVEDADES", () => {
  const e = porId("lab");   // total 99
  const k = (n) => indiceDe(e, n);
  // Omitir credenciales(20)+FTP(20)+parches(20) = 60 -> cobertura 39 % -> DESFAVORABLE
  const resp = { ...perfectas(e), [k("Gestión de credenciales")]: "C", [k("Servicios de red")]: "C", [k("Gestión de parches")]: "C" };
  const r = Motor.evaluar(e, resp);
  assert.equal(r.riesgoResidual, 60);
  assert.equal(r.cobertura, 39);          // (99-60)/99 = 39.4 -> 39
  assert.equal(r.dictamen, "DESFAVORABLE");
  // Omitir solo USB(15): cobertura 85 % (84.8 -> 85) pero el riesgo omitido es Alto -> salvedades
  const r2 = Motor.evaluar(e, conCambio(e, k("Dispositivos externos"), "C"));
  assert.equal(r2.cobertura, 85);
  assert.equal(r2.dictamen, "FAVORABLE CON SALVEDADES");
});

test("CAL-06: un falso positivo baja la precisión pero no cambia el riesgo", () => {
  const e = porId("erp"), k = indiceDe(e, "Política de contraseñas");
  const r = Motor.evaluar(e, conCambio(e, k, "NC"));
  assert.deepEqual(r.falsosPos, [k]);
  assert.equal(r.riesgoResidual, 0);
  assert.equal(r.precision, Math.round(((e.controles.length - 1) / e.controles.length) * 100));
});

test("CAL-07: 'N/A' en un control que cumplía no suma como acierto ni como falso positivo", () => {
  const e = porId("erp"), k = indiceDe(e, "Cifrado de nómina");
  const r = Motor.evaluar(e, conCambio(e, k, "NA"));
  assert.equal(r.falsosPos.length, 0);
  assert.equal(r.aciertos, e.controles.length - 1);
});

// ───────────── Errores y datos inválidos (caja blanca) ─────────────

test("ERR-01: falta una respuesta -> lanza error con el nombre del control", () => {
  const e = porId("lab");
  const r = perfectas(e);
  delete r[2];
  assert.throws(() => Motor.evaluar(e, r), /Falta responder el control 3/);
});

test("ERR-02: respuesta con valor inválido -> lanza error", () => {
  const e = porId("lab");
  assert.throws(() => Motor.evaluar(e, conCambio(e, 0, "SI")), /Respuesta inválida/);
});

test("ERR-03: escenario o respuestas nulos -> lanza error", () => {
  assert.throws(() => Motor.evaluar(null, {}), /Escenario inválido/);
  assert.throws(() => Motor.evaluar(porId("lab"), null), /Respuestas inválidas/);
});

test("ERR-04: el motor no modifica los datos del escenario", () => {
  const antes = JSON.stringify(ESCENARIOS);
  ESCENARIOS.forEach((e) => Motor.evaluar(e, todas(e, "NC")));
  assert.equal(JSON.stringify(ESCENARIOS), antes);
});

// ───────────── Informe ─────────────

test("INF-01: filasInforme ordena de mayor a menor riesgo", () => {
  const e = porId("cloud");
  const r = Motor.evaluar(e, perfectas(e));
  const filas = Motor.filasInforme(e, r.detectados);
  for (let i = 1; i < filas.length; i++) assert.ok(filas[i - 1].puntaje >= filas[i].puntaje);
  assert.equal(filas[0].control.control, "Grupos de seguridad");   // 5×5 = 25
  assert.equal(filas[0].nivel.nombre, "Crítico");
});

// ───────────── Almacenamiento (con localStorage simulado) ─────────────

function simularStorage() {
  const datos = new Map();
  globalThis.localStorage = {
    getItem: (k) => (datos.has(k) ? datos.get(k) : null),
    setItem: (k, v) => { datos.set(k, String(v)); },
    removeItem: (k) => { datos.delete(k); }
  };
  return datos;
}
const Almacen = require("../js/almacenamiento.js");
const reg = (n = 1) => ({ fecha: "19/11/2026", hora: "10:00:0" + n, auditor: "Ana", escenario: "Lab", precision: 80, residual: n });

test("ALM-01: guardar y cargar historial", () => {
  simularStorage();
  assert.deepEqual(Almacen.cargarHistorial(), []);
  assert.equal(Almacen.guardarAuditoria(reg(1)), true);
  Almacen.guardarAuditoria(reg(2));
  const h = Almacen.cargarHistorial();
  assert.equal(h.length, 2);
  assert.equal(h[0].residual, 2);            // el más reciente primero
});

test("ALM-02: el historial se limita a 50 registros", () => {
  simularStorage();
  for (let i = 0; i < 55; i++) Almacen.guardarAuditoria({ ...reg(1), residual: i });
  assert.equal(Almacen.cargarHistorial().length, 50);
});

test("ALM-03: datos corruptos -> devuelve lista vacía y avisa, sin romper", () => {
  const datos = simularStorage();
  const avisos = [];
  Almacen.alAvisar((tipo, msg) => avisos.push([tipo, msg]));
  datos.set("simaud.historial.v3", "{esto no es json");
  assert.deepEqual(Almacen.cargarHistorial(), []);
  assert.equal(avisos[0][0], "error");
  Almacen.alAvisar(null);
});

test("ALM-04: registros con forma incorrecta se descartan", () => {
  const datos = simularStorage();
  datos.set("simaud.historial.v3", JSON.stringify([reg(1), { basura: true }, null, "x"]));
  assert.equal(Almacen.cargarHistorial().length, 1);
});

test("ALM-05: no guarda un registro inválido", () => {
  simularStorage();
  assert.equal(Almacen.guardarAuditoria({ fecha: "hoy" }), false);
  assert.equal(Almacen.cargarHistorial().length, 0);
});

test("ALM-06: almacenamiento lleno -> guardar devuelve false y avisa", () => {
  simularStorage();
  const avisos = [];
  Almacen.alAvisar((t, m) => avisos.push(t));
  globalThis.localStorage.setItem = () => { throw new Error("QuotaExceededError"); };
  assert.equal(Almacen.guardarAuditoria(reg(1)), false);
  assert.deepEqual(avisos, ["error"]);
  Almacen.alAvisar(null);
});

test("ALM-07: el borrador se guarda, se recupera y se descarta", () => {
  simularStorage();
  const b = { id: "lab", auditor: "Ana", organizacion: "X", respuestas: { 0: "NC" }, observaciones: {} };
  Almacen.guardarBorrador(b);
  assert.deepEqual(Almacen.cargarBorrador(), b);
  Almacen.borrarBorrador();
  assert.equal(Almacen.cargarBorrador(), null);
});

test("ALM-08: un borrador dañado se elimina y devuelve null", () => {
  const datos = simularStorage();
  datos.set("simaud.borrador.v4", JSON.stringify({ id: 5 }));
  assert.equal(Almacen.cargarBorrador(), null);
  assert.equal(datos.has("simaud.borrador.v4"), false);
});

test("ALM-09: exportar e importar conserva el historial y evita duplicados", () => {
  simularStorage();
  Almacen.guardarAuditoria(reg(1));
  Almacen.guardarAuditoria(reg(2));
  const texto = Almacen.exportarJSON();

  simularStorage();                          // "otro navegador" vacío
  const r1 = Almacen.importarJSON(texto);
  assert.deepEqual([r1.ok, r1.agregados], [true, 2]);
  const r2 = Almacen.importarJSON(texto);    // importar de nuevo no duplica
  assert.deepEqual([r2.ok, r2.agregados], [true, 0]);
  assert.equal(Almacen.cargarHistorial().length, 2);
});

test("ALM-10: importar archivos inválidos devuelve error y no modifica nada", () => {
  simularStorage();
  Almacen.guardarAuditoria(reg(1));
  assert.equal(Almacen.importarJSON("no es json").ok, false);
  assert.equal(Almacen.importarJSON('{"otra":"cosa"}').ok, false);
  assert.equal(Almacen.cargarHistorial().length, 1);
});
