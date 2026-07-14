# Funcionalidades de AcademiX por Rol de Usuario

AcademiX es un sistema integral de gestión académica y planeación horaria. El sistema cuenta con cuatro roles de usuario claramente definidos, cada uno con permisos y herramientas específicas adaptadas a sus necesidades.

---

## 1. Administrador (Admin)
Es el rol con mayores privilegios del sistema, encargado de la planeación estratégica, configuración de la plataforma, y el control de la base de usuarios y académica.

### 👥 Gestión de Usuarios
- **Registro de Usuarios**: Creación manual de usuarios y asignación de roles.
- **Importación Masiva de Estudiantes**: Registro ágil mediante la importación de archivos Excel en español con validación estricta de nombres y apellidos.
- **Descarga de Plantilla**: Generación dinámica de la plantilla oficial de importación en formato Excel.
- **Aviso de Privacidad Obligatorio**: Configuración para que todo estudiante nuevo (manual o por Excel) inicie con el consentimiento de datos deshabilitado, forzando su lectura y aprobación al primer ingreso.
- **Acciones Directas sobre Cuentas**:
  - Banear y desbanear cuentas.
  - Restablecer contraseñas de seguridad (por defecto al número de documento).
  - Eliminar y depurar usuarios del sistema de forma individual o masiva.
- **Búsqueda y Filtrado Avanzado**:
  - Buscador de texto predictivo por nombre o correo electrónico.
  - Filtro por Programa Académico.
  - Filtro por Grupo de Formación.
  - Filtro por Etapa/Categoría del Grupo (Etapa Lectiva, Etapa Productiva, Egresados).
- **Gestión de Novedades Especiales**:
  - Registro de novedades y anotaciones de seguimiento a estudiantes.
  - Selector de color de severidad de novedad (Azul, Rojo, Naranja, Amarillo, Verde, Púrpura, Gris) para visualización transversal en el sistema.
  - Envío automático de notificaciones Push instantáneas al estudiante en su navegador cuando se registra, actualiza o retira una novedad.

### 🏫 Gestión Académica
- **Programas**: Crear y editar Programas Académicos de formación.
- **Grupos de Formación**:
  - Crear y editar grupos asociados a un programa.
  - Definición de fechas de inicio y fin, así como jornadas horarias.
  - Clasificación de grupos en 3 categorías/etapas: **Etapa Lectiva**, **Etapa Productiva** y **Egresados**, organizados en pestañas internas interactivas.
  - Vinculación de estudiantes al grupo.
- **Asignación de Instructores**: Vincular y desvincular profesores a programas académicos.
- **Ambientes de Formación**: Configurar los salones de clase físicos y virtuales con capacidades límite de aforo y listado de recursos tecnológicos disponibles.

### 📅 Programación y Control de Horarios
- **Planificador Interactivo (Desktop-Only)**:
  - Interfaz drag-and-drop interactiva para programar clases arrastrando asignaturas a la grilla semanal de profesores y ambientes de formación.
  - Bloqueo visual responsivo en dispositivos móviles que sugiere el uso de computadoras de escritorio debido a la complejidad de la grilla.
  - Validación automatizada en tiempo real de disponibilidad horaria del instructor y capacidad/aforo de los ambientes físicos.
  - Exclusividad para Etapa Lectiva: Únicamente los grupos marcados en la categoría **Etapa Lectiva** son elegibles para la planeación horaria del establecimiento.
  - Estado de Publicación: Posibilidad de guardar los horarios en estado de "Borrador" o "Publicado" para visualización de la comunidad (definiendo el rango de fechas de vigencia del periodo).
- **Estadísticas y Analíticas**:
  - Visualización del consolidado de horas planificadas por docente.
  - Estado de cumplimiento de las horas del periodo académico.

---

## 2. Observador (Supervisor / Directiva)
Es un rol de auditoría y acompañamiento directivo. Tiene permisos de lectura de la gestión institucional pero con restricciones de edición.

### 🔍 Visualización y Seguimiento
- **Gestión de Usuarios (Solo Lectura)**: Consulta de las fichas de estudiantes e instructores asignados a sus programas de supervisión.
- **Visualización de Novedades**: Monitoreo de los llamados de atención y las insignias de color de novedades especiales de los alumnos.
- **Consulta de Horarios**: Visualización del planificador y estado de publicación de horarios sin permisos de modificación.
- **Estadísticas e Informes**: Acceso a analíticas y tableros estadísticos consolidados del rendimiento del grupo académico.

---

## 3. Instructor / Profesor (Teacher)
Este rol está enfocado en la interacción directa con el estudiante, la toma de asistencia, la evaluación de competencias, y el cargue de material educativo.

### 📝 Registro y Disponibilidad
- **Disponibilidad Semanal**: Configuración de los días y bloques horarios en los que el docente está disponible para impartir formación, información utilizada por el administrador en la planeación horaria.

### 📊 Gestión de Calificaciones
- **Creación de Actividades**: Publicación de tareas y evaluaciones clasificadas por categorías configurables.
- **Ponderaciones**: Definición del porcentaje de peso de cada categoría sobre la nota final de la materia.
- **Evaluación Directa y Masiva**:
  - Panel interactivo para registrar notas numéricas.
  - Herramienta de asignación rápida o masiva de calificaciones uniformes para acelerar el proceso.
- **Exportación en PDF**: Generación de reportes limpios y listos para imprimir con el consolidado de calificaciones del grupo de formación.

### 👥 Herramientas de Dinámica de Clase
- **Ruleta Aleatoria**: Herramienta interactiva para seleccionar un estudiante al azar durante las clases para fomentar la participación.
- **Generador de Grupos**: Algoritmo para armar subgrupos de trabajo aleatorios de tamaño uniforme de forma automática.

### 📂 Compartir Contenido
- **Recursos Compartidos**: Carga de enlaces de documentación digital, diapositivas y guías de aprendizaje segmentadas por grupos para acceso rápido de los estudiantes.

### ⏱️ Control de Asistencia y Alertas
- **Toma de Asistencia**: Registro diario detallado del estado de asistencia por estudiante:
  - *Presente*
  - *Falla Injustificada*
  - *Falla Justificada*
  - *Tardanza*
  - *Retiro Temprano*
- **Visualización de Novedades**: Grillas de asistencia y calificaciones con el indicador de color de novedad especial del alumno en tiempo real con Tooltip informativo.

---

## 4. Estudiante (Student)
El rol enfocado en la consulta de su avance académico, asistencia, descarga de recursos y visualización de su horario de formación.

### 🔒 Consentimiento de Datos
- **Aviso de Privacidad**: Modal de obligatoria aceptación en el primer inicio de sesión que detalla el Aviso de Privacidad simplificado antes de permitir el acceso a los módulos principales.

### 📅 Horario Escolar
- **Consulta de Horarios**: Grilla interactiva del horario semanal asignado a su grupo de formación con el detalle de la asignatura, el instructor a cargo y el ambiente físico.

### 📈 Avance Académico y Asistencia
- **Boletín de Calificaciones**: Consulta del detalle de sus notas obtenidas por actividad y el porcentaje acumulado en tiempo real.
- **Historial de Asistencia**: Visualización de sus faltas y retardos por fecha, con la opción de cargar justificaciones de inasistencia.

### 📂 Recursos de Aprendizaje
- **Descargas**: Acceso al listado de enlaces de documentación y guías de estudio compartidas por sus instructores de formación.

### 🔔 Alertas y Novedades Especiales
- **Banner de Novedad**: Barra superior informativa fija (*sticky*) con animación *pulse* y colores correspondientes en caso de tener una novedad activa registrada por el administrador.
- **Notificaciones Push**: Recepción de avisos instantáneos en tiempo real sobre el estado de sus novedades académicas.
