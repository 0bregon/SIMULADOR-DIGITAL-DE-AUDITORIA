# Simulador Digital de Auditoría

Proyecto de *Evaluación y Auditoría de Sistemas* · Universidad de Panamá, CRU Panamá Oeste.

Simulador web donde el **Auditor** revisa la evidencia de varios controles (laboratorio de TI, nube, ERP), decide si *Cumple* o *No cumple*, y el sistema compara su juicio con los hallazgos reales, calcula el riesgo (probabilidad × impacto) y genera un informe con dictamen.

## Cómo ejecutarlo

No necesita instalar nada. Abra `index.html` con doble clic en cualquier navegador moderno (requiere internet solo para cargar Tailwind desde su CDN).

## Estructura

```
index.html               Página principal (solo carga los archivos)
css/estilos.css          Tema claro/oscuro, botones, impresión
js/escenarios.js         DATOS: contexto, controles y evidencias  ← aquí se agregan escenarios
js/motor.js              LÓGICA: cálculo de riesgo, precisión, cobertura, dictamen
js/almacenamiento.js     PERSISTENCIA: historial, borrador, exportar/importar JSON
js/app.js                INTERFAZ: vistas y eventos
tests/motor.test.js      34 pruebas automáticas (datos, motor y almacenamiento)
docs/plan-de-pruebas.md  Plan y evidencia de pruebas (Fase 4)
```

Regla simple para no pisarse en el trabajo en equipo: cada archivo tiene **una sola responsabilidad**. Quien edite escenarios toca solo `escenarios.js`; quien edite cálculos toca solo `motor.js`.

## Roles

| Rol | Qué puede hacer |
|---|---|
| Auditor | Elegir escenario, responder controles, retomar una auditoría sin terminar, ver y descargar el informe |
| Administrador | Ver el panel de escenarios, el historial de auditorías, exportar/importar el historial en JSON y borrarlo |

> El rol se elige en el selector del encabezado. Es una simulación académica: no hay inicio de sesión.

## Escenarios

Cada escenario es una situación completa de una organización ficticia, con contexto y 10 controles. Todas las cifras, personas y empresas son inventadas.

| Escenario | Organización | Norma | Controles | Hallazgos reales | Riesgo total |
|---|---|---|---|---|---|
| Laboratorio VulnLab-02 | Facultad de Ingeniería de Sistemas | ISO/IEC 27001:2022 | 10 | 6 | 99 |
| Nube e infraestructura virtual | PagoRápido S.A. (pagos digitales) | ISO/IEC 27017 + COBIT DSS | 10 | 6 | 107 |
| ERP corporativo (Finanzas) | Distribuidora Istmo S.A. | COBIT 2019 + SOX 404 | 10 | 5 | 77 |

Lo que ve el auditor:

- **Contexto**: la organización, la situación, los antecedentes (incidentes y auditorías previas), el alcance, lo que queda fuera de alcance, por qué se eligió la norma y con quién se pudo hablar.
- **Evidencias por control** (2 a 4), de seis tipos: Entrevista, Documento, Observación, Prueba técnica, Registro y Configuración.
- **Complejidad**: algunas evidencias se contradicen o traen atenuantes. Hay controles que parecen fallar y cumplen (por ejemplo, un bucket público intencional o un rack abierto durante un mantenimiento) y hallazgos que mezclan excepciones válidas con incumplimientos (por ejemplo, 3 cambios de emergencia aceptables frente a 4 sin ticket).
- **Informe**: además de la matriz de riesgos, cada puntaje lleva su justificación según el contexto, y hay retroalimentación de por qué cada control cumple o no.

## Reglas del motor

- **Riesgo** de un hallazgo = probabilidad (1-5) × impacto (1-5). Niveles: Crítico ≥ 20, Alto ≥ 12, Medio ≥ 6, Bajo < 6.
- **Precisión** = juicios correctos / total de controles. *No cumple* en un hallazgo real y *Cumple* en un control sano son aciertos.
- **N/A** cuenta como control no evaluado: en un hallazgo real queda como riesgo residual, y en un control sano no suma como acierto.
- **Cobertura de riesgo** = % del riesgo total que el auditor sí detectó.
- **Dictamen**: *Favorable* (cobertura ≥ 85 % y ningún riesgo alto/crítico omitido), *Favorable con salvedades* (cobertura ≥ 60 %), *Desfavorable* (menos de 60 %).

## Persistencia

Se usa `localStorage` del navegador:

- El **avance** de la auditoría se guarda en cada clic; si se cierra la pestaña, aparece "Continuar".
- El **historial** (máx. 50) se guarda al finalizar.
- **Exportar/Importar JSON** permite pasar el historial a otro equipo (el importar no duplica registros).
- Si los datos están dañados o el almacenamiento está lleno, se muestra un aviso en pantalla.

Todo el acceso a datos pasa por `almacenamiento.js`. Si se quiere migrar a una BD real (IndexedDB, SQLite, Firebase), solo se reescribe ese archivo.

## Pruebas

```bash
node --test tests/motor.test.js
```

Requiere Node 18 o superior. Resultado y detalle en `docs/plan-de-pruebas.md`.

## Agregar un escenario nuevo

1. Abra `js/escenarios.js` y copie un objeto de `ESCENARIOS`.
2. Cambie `id`, `nombre`, `norma`, `descripcion`, el `contexto` y la lista `controles`. Use los atajos `falla(...)` y `cumple(...)` y escriba las evidencias con `E(tipo, fuente, texto)`.
3. Abra la página: si algún dato está mal (falta contexto, menos de 2 evidencias, probabilidad fuera de 1-5, hallazgo sin justificación) aparece un aviso rojo.
4. Ejecute las pruebas.

## Trabajo en equipo (Git)

```bash
git pull                              # antes de empezar, siempre
git checkout -b mi-cambio             # una rama por tarea
# ...editar...
git add .
git commit -m "Descripción corta de lo que cambié"
git push -u origin mi-cambio          # y abrir un Pull Request en GitHub
```

## Créditos

Integrantes: _(completar)_ · Docente: _(completar)_ · Noviembre 2026
