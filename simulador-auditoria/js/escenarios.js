/**
 * escenarios.js — DATOS de los escenarios de auditoría.
 *
 * Aquí solo hay datos, nada de lógica. Para agregar un escenario basta con añadir
 * un objeto al arreglo ESCENARIOS (no hay que tocar ningún otro archivo).
 *
 * ESCENARIO
 *   id, nombre, norma, descripcion (texto corto de la tarjeta)
 *   contexto: {
 *     organizacion   Quién es la empresa/unidad auditada (ficticia).
 *     situacion[]    Párrafos que describen el entorno y el momento de la auditoría.
 *     antecedentes[] Hechos previos relevantes (incidentes, auditorías anteriores).
 *     alcance        Qué se audita.
 *     fueraDeAlcance Qué NO se audita.
 *     criterio       Por qué se eligió esta norma/marco.
 *     personas[]     {cargo, detalle}: a quién se pudo entrevistar.
 *   }
 *   controles[]
 *
 * CONTROL
 *   control            Nombre del control auditado.
 *   evidencias[]       {tipo, fuente, texto}: lo que el auditor recopiló. Pueden
 *                      contradecirse o tener atenuantes: hay que ponderarlas.
 *   hallazgo           true  = el control realmente NO cumple.
 *                      false = el control sí cumple (aunque algo parezca sospechoso).
 *   prob, impacto      1-5 (solo si hay hallazgo).
 *   justificacionRiesgo Por qué esa probabilidad e impacto en ESTE contexto (solo si hay hallazgo).
 *   correccion         Acción correctiva recomendada (solo si hay hallazgo).
 *   ref                Referencia de la norma.
 *   pista              Explicación que se muestra en el informe sobre el resultado correcto.
 *
 * Todas las organizaciones, personas y cifras son FICTICIAS.
 * (No se usan módulos ESM a propósito: así el proyecto abre con doble clic, sin servidor.)
 */
(function (global) {
  "use strict";

  /** Atajo para escribir una evidencia. tipo: Entrevista | Documento | Observación | Prueba técnica | Registro | Configuración */
  const E = (tipo, fuente, texto) => ({ tipo, fuente, texto });

  /** Atajo para un control que cumple (sin hallazgo). */
  const cumple = (control, ref, evidencias, pista) => ({
    control, ref, evidencias, hallazgo: false, prob: 0, impacto: 0,
    justificacionRiesgo: "", correccion: "", pista
  });

  /** Atajo para un control con hallazgo. */
  const falla = (control, ref, evidencias, prob, impacto, justificacionRiesgo, correccion, pista) => ({
    control, ref, evidencias, hallazgo: true, prob, impacto, justificacionRiesgo, correccion, pista
  });

  const ESCENARIOS = [

    // ═══════════════════════════════════════════════════════════════════
    // 1. LABORATORIO — ISO/IEC 27001:2022
    // ═══════════════════════════════════════════════════════════════════
    {
      id: "lab",
      nombre: "Laboratorio VulnLab-02",
      norma: "ISO/IEC 27001:2022 (Anexo A)",
      descripcion: "Laboratorio universitario con datos de calificaciones y un proyecto confidencial, administrado por una sola persona.",
      contexto: {
        organizacion: "Facultad de Ingeniería de Sistemas (institución ficticia) — Laboratorio VulnLab-02",
        situacion: [
          "VulnLab-02 es un laboratorio de prácticas de redes y seguridad con 24 estaciones de trabajo, un servidor de archivos (10.0.10.5) y un router/firewall que lo conecta a internet. Lo usan unos 400 estudiantes por semestre y también aloja datos de un proyecto de investigación financiado por un tercero, sujeto a un acuerdo de confidencialidad.",
          "El servidor guarda guías de práctica, entregas de estudiantes y respaldos de calificaciones. La red se divide en tres VLAN: laboratorio, administración e invitados (WiFi de visitas). El servidor es una torre bajo el escritorio del administrador; el rack de comunicaciones solo contiene switches y patch panel.",
          "El laboratorio lo administra una sola persona a media jornada, apoyada por asistentes estudiantiles que cambian cada semestre y tienen llave de la sala. No hay cámaras de vigilancia."
        ],
        antecedentes: [
          "Hace cinco semanas un estudiante comentó verbalmente que pudo ver un archivo de calificaciones desde su casa. No se abrió ninguna investigación formal.",
          "La auditoría interna del año pasado recomendó cambiar las credenciales por defecto de los equipos de red. El plan de acción tenía fecha límite hace ocho meses."
        ],
        alcance: "Controles físicos y lógicos del laboratorio, su servidor de archivos y su router.",
        fueraDeAlcance: "Red troncal del campus, sistemas académicos centrales y el WiFi institucional.",
        criterio: "ISO/IEC 27001:2022 Anexo A: es el catálogo de referencia de controles de seguridad de la información y permite auditar a la vez lo físico y lo lógico en un entorno pequeño, sin exigir una certificación completa.",
        personas: [
          { cargo: "Administrador del laboratorio", detalle: "Único responsable técnico, media jornada." },
          { cargo: "Asistente estudiantil (turno nocturno)", detalle: "Tiene llave de la sala; cambia cada semestre." },
          { cargo: "Coordinadora de la Facultad", detalle: "Dueña del proceso; firma las excepciones." }
        ]
      },
      controles: [
        falla("Gestión de credenciales", "ISO 27001 A.5.17 Información de autenticación", [
          E("Observación", "Panel del router (192.168.10.1)", "Durante el recorrido el auditor ingresó con usuario admin y contraseña admin, sin bloqueo ni aviso."),
          E("Entrevista", "Administrador del laboratorio", "«El router lo dejó configurado el proveedor de internet. No lo cambié porque si se pierde la clave hay que resetearlo y se cae la red del lab.»"),
          E("Documento", "Política institucional de contraseñas (2023)", "Exige cambiar las credenciales por defecto de todo equipo de red antes de ponerlo en producción.")
        ], 5, 4,
        "Probabilidad 5: credenciales de conocimiento público y panel alcanzable desde la VLAN del laboratorio. Impacto 4: desde el router se pueden modificar las reglas que separan las VLAN.",
        "Cambiar las credenciales del router por contraseñas únicas y complejas, guardarlas en un gestor y documentar el procedimiento de recuperación para no depender de la clave por defecto.",
        "La política ya lo exigía: no es un vacío normativo sino un incumplimiento. El router controla la separación de redes, por eso el impacto es alto."),

        cumple("Rack de servidores", "ISO 27001 A.7.8 Emplazamiento de equipos / A.7.12 Seguridad del cableado", [
          E("Observación", "Rack de comunicaciones", "Durante el recorrido el rack estaba abierto, pero el administrador instalaba un switch con la orden de trabajo OT-0412 y un asistente lo vigilaba."),
          E("Documento", "Registro de llaves", "Hay dos copias: una con el administrador y otra en un sobre sellado en la coordinación. El sobre estaba intacto."),
          E("Observación", "Cableado", "Ordenado, etiquetado y coincide con el diagrama de red.")
        ], "Que el rack estuviera abierto parecía una falla, pero había orden de trabajo y supervisión, y las llaves están controladas. Cumple."),

        falla("Servicios de red", "ISO 27001 A.8.20 Seguridad de redes / A.8.3 Restricción de acceso a la información", [
          E("Prueba técnica", "Escaneo nmap al servidor 10.0.10.5", "Puerto 21/tcp abierto; el servidor FTP acepta login anónimo. El router tiene una regla que reenvía el puerto 21 de la IP pública a ese servidor."),
          E("Observación", "Directorio /pub del FTP", "Contiene guías de práctica y también el archivo respaldo_notas_2025.xlsx con calificaciones de unos 380 estudiantes."),
          E("Entrevista", "Administrador del laboratorio", "«El FTP anónimo es para que los estudiantes bajen las guías sin cuenta. Lo del archivo de notas no sabía que estaba ahí.»")
        ], 4, 5,
        "Probabilidad 4: el servicio es alcanzable desde internet por el reenvío de puertos y ya hubo un reporte de exposición. Impacto 5: se exponen datos personales académicos de cientos de estudiantes.",
        "Deshabilitar el acceso anónimo, mover las guías a un recurso de solo lectura sin datos sensibles, retirar el archivo de calificaciones, migrar a SFTP y evaluar si la exposición debe tratarse como incidente de datos personales.",
        "Probablemente explica el comentario del estudiante de hace cinco semanas. Un FTP anónimo para guías sería aceptable por sí solo; el problema es que convive con datos personales."),

        cumple("Respaldos", "ISO 27001 A.8.13 Copias de seguridad de la información", [
          E("Registro", "Software de respaldo", "Respaldo diario al NAS y copia semanal cifrada al centro de datos universitario. Sin fallos en los últimos 60 días."),
          E("Documento", "Actas de restauración", "Prueba mensual firmada; las tres últimas restauraron el 100 % de un conjunto de muestra."),
          E("Observación", "Sala del laboratorio", "El NAS está en la misma sala, pero la copia semanal fuera del laboratorio cubre la pérdida total del sitio.")
        ], "El NAS en la misma sala parece débil, pero la copia externa cifrada y las restauraciones probadas lo compensan. Cumple."),

        falla("Dispositivos externos", "ISO 27001 A.7.10 Medios de almacenamiento / A.7.2 Entrada física", [
          E("Observación", "Servidor de archivos", "Una memoria USB sin etiqueta está conectada en un puerto trasero."),
          E("Registro", "Visor de eventos del servidor", "Evento de almacenamiento masivo USB hace 17 días a las 02:14, sin sesión de usuario interactiva en ese momento."),
          E("Registro", "Bitácora de acceso a la sala", "No hay ingresos registrados esa noche. La sala no tiene cámaras."),
          E("Entrevista", "Asistente estudiantil nocturno", "«Debe ser de algún compañero, entra mucha gente.»")
        ], 3, 5,
        "Hay acceso físico sin trazabilidad (la bitácora no coincide con el evento) o acceso remoto sin sesión interactiva; en ambos casos el origen es desconocido. Impacto 5 porque el servidor guarda datos personales y del proyecto confidencial.",
        "Retirar y analizar la memoria en un equipo aislado, bloquear puertos USB no necesarios por política de grupo, exigir bitácora de ingreso con firma, y tratar el evento de las 02:14 como posible incidente.",
        "La contradicción entre el evento (02:14) y la bitácora (sin ingresos) es la clave: el control de acceso físico no es confiable."),

        cumple("Acceso remoto SSH", "ISO 27001 A.8.5 Autenticación segura / A.8.20 Seguridad de redes", [
          E("Prueba técnica", "Escaneo nmap", "El servidor acepta SSH en el puerto 2222 en lugar del 22."),
          E("Configuración", "sshd_config", "PasswordAuthentication no; solo llaves públicas; AllowUsers limitado al administrador."),
          E("Configuración", "Firewall del servidor", "Solo se acepta conexión desde 10.0.20.10 (VLAN de administración)."),
          E("Entrevista", "Asistente estudiantil", "«Ese puerto raro debe ser una puerta trasera, ¿no?»")
        ], "El puerto no estándar no es el control; lo que protege es la llave pública y la restricción por IP. La sospecha del asistente es un error de interpretación. Cumple."),

        falla("Gestión de parches", "ISO 27001 A.8.8 Gestión de vulnerabilidades técnicas", [
          E("Registro", "Gestor de parches", "15 de 25 equipos (24 estaciones y el servidor) tienen vulnerabilidades críticas sin corregir; la más antigua lleva 94 días."),
          E("Documento", "Procedimiento de gestión de parches", "Las vulnerabilidades críticas deben corregirse en un máximo de 30 días."),
          E("Entrevista", "Administrador del laboratorio", "«Suspendimos las ventanas de mantenimiento durante los exámenes. Terminaron hace seis semanas y no las retomamos.»"),
          E("Documento", "Acta de excepción firmada por la Coordinadora", "Cubre 2 estaciones de simulación con software heredado incompatible con las actualizaciones, aisladas en una VLAN sin salida a internet.")
        ], 4, 5,
        "La excepción solo cubre 2 de los 15 equipos afectados; los otros 13 y el servidor siguen expuestos. Impacto 5 porque el servidor guarda datos personales y confidenciales.",
        "Retomar las ventanas de mantenimiento, parchear los 13 equipos y el servidor en máximo 30 días y mantener la excepción de las 2 estaciones aisladas con revisión semestral.",
        "Hay una excepción válida, pero parcial: no justifica el atraso general. El motivo (exámenes) terminó hace seis semanas."),

        falla("Gestión de incidentes", "ISO 27001 A.5.24 Planificación de la gestión de incidentes / A.5.26 Respuesta a incidentes", [
          E("Entrevista", "Coordinadora de la Facultad", "«El caso de las notas se habló en una reunión. No quedó nada escrito.»"),
          E("Documento", "Búsqueda de procedimientos", "No existe procedimiento ni registro de incidentes de seguridad del laboratorio."),
          E("Observación", "Pizarra de la sala", "Visible desde la puerta; tiene direcciones IP, usuarios y claves de las prácticas anotadas con marcador.")
        ], 4, 3,
        "Sin registro no se puede investigar ni demostrar diligencia, y la pizarra expone credenciales a cualquiera que entre a la sala (probabilidad 4). Impacto 3: son credenciales de prácticas, no de producción.",
        "Crear un procedimiento de reporte y registro de incidentes con responsables y plazos, registrar de forma retroactiva el caso de las calificaciones, retirar las credenciales de la pizarra y usar un repositorio controlado.",
        "El incidente de las notas no tiene registro: es el síntoma más claro de que no existe un proceso."),

        cumple("Segmentación de red", "ISO 27001 A.8.22 Segregación de redes", [
          E("Documento", "Diagrama de red", "Tres VLAN: laboratorio (10.0.10.0/24), administración (10.0.20.0/24) e invitados (10.0.30.0/24)."),
          E("Prueba técnica", "Auditor conectado al WiFi de invitados", "No pudo alcanzar el servidor ni la VLAN del laboratorio; las pruebas dieron tiempo agotado."),
          E("Observación", "Configuración del WiFi de visitas", "Existe una cuenta 'invitado' con acceso solo a internet.")
        ], "La cuenta 'invitado' parece un riesgo, pero está aislada por las ACL y la prueba lo confirma. El riesgo real está en las credenciales del router (otro control), no en la segmentación. Cumple."),

        falla("Cuentas de asistentes", "ISO 27001 A.5.18 Derechos de acceso / A.6.5 Responsabilidades tras la terminación", [
          E("Registro", "Lista de cuentas del servidor", "9 cuentas de asistentes; 6 con permisos de administrador local; 2 sin inicio de sesión hace más de un año."),
          E("Documento", "Lista oficial de asistentes del semestre", "Hay 4 asistentes activos: 5 de las 9 cuentas pertenecen a personas que ya no colaboran."),
          E("Entrevista", "Administrador del laboratorio", "«Las cuentas se crean cuando llegan y no tengo tiempo de borrarlas.»")
        ], 3, 4,
        "Probabilidad 3: las cuentas están inactivas pero no deshabilitadas y hay rotación constante de personas. Impacto 4: varias tienen permisos de administrador local sobre un servidor con datos personales.",
        "Dar de baja las 5 cuentas de personas que ya no colaboran, quitar los permisos de administrador local salvo necesidad justificada y revisar las cuentas al inicio y al final de cada semestre.",
        "Las cuentas huérfanas con privilegios son un acceso esperando a ser usado, aunque hoy nadie las use.")
      ]
    },

    // ═══════════════════════════════════════════════════════════════════
    // 2. NUBE — ISO/IEC 27017 + COBIT DSS
    // ═══════════════════════════════════════════════════════════════════
    {
      id: "cloud",
      nombre: "Nube e infraestructura virtual",
      norma: "ISO/IEC 27017 + COBIT 2019 (DSS)",
      descripcion: "Plataforma de pagos digitales migrada a AWS con prisa, bajo un contrato de recuperación de 4 horas y una inspección regulatoria próxima.",
      contexto: {
        organizacion: "PagoRápido S.A. (empresa ficticia de pagos digitales)",
        situacion: [
          "PagoRápido procesa pagos con tarjeta y transferencias para unos 1,800 comercios. Migró su plataforma desde un centro de datos propio a AWS hace ocho meses. Tiene 45 empleados; el equipo de DevOps son 6 personas y hay un ingeniero de seguridad compartido con otro proyecto.",
          "La infraestructura se define con Terraform y se despliega con un pipeline de CI/CD. Todo vive en una sola cuenta AWS, con entornos de desarrollo y producción. La migración se hizo con prisa y varias configuraciones «temporales» siguen vigentes.",
          "Los contratos con los comercios comprometen un tiempo de recuperación (RTO) de 4 horas con penalizaciones. El regulador financiero hará una inspección en 8 semanas y pedirá evidencia de continuidad y de control de accesos."
        ],
        antecedentes: [
          "Hace tres meses un desarrollador publicó por error una llave de AWS en un repositorio público; se revocó a los 40 minutos. Desde entonces el pipeline escanea secretos en los commits nuevos.",
          "No hay auditorías previas de la plataforma en la nube."
        ],
        alcance: "Cuenta AWS de PagoRápido: identidades, red, datos, registros y continuidad.",
        fueraDeAlcance: "La aplicación móvil, los procesos de negocio de los comercios y la certificación PCI DSS completa.",
        criterio: "ISO/IEC 27017 aporta los controles específicos de nube y la responsabilidad compartida con el proveedor; COBIT 2019 DSS cubre la operación, la seguridad y la continuidad de los servicios, que es lo que pedirá el regulador.",
        personas: [
          { cargo: "Jefe de DevOps", detalle: "Responsable de la infraestructura y del pipeline." },
          { cargo: "Ingeniero de seguridad (compartido)", detalle: "Configuró los registros y las alertas." },
          { cargo: "CTO", detalle: "Aprobó las políticas; custodia la cuenta raíz." },
          { cargo: "Desarrolladora senior", detalle: "Trabaja a diario con los entornos de desarrollo y producción." }
        ]
      },
      controles: [
        falla("MFA obligatorio", "ISO 27001 A.8.5 Autenticación segura / COBIT DSS05.04", [
          E("Registro", "Reporte de credenciales IAM", "14 usuarios con rol administrador y acceso a la consola; 6 no tienen MFA activado."),
          E("Documento", "Política de seguridad v2.1 aprobada por el CTO", "Exige MFA para toda cuenta privilegiada."),
          E("Entrevista", "Jefe de DevOps", "«Son cuentas heredadas de la migración; íbamos a activarles MFA pronto. Dos son consultores externos.»")
        ], 4, 5,
        "Seis cuentas con control total dependen solo de una contraseña, y dos son de terceros (probabilidad 4). Impacto 5: acceso total a los datos de pagos.",
        "Activar MFA en las 6 cuentas en un plazo de 7 días (suspender las que no lo hagan), forzar MFA con una política IAM que niegue acciones sin segundo factor y revisar mensualmente el reporte de credenciales.",
        "La política existe y es adecuada; el hallazgo es de cumplimiento, no de diseño."),

        cumple("Cifrado en reposo", "ISO 27001 A.8.24 Uso de criptografía / COBIT DSS05", [
          E("Configuración", "AWS Config", "Todas las bases RDS y los buckets S3 de producción están cifrados con claves KMS; la rotación anual automática está activa."),
          E("Prueba técnica", "Revisión del auditor", "Se encontraron 2 volúmenes EBS sin cifrar asociados a instancias de la cuenta."),
          E("Entrevista", "Ingeniero de seguridad", "«Son volúmenes de un laboratorio de pruebas de rendimiento con datos sintéticos; las instancias se apagan al terminar.»"),
          E("Prueba técnica", "Muestreo del auditor", "Revisó 20 filas de cada volumen: todos son datos generados, sin tarjetas ni datos personales.")
        ], "Los volúmenes sin cifrar parecen una falla, pero no contienen datos reales (verificado por muestreo). Es una oportunidad de mejora (activar cifrado por defecto), no un hallazgo."),

        falla("Grupos de seguridad", "ISO 27001 A.8.20 Seguridad de redes / ISO 27017 CLD.13.1.4", [
          E("Configuración", "Security Group 'db-legacy'", "Permite TCP 22 y 5432 desde 0.0.0.0/0 hacia el servidor PostgreSQL que guarda las transacciones de pagos."),
          E("Registro", "AWS Config", "La regla restricted-ssh aparece NO CONFORME desde hace 61 días."),
          E("Registro", "VPC Flow Logs", "3,214 intentos de conexión al puerto 22 desde IPs externas en 7 días; ninguno aceptado en los registros revisados."),
          E("Entrevista", "Jefe de DevOps", "«Es temporal, de la migración. Nadie lo cerró.»")
        ], 5, 5,
        "La base de datos de pagos está expuesta a todo internet y ya recibe ataques de fuerza bruta. Que no haya accesos aceptados en la muestra no elimina el riesgo.",
        "Cerrar de inmediato los puertos 22 y 5432 a internet, permitir solo el bastión o la VPN corporativa, revisar los registros de autenticación del servidor desde la migración para descartar accesos previos y alertar sobre reglas 0.0.0.0/0.",
        "Los intentos fallidos dan una falsa sensación de seguridad: la exposición en sí es el hallazgo."),

        cumple("Registros de auditoría", "ISO 27001 A.8.15 Registro de eventos", [
          E("Configuración", "Trail organizacional multi-región de CloudTrail", "Activo; entrega a un bucket S3 con Object Lock (modo compliance) y retención de 1 año."),
          E("Observación", "Consola de AWS", "Una alerta roja indica «trail en us-west-2 deshabilitado»."),
          E("Entrevista", "Ingeniero de seguridad", "«Eliminamos a propósito un trail regional duplicado cuando creamos el trail multi-región.»"),
          E("Prueba técnica", "Acción de prueba del auditor", "La acción aparece en el registro a los 6 minutos.")
        ], "La alerta roja es de un trail regional eliminado a propósito; el trail multi-región cubre todo y los registros son inmutables. Cumple."),

        falla("Respaldos y DRP", "ISO 27001 A.5.30 Preparación de las TIC para la continuidad / COBIT DSS04", [
          E("Documento", "Plan de recuperación (DRP) v1.0", "Establece un RTO de 4 horas; nunca se ha probado."),
          E("Registro", "Snapshots", "Hay snapshots diarios automáticos de RDS y volúmenes; no hay evidencia de restauración de toda la plataforma en un entorno limpio."),
          E("Entrevista", "Jefe de DevOps", "«Restauramos snapshots sueltos para depurar, pero nunca toda la plataforma. No sabemos cuánto tardaría.»"),
          E("Documento", "Contrato modelo con comercios", "Compromete un RTO de 4 horas con penalizaciones.")
        ], 3, 5,
        "Probabilidad 3: es plausible que ocurra un evento que exija recuperación completa en un año. Impacto 5: incumplimiento contractual y regulatorio sin evidencia de poder recuperar.",
        "Ejecutar una prueba completa de recuperación en un entorno aislado, medir el RTO real, actualizar el DRP con lo aprendido y programar pruebas anuales con acta firmada.",
        "Tener copias no es lo mismo que poder recuperar: sin una prueba completa, el RTO comprometido es una promesa sin respaldo."),

        cumple("Acceso público a almacenamiento", "ISO 27001 A.8.3 Restricción de acceso a la información", [
          E("Configuración", "Política del bucket 'pagorapido-www'", "Lectura pública permitida; aloja el sitio web estático institucional."),
          E("Prueba técnica", "Revisión del auditor", "Revisó los 412 objetos: todos son HTML, CSS, JS e imágenes; ningún dato de clientes."),
          E("Configuración", "Block Public Access", "Activado a nivel de cuenta para los otros 23 buckets; este tiene una excepción documentada y aprobada.")
        ], "Un bucket público suele ser hallazgo, pero aquí es intencional, está documentado y solo contiene contenido ya público. Cumple."),

        falla("Rotación de llaves", "ISO 27001 A.5.17 Información de autenticación / COBIT DSS05.04", [
          E("Registro", "Reporte IAM", "9 access keys activas; 3 con más de 400 días sin rotar."),
          E("Configuración", "IAM", "Una de las llaves antiguas pertenece al usuario del pipeline de CI/CD y tiene permisos de PowerUser."),
          E("Registro", "Escaneo de repositorios", "Esa llave aparece en el historial de un repositorio privado (commit de hace 14 meses) al que acceden 12 personas."),
          E("Entrevista", "Jefe de DevOps", "«Después del incidente rotamos la que se filtró, pero no revisamos las demás.»")
        ], 4, 4,
        "Probabilidad 4: llave antigua, conocida por muchas personas y con un antecedente de filtración en la empresa. Impacto 4: PowerUser permite alterar casi todos los recursos, salvo IAM.",
        "Rotar de inmediato las 3 llaves, reemplazar las llaves estáticas del pipeline por roles temporales (OIDC), eliminar los secretos del historial de Git y programar una rotación máxima de 90 días con alerta.",
        "Tras el incidente se corrigió el síntoma (la llave filtrada) pero no la causa: no hay un proceso de rotación."),

        cumple("Cuenta raíz", "ISO 27001 A.8.2 Derechos de acceso privilegiados", [
          E("Configuración", "Cuenta raíz", "MFA con llave de hardware y sin access keys."),
          E("Registro", "CloudTrail", "Último uso hace 14 meses, durante la creación de la cuenta."),
          E("Configuración", "Alarma de CloudWatch", "Notifica al equipo de seguridad ante cualquier inicio de sesión raíz."),
          E("Entrevista", "CTO", "«La llave física está en la caja fuerte de la oficina; solo el jefe de DevOps y yo tenemos acceso.»")
        ], "Es la práctica recomendada: cuenta raíz con MFA de hardware, sin uso diario, con alarma y doble custodia. Cumple."),

        falla("Aislamiento de entornos", "ISO 27001 A.8.31 Separación de entornos / ISO 27017 CLD.9.5.1", [
          E("Configuración", "Terraform", "Una sola VPC ('main') para desarrollo y producción; las subredes se distinguen solo por etiquetas."),
          E("Configuración", "IAM", "El rol 'dev-readwrite' puede leer y escribir el bucket de datos de producción y conectarse a la base de producción."),
          E("Entrevista", "Desarrolladora senior", "«Para reproducir errores copiamos datos reales de producción a desarrollo; es más rápido que generar datos de prueba.»")
        ], 3, 5,
        "Los desarrolladores trabajan con datos reales de pagos fuera de producción y con permisos de escritura. Un error o una credencial comprometida en desarrollo afecta producción (impacto 5).",
        "Separar producción en una cuenta o VPC propia, retirar los permisos de desarrollo sobre recursos de producción, prohibir datos reales en desarrollo y usar datos anonimizados o sintéticos.",
        "El problema no es solo técnico (una VPC compartida): es también una práctica de trabajo que mueve datos de pagos a entornos menos protegidos."),

        falla("Acceso de terceros", "ISO 27001 A.5.19 Seguridad en las relaciones con proveedores / A.5.18 Derechos de acceso / COBIT APO10", [
          E("Configuración", "IAM", "El rol 'ConsultoraX-Admin' confía en la cuenta AWS de la consultora y tiene PowerUser sobre producción."),
          E("Documento", "Acta de cierre del contrato", "El contrato con la consultora terminó hace 6 meses."),
          E("Registro", "CloudTrail", "El rol fue asumido por última vez hace 41 días, desde una IP que la empresa no reconoce."),
          E("Entrevista", "Jefe de DevOps", "«Se nos olvidó quitarlo.»")
        ], 4, 4,
        "El acceso se usó 5 meses después de terminar el contrato y desde una IP desconocida (probabilidad 4). Impacto 4: PowerUser sobre producción.",
        "Deshabilitar el rol de inmediato, investigar las acciones realizadas en los últimos 41 días de uso, notificar a la consultora y crear un procedimiento de alta y baja de accesos de terceros con fecha de expiración.",
        "Un uso posterior al fin del contrato desde una IP desconocida convierte un descuido administrativo en un posible incidente.")
      ]
    },

    // ═══════════════════════════════════════════════════════════════════
    // 3. ERP — COBIT 2019 + SOX
    // ═══════════════════════════════════════════════════════════════════
    {
      id: "erp",
      nombre: "ERP corporativo (Finanzas)",
      norma: "COBIT 2019 (BAI/DSS/APO/MEA) + SOX 404",
      descripcion: "ERP de una distribuidora tras una reorganización de Cuentas por Pagar y con auditoría externa del grupo en seis semanas.",
      contexto: {
        organizacion: "Distribuidora Istmo S.A. (empresa ficticia, subsidiaria de un grupo que cotiza en bolsa)",
        situacion: [
          "Distribuidora Istmo vende productos de consumo a más de 2,500 clientes y tiene 320 empleados. Al pertenecer a un grupo que cotiza en bolsa, sus procesos financieros están sujetos a controles internos tipo SOX (sección 404).",
          "El ERP corporativo cubre compras, cuentas por pagar, tesorería y nómina. Está en servidores propios, con un módulo de reportes alojado en un proveedor cloud. TI tiene 5 personas.",
          "Hace seis meses cambió el director financiero y se reorganizó Cuentas por Pagar, que perdió dos puestos. La auditoría externa del grupo llega en seis semanas."
        ],
        antecedentes: [
          "La auditoría interna del año pasado dejó abierta la observación «riesgo de segregación de funciones en Cuentas por Pagar».",
          "Hace dos meses se pagó dos veces una factura de un proveedor por USD 9,800; se recuperó con una nota de crédito."
        ],
        alcance: "Controles generales de TI y de aplicación del ERP en los procesos de cuentas por pagar, tesorería y nómina.",
        fueraDeAlcance: "Los módulos de ventas e inventario y el comercio electrónico.",
        criterio: "COBIT 2019 permite evaluar la gobernanza y la operación de TI (cambios, accesos, proveedores, monitoreo), y SOX 404 es el requisito del grupo sobre los sistemas que afectan la información financiera.",
        personas: [
          { cargo: "Jefe de TI", detalle: "Responsable de infraestructura y del ERP." },
          { cargo: "Administrador de base de datos (DBA)", detalle: "Aplica cambios en producción." },
          { cargo: "Supervisora de Cuentas por Pagar", detalle: "Aprueba y revisa pagos." },
          { cargo: "Gerente de Control Interno", detalle: "Revisa los registros del ERP; sin acceso de administración." },
          { cargo: "Analista de Recursos Humanos", detalle: "Notifica altas y bajas de personal." }
        ]
      },
      controles: [
        falla("Segregación de funciones", "ISO 27001 A.5.3 Segregación de funciones / COBIT DSS05.04 / SOX 404", [
          E("Registro", "Matriz de roles del ERP", "El usuario mrojas (analista de Cuentas por Pagar) tiene a la vez los roles AP_PROVEEDOR_CREAR y AP_PAGO_APROBAR."),
          E("Registro", "Transacciones de los últimos 6 meses", "mrojas creó 3 proveedores y aprobó pagos a 2 de ellos por un total de USD 48,200."),
          E("Documento", "Soporte de los 2 pagos", "Tienen factura y orden de compra, y fueron revisados después por la supervisora."),
          E("Entrevista", "Supervisora de Cuentas por Pagar", "«Cuando se redujo el equipo le dimos el rol de aprobación temporal para cubrir vacaciones. Nadie lo retiró.»")
        ], 4, 5,
        "La revisión posterior es un control compensatorio parcial, pero no impide que el mismo usuario cree proveedores y apruebe sus pagos (probabilidad 4: ya ocurrió dos veces). Impacto 5: es el esquema clásico de fraude con proveedores ficticios.",
        "Retirar de inmediato el rol de aprobación de pagos a mrojas, definir una matriz de roles incompatibles con bloqueo en el ERP, revisar con un tercero los 2 pagos y asignar aprobaciones temporales con vencimiento automático.",
        "Que los pagos tengan soporte no corrige el diseño: el conflicto de funciones existe aunque hasta ahora no haya evidencia de fraude."),

        cumple("Cifrado de nómina", "ISO 27001 A.8.24 Uso de criptografía / A.8.3 Restricción de acceso / COBIT DSS05", [
          E("Configuración", "Base de datos de nómina", "Cifrado transparente (TDE) activo; las claves están en un módulo HSM con acceso dual."),
          E("Observación", "Servidor de archivos de RR. HH.", "Hay exportaciones de nómina en Excel en una carpeta de red."),
          E("Configuración", "Permisos de la carpeta", "Accesible solo al grupo RRHH-NOM (3 personas), con unidad cifrada con BitLocker y auditoría de acceso activa."),
          E("Registro", "Accesos del último trimestre", "Corresponden a las 3 personas autorizadas y a las fechas de cierre de nómina.")
        ], "Los Excel en una carpeta de red parecen un riesgo, pero están restringidos, cifrados y auditados, y los accesos son coherentes. Cumple."),

        falla("Gestión de cambios", "COBIT BAI06 Gestión de cambios de TI / ISO 27001 A.8.32 / SOX 404", [
          E("Documento", "Procedimiento de cambios", "Todo cambio en producción requiere ticket y aprobación del comité (CAB). Los cambios de emergencia pueden hacerse primero y regularizarse en máximo 48 horas."),
          E("Registro", "Muestra del auditor (25 cambios del trimestre)", "7 no tenían ticket aprobado antes del despliegue: 3 se regularizaron dentro de 48 horas y 4 no tienen ticket."),
          E("Registro", "Detalle de los 4 sin ticket", "Todos modificaron el módulo de pagos."),
          E("Entrevista", "DBA", "«Los urgentes se hacen y luego se ve. A veces se nos pasa el ticket.»")
        ], 4, 4,
        "Los 3 regularizados son aceptables según el procedimiento de emergencia; los 4 sin ticket no. Tocaron el módulo de pagos, crítico para la información financiera (impacto 4).",
        "Exigir ticket para todo cambio (incluidos los de emergencia) con cierre en 48 horas, bloquear el paso a producción sin ticket vinculado y revisar retrospectivamente los 4 cambios al módulo de pagos.",
        "El auditor debe separar las excepciones permitidas (3) de las que no lo son (4): marcar los 7 como falla o ninguno sería impreciso."),

        cumple("Revisión de logs", "COBIT MEA01 Monitoreo del desempeño y la conformidad / ISO 27001 A.8.15 Registro de eventos", [
          E("Configuración", "ERP y base de datos", "Registro de auditoría activo, enviado a un servidor de logs separado."),
          E("Documento", "Actas mensuales", "Revisión firmada por el Gerente de Control Interno, que no tiene acceso de administración al ERP."),
          E("Documento", "Acta de enero", "No está firmada de forma individual: el acta de febrero consolida ambos meses porque el gerente estuvo de licencia, como permite el procedimiento."),
          E("Registro", "Observaciones de las revisiones", "Tienen seguimiento y cierre documentados.")
        ], "El acta de enero sin firma parece una omisión, pero el procedimiento permite consolidarla y se hizo. La revisión es independiente y con seguimiento. Cumple."),

        falla("Bajas de personal", "ISO 27001 A.5.18 Derechos de acceso / A.6.5 Responsabilidades tras la terminación / COBIT DSS05.04", [
          E("Registro", "Comparación RR. HH. contra ERP", "12 cuentas de personas desvinculadas siguen activas."),
          E("Registro", "Inicios de sesión", "3 de esas cuentas iniciaron sesión después de su fecha de baja; uno de los accesos fue a las 23:40 por VPN."),
          E("Documento", "Procedimiento de bajas", "Establece 24 horas para deshabilitar los accesos tras la baja."),
          E("Entrevista", "Analista de Recursos Humanos", "«Avisamos a TI por correo cuando alguien se va; no hay formulario ni confirmación.»")
        ], 5, 4,
        "Probabilidad 5: ya hubo accesos reales posteriores a la baja. Impacto 4: son cuentas con acceso a un sistema financiero, aunque no todas con privilegios altos.",
        "Deshabilitar de inmediato las 12 cuentas, investigar los 3 accesos posteriores a la baja (en especial el de VPN), crear un flujo formal RR. HH. a TI con confirmación y revisar las cuentas cada trimestre.",
        "No es solo un descuido: hay accesos posteriores a la baja y un proceso basado en correos sin confirmación."),

        cumple("Política de contraseñas", "ISO 27001 A.5.17 / A.8.5 Autenticación segura / COBIT DSS05.04", [
          E("Configuración", "GPO y ERP", "Mínimo 12 caracteres, bloqueo tras 5 intentos fallidos y historial de 12 contraseñas."),
          E("Configuración", "VPN y roles financieros", "MFA exigido para accesos remotos y para roles financieros."),
          E("Entrevista", "Usuarios de Finanzas", "Varios comentan que las reglas son «muy estrictas».")
        ], "Las quejas de los usuarios no son evidencia de una falla; la configuración y la prueba de bloqueo confirman que se aplica la política. Cumple."),

        falla("Proveedores externos", "COBIT APO10 Gestión de proveedores / ISO 27001 A.5.19 / A.5.22 Seguimiento de servicios de proveedores", [
          E("Documento", "Contrato con el proveedor del módulo de reportes (2023)", "No incluye derecho de auditoría ni acuerdos de nivel de servicio de seguridad."),
          E("Documento", "Informe SOC 2 Tipo II del proveedor", "Cubre un período que terminó hace 14 meses; no hay carta de continuidad (bridge letter)."),
          E("Observación", "Módulo de reportes", "Aloja reportes con datos de pagos a proveedores."),
          E("Entrevista", "Jefe de TI", "«Confiamos en el proveedor porque es grande; nunca pedimos un informe actualizado.»")
        ], 3, 4,
        "Sin cláusula de auditoría y con un informe vencido, la empresa no puede verificar al proveedor (probabilidad 3). Impacto 4: aloja datos de pagos relevantes para la información financiera.",
        "Renegociar el contrato con derecho de auditoría y SLA de seguridad, solicitar el informe SOC 2 vigente y una carta de continuidad, y establecer una revisión anual del proveedor.",
        "Un informe SOC 2 de hace 14 meses podría haber compensado la falta de cláusula; vencido, no lo hace."),

        cumple("Accesos de emergencia", "COBIT DSS05.04 / ISO 27001 A.8.2 Derechos de acceso privilegiados / SOX 404", [
          E("Configuración", "Cuenta FF_ERP01", "Tiene privilegios altos sobre el ERP."),
          E("Registro", "Usos del año", "4 usos; los 4 con ticket, aprobación del gerente y sesión grabada."),
          E("Documento", "Revisión posterior", "Cada uso fue revisado y firmado por Control Interno en menos de 5 días."),
          E("Observación", "Custodia de la contraseña", "Está en una caja fuerte digital con doble custodia y se cambia después de cada uso.")
        ], "Los privilegios altos están compensados por aprobación previa, grabación, revisión independiente y custodia doble. Cumple."),

        falla("Conciliación de pagos", "SOX 404 / COBIT MEA02 Sistema de control interno", [
          E("Documento", "Conciliaciones bancarias de 12 meses", "Se hacen mensualmente para las 12 cuentas."),
          E("Documento", "Conciliación de abril, cuenta operativa", "No tiene la firma del supervisor."),
          E("Registro", "Partidas conciliatorias", "Hay 6 partidas de más de 90 días por USD 7,300 sin explicación documentada."),
          E("Entrevista", "Tesorero", "«Esa la firmó mi jefe en papel, pero no la encuentro.»")
        ], 3, 3,
        "Probabilidad 3: ya hay partidas antiguas sin explicar. Impacto 3: el monto es bajo para el grupo, pero rompe la cadena de control financiero.",
        "Obtener o repetir la firma de abril, investigar y documentar las 6 partidas antiguas y exigir firma electrónica con fecha en las conciliaciones.",
        "Hallazgo de riesgo medio: sin firma no hay evidencia de revisión, y las partidas antiguas sugieren que la revisión no fue efectiva."),

        cumple("Integridad de pagos al banco", "COBIT DSS05 / ISO 27001 A.8.24 / A.5.3 Segregación de funciones", [
          E("Configuración", "Interfaz ERP-banco", "El archivo de pagos se firma digitalmente y se transmite por SFTP con autenticación por llave."),
          E("Documento", "Prueba anual", "Se modificó un archivo de prueba y el banco lo rechazó por firma inválida (acta de este año)."),
          E("Observación", "Proceso de pago", "Una persona genera el archivo y otra distinta lo libera en el portal del banco."),
          E("Registro", "Conciliación diaria de totales", "Sin diferencias entre lo enviado y lo confirmado por el banco en 90 días.")
        ], "La integridad del archivo, la segregación en la liberación y la conciliación diaria funcionan. Este control cumple aunque otro control del mismo proceso (segregación en el ERP) falle.")
      ]
    }
  ];

  global.ESCENARIOS = ESCENARIOS;
})(typeof window !== "undefined" ? window : globalThis);
