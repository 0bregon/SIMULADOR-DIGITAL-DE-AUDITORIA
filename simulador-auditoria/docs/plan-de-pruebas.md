# Plan de pruebas — Simulador Digital de Auditoría

**Objetivo:** verificar que el motor de evaluación calcula correctamente hallazgos, riesgo y dictamen, y que la persistencia maneja datos válidos e inválidos.
**Entorno:** Node.js 22 (pruebas automáticas) y navegador simulado (jsdom) para la prueba de humo de la interfaz.
**Ejecución:** `node --test tests/motor.test.js` → **34 de 34 pruebas aprobadas**.

## 1. Pruebas automáticas

### Caja negra (entradas y salidas esperadas)

| ID | Caso | Resultado esperado | Estado |
|---|---|---|---|
| EVA-01 | Todas las respuestas correctas | Precisión 100 %, cobertura 100 %, residual 0, FAVORABLE | Aprobada |
| EVA-02 | Todo "Cumple" | 0 detectados, cobertura 0 %, DESFAVORABLE | Aprobada |
| EVA-03 | Todo "No cumple" | Detecta todo, genera falsos positivos, cobertura 100 % | Aprobada |
| EVA-04 | Todo "N/A" | Precisión 0 %, todo el riesgo queda residual | Aprobada |
| CAL-01 | Riesgo total del laboratorio | 20+20+15+20+12+12 = 99 | Aprobada |
| CAL-02 | Riesgo total de la nube | 20+25+15+16+15+16 = 107 | Aprobada |
| CAL-02b | Riesgo total del ERP | 20+16+20+12+9 = 77 | Aprobada |
| CAL-03 | Omitir un riesgo Medio (9, ERP) | Cobertura 88 %, FAVORABLE | Aprobada |
| CAL-04 | Omitir un riesgo Alto (15, nube) con cobertura 86 % | FAVORABLE CON SALVEDADES | Aprobada |
| CAL-05 | Cobertura 39 % y cobertura 85 % con un riesgo alto omitido | DESFAVORABLE y SALVEDADES | Aprobada |
| CAL-06 | Un falso positivo | Baja la precisión, el riesgo no cambia | Aprobada |
| CAL-07 | "N/A" en un control que cumplía | No suma acierto ni falso positivo | Aprobada |
| RIE-01 | Valores límite 25, 20, 19, 12, 11, 6, 5, 0 | Crítico, Crítico, Alto, Alto, Medio, Medio, Bajo, Bajo | Aprobada |
| RIE-02 | Puntaje de control | prob × impacto solo si hay hallazgo | Aprobada |
| INF-01 | Orden del informe | De mayor a menor riesgo | Aprobada |

### Caja blanca (ramas internas y errores)

| ID | Caso | Resultado esperado | Estado |
|---|---|---|---|
| DAT-01 | Escenarios cargados | Al menos 3 y todos válidos | Aprobada |
| DAT-02 | Mezcla de hallazgos | Cada escenario tiene hallazgos y controles sanos | Aprobada |
| DAT-03 | Datos mal formados | `validarEscenario` reporta contexto faltante, evidencias insuficientes, prob/impacto fuera de rango y hallazgo sin justificación | Aprobada |
| DAT-04 | Contexto y evidencias | Cada escenario tiene contexto completo, 10 o más controles y al menos 4 tipos de evidencia | Aprobada |
| DAT-05 | Nombres de control | Únicos dentro de cada escenario | Aprobada |
| ERR-01 | Falta una respuesta | Error con el nombre del control | Aprobada |
| ERR-02 | Respuesta inválida ("SI") | Error | Aprobada |
| ERR-03 | Escenario o respuestas nulos | Error | Aprobada |
| ERR-04 | Inmutabilidad | El motor no modifica los datos del escenario | Aprobada |
| ALM-01 | Guardar y cargar historial | Más reciente primero | Aprobada |
| ALM-02 | 55 registros | Se conservan 50 | Aprobada |
| ALM-03 | JSON corrupto en storage | Lista vacía y aviso de error, sin colapsar | Aprobada |
| ALM-04 | Registros con forma incorrecta | Se descartan | Aprobada |
| ALM-05 | Guardar registro inválido | Rechazado | Aprobada |
| ALM-06 | Almacenamiento lleno | Devuelve `false` y avisa | Aprobada |
| ALM-07 | Borrador | Se guarda, se recupera y se descarta | Aprobada |
| ALM-08 | Borrador dañado | Se elimina y devuelve `null` | Aprobada |
| ALM-09 | Exportar e importar | Conserva datos y no duplica | Aprobada |
| ALM-10 | Importar archivo inválido | Error y no modifica el historial | Aprobada |

## 2. Prueba de humo de la interfaz (flujo completo)

Se simuló en un navegador virtual: inicio → iniciar laboratorio (con panel de contexto y evidencias) → responder 10 controles → volver → "Continuar" restaura respuestas → finalizar → informe → historial → vista Administrador.

| Paso | Estado |
|---|---|
| Inicio muestra 3 escenarios | Aprobado |
| Se muestra el contexto, la organización queda precargada y cada control lista sus evidencias | Aprobado |
| Se listan los 10 controles del laboratorio | Aprobado |
| Borrador guardado con las 10 respuestas | Aprobado |
| Aviso "auditoría sin terminar" y reanudación con respuestas restauradas | Aprobado |
| Informe con dictamen FAVORABLE, justificación del riesgo y retroalimentación | Aprobado |
| Auditoría guardada en historial y borrador eliminado | Aprobado |
| Finalizar con controles sin responder muestra aviso de error | Aprobado |
| Administrador ve el historial y los botones Exportar/Importar | Aprobado |

## 3. Pruebas manuales pendientes (hágalas en su navegador)

Estas no se pudieron verificar en este entorno. Marque cada una cuando la haga:

- [ ] Imprimir el informe (Imprimir / Guardar PDF) en Chrome: sin botones y legible.
- [ ] Tema oscuro del sistema operativo: contraste correcto.
- [ ] Vista en celular: controles y tabla del informe sin desbordar.
- [ ] Descargar el JSON de historial y volver a importarlo en otro navegador.
- [ ] Navegar con teclado (Tab/Espacio) por los controles.

## 4. Defectos de la versión anterior y su corrección

| # | Defecto | Corrección |
|---|---|---|
| 1 | Los errores de `localStorage` se ignoraban en silencio | Avisos visibles y validación de datos corruptos |
| 2 | El avance de la auditoría se perdía al recargar | Borrador guardado en cada respuesta y botón "Continuar" |
| 3 | Datos como arreglos posicionales (`i[3]*i[4]`) | Objetos con nombre (`prob`, `impacto`, `ref`...) |
| 4 | Todo en un solo archivo, sin comentarios | Cuatro módulos comentados con una responsabilidad cada uno |
| 5 | Referencias de norma incorrectas o vagas ("IAM", "Red", "Logs") | Referencias ISO/COBIT completas y revisadas |
| 6 | "N/A" sin regla definida | Regla documentada y probada (EVA-04, CAL-07) |
| 7 | Situaciones sin contexto y hallazgos predecibles (una sola línea de evidencia por control) | Cada escenario tiene contexto de organización, antecedentes, alcance y personas; 10 controles con 2 a 4 evidencias de 6 tipos, algunas contradictorias o con atenuantes, y controles que parecen fallar pero cumplen |
| 8 | Sin retroalimentación sobre por qué cumple o no | Sección 5 del informe con explicación por control |
| 9 | Sin forma de pasar el historial entre equipos | Exportar/Importar JSON |
| 10 | Sin pruebas | 34 pruebas automáticas y este plan |
| 11 | Puntajes de riesgo sin justificar | Cada hallazgo explica su probabilidad e impacto según el contexto de la organización |
