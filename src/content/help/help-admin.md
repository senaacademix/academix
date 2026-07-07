# 📚 Guía Completa de Ayuda - Administrador

Bienvenido al panel de administración de **AcademiX**. Esta guía cubre todas las funcionalidades disponibles para gestionar la plataforma y la planificación de horarios académicos.

---

## ⚙️ Flujo Recomendado para Configurar Horarios

Para una planificación exitosa, sigue este orden de pasos:

```text
  1. Crear Programas de Formación (con título y configuración de horario)
               │
               ▼
  2. Registrar Periodos y Grupos/Fichas
               │
               ▼
  3. Asignar Docentes al Programa
               │
               ▼
  4. Configurar Disponibilidad y Materias de Docentes
               │
               ▼
  5. Registrar Ambientes Físicos
               │
               ▼
  6. Programar Horarios en el Tablero (Arrastrar y Soltar)
               │
               ▼
  7. Registrar Eventos y Festivos
               │
               ▼
  8. Publicar el Horario al Público
```

---

## 📋 Administración Académica

### Programas de Formación

Un **Programa de Formación** es la entidad principal del sistema. Cada programa tiene su propia configuración independiente de horario.

**Para crear un programa:**
1. Entra a **Administración Académica** en el menú lateral.
2. Haz clic en **Nuevo Programa**.
3. Completa los campos:
   - **Nombre del Programa** (ej: Análisis y Desarrollo de Software)
   - **Descripción** (opcional)
   - **Fecha de Inicio** y **Fecha de Fin** del periodo lectivo — estas fechas determinan el rango del calendario del programa.
   - **Título del Horario** — nombre que aparecerá en el planificador de horarios (ej: Horario Académico 2026-1).
   - **Límite Legal de Horas Semanales por Docente** — número máximo de horas semanales permitidas; el sistema alertará si un docente supera este límite.

> [!IMPORTANT]
> Cada programa tiene su propia configuración de horario (título, fechas y límite de horas). Al seleccionar un programa en el planificador, estas configuraciones se cargan automáticamente.

> [!NOTE]
> Las fechas del programa **solo son referencia para el planificador**. Los eventos y festivos no están restringidos por estas fechas y se pueden registrar libremente en cualquier fecha.

---

### Periodos Académicos

Los **Periodos** organizan el contenido dentro de un programa (ej: Semestre I, Trimestre 2).

1. Dentro del programa, haz clic en **+ Agregar Periodo**.
2. Asigna un nombre y descripción al periodo.
3. Los periodos se pueden ordenar con las flechas de navegación (`←` `→`) en las pestañas.

---

### Grupos / Fichas

Los **Grupos** son las fichas de aprendices. Cada grupo pertenece a un programa.

1. Dentro del programa, haz clic en **+ Crear Grupo**.
2. Define el nombre, fechas del grupo y ambiente predeterminado (opcional).
3. Puedes asignar estudiantes al grupo de forma individual o mediante carga masiva por archivo Excel.

---

### Materias / Cursos

Las **Materias** son las asignaturas que se programan en el horario.

1. Dentro de un grupo o periodo, haz clic en **+ Agregar Materia**.
2. Define el nombre, descripción y horas semanales de la materia.
3. Asigna un docente a cada materia.

---

## 🗓️ Programación de Horarios

### Acceso al Planificador

1. Haz clic en **Programación de Horarios** en el menú lateral.
2. Selecciona el **Programa de Formación** en la barra lateral izquierda.
3. Selecciona el **Grupo/Ficha** que deseas programar.

---

### Configuración del Horario por Programa

Para ajustar la configuración del programa activo (título, fechas, límite de horas):

1. En la barra de herramientas superior, haz clic en el ícono ⚙️ **Configuración**.
2. Modifica los campos necesarios:
   - **Título del Horario**
   - **Fecha de Inicio** y **Fecha de Fin** del periodo
   - **Límite Legal de Horas Semanales por Docente**
3. Haz clic en **Guardar Configuración**.

> [!NOTE]
> Esta configuración es **exclusiva por programa de formación**. Los cambios en un programa no afectan a otros programas.

---

### Programar Clases (Arrastrar y Soltar)

1. En el panel derecho verás las **materias disponibles** del grupo seleccionado.
2. **Arrastra** una materia y **suéltala** en el bloque de hora y día deseado en la cuadrícula.
3. El sistema valida automáticamente:
   - ✅ Disponibilidad del docente
   - ✅ Disponibilidad del ambiente físico
   - ✅ Conflictos de horario con otros grupos
   - ✅ Límite de horas semanales del docente
4. Las alertas aparecerán en rojo si hay conflictos.

---

### Guardar y Publicar

- Los cambios se guardan en **borrador**. Un contador en la barra superior muestra los cambios pendientes.
- Haz clic en **Guardar** (botón verde) para consolidar el borrador.
- Para publicar, haz clic en el botón **Borrador 🔒** → confirma → el horario pasa a **Publicado 🌐** y es visible para estudiantes y docentes.

---

### Vistas del Planificador

Desde la barra de herramientas superior puedes acceder a:

| Botón | Función |
|---|---|
| 👥 Vista Docentes | Ver disponibilidad y materias habilitadas de cada docente |
| 🏢 Vista Ambientes | Gestionar aulas y laboratorios |
| 📋 Periodos | Actualizar asignaciones de periodos por grupo |
| 📊 Analítica | Estadísticas de horas por docente y programa |
| ⚙️ Configuración | Ajustar título, fechas y límite de horas del programa activo |
| 📥 Exportar Excel | Descargar el horario en formato de hoja de cálculo |

---

## 📣 Eventos y Festivos

Los eventos son **globales** para todos los programas y son visibles en el calendario de docentes y estudiantes.

### Registrar un Evento

1. Entra a **Eventos y Festivos** en el menú lateral.
2. Haz clic en la fecha deseada en el calendario (o usa el selector de fecha en el panel izquierdo).
3. Selecciona el tipo:
   - **Día Festivo (Bloqueo Total):** Marca el día como inhábil. Aparece en rojo en todos los calendarios.
   - **Evento Institucional:** Permite indicar título, descripción, hora de inicio/fin y enlace externo.
4. Haz clic en **Guardar Registro**.

### Navegar el Calendario de Eventos

- Usa `‹` `›` para navegar mes a mes.
- Usa **← Evento anterior** / **Evento siguiente →** para saltar directamente al mes donde está el evento más cercano.

### Eliminar Eventos Anteriores a una Fecha

Para limpiar eventos obsoletos del pasado:

1. Haz clic en el botón rojo **Eliminar desde fecha** (esquina superior derecha).
2. Selecciona la fecha de corte — el sistema te mostrará cuántos eventos serán eliminados.
3. Confirma. Se eliminarán todos los eventos cuya fecha sea igual o anterior a la fecha seleccionada.

> [!CAUTION]
> Esta acción es **irreversible**. Verifica el conteo de eventos afectados antes de confirmar.

---

## 👥 Gestión de Docentes

### Asignar Docente a un Programa

1. En **Administración Académica**, dentro del programa, entra a la pestaña **Docentes**.
2. Haz clic en **Asignar Docente** y selecciona el usuario con rol de docente.

### Configurar Disponibilidad del Docente

1. En **Programación de Horarios**, haz clic en el ícono 👥 **Vista Docentes**.
2. Haz clic en **Disponibilidad** junto al docente.
3. En la interfaz a pantalla completa, selecciona los días y franjas horarias disponibles.
4. Haz clic en **Guardar Disponibilidad**.

### Habilitar Materias por Docente

1. En **Vista Docentes**, haz clic en **Materias** junto al docente.
2. Marca las materias que el docente está habilitado para impartir.
3. Guarda los cambios.

> [!NOTE]
> El sistema usa esta configuración para prevenir asignaciones de docentes a materias no calificadas o en horarios en los que no están disponibles.

---

## 🏢 Gestión de Ambientes Físicos

1. En **Programación de Horarios**, haz clic en el ícono 🏢 **Vista Ambientes**.
2. Agrega los ambientes con: nombre, capacidad, ubicación, recursos disponibles y descripción.
3. Al programar horarios, el sistema bloquea automáticamente el uso simultáneo de un ambiente para grupos diferentes.

---

## 👤 Gestión de Usuarios

### Ver y Administrar Usuarios

1. Entra a **Usuarios** en el menú lateral.
2. Verás la tabla completa de usuarios: nombre, email, rol, y estado.

### Crear Docentes Manualmente

1. En la sección de Usuarios, haz clic en **Crear Usuario**.
2. Ingresa nombre, email y asigna el rol **Docente**.

### Registro Masivo por Excel

Puedes importar estudiantes o docentes en bloque mediante una plantilla Excel:
1. Descarga la plantilla desde el botón de **Carga Masiva**.
2. Llena el archivo con los datos requeridos.
3. Sube el archivo. El sistema creará los usuarios automáticamente.

> [!IMPORTANT]
> Los estudiantes pueden registrarse de manera autónoma. Solo debes crear manualmente a los docentes y administradores adicionales.

---

## ⚙️ Configuración General del Sistema

En **Configuración** del menú lateral puedes ajustar:

| Configuración | Descripción |
|---|---|
| **Límite Diario de Accesos** | Número máximo de ingresos diarios permitidos para estudiantes |
| **Tema Visual** | Modo claro, oscuro o automático (aplica a todos los roles) |
| **Identidad Visual** | Logo, colores e identidad de la institución |

---

## 📊 Analítica de Horarios

Accede al panel de **Analítica** (ícono 📊 en la barra del planificador) para visualizar:

- Horas semanales asignadas por docente
- Comparativo del límite legal de horas
- Distribución de carga por programa
- Ocupación de ambientes físicos

---

## 📋 Supervisión de Asistencia (Vista Admin)

Como administrador puedes consultar la asistencia de cualquier grupo en **modo solo lectura** con exportación incluida.

### Cómo acceder

1. Ve a **Administración Académica** en el menú lateral.
2. Selecciona el programa y entra a la pestaña **Grupos y Estudiantes**.
3. Haz clic en **Gestionar** junto al grupo que deseas consultar.
4. En el panel de gestión del grupo verás la sección **Asistencia** con dos vistas disponibles.

### Planilla
Matriz de asistencia histórica con Estudiantes en filas y Fechas en columnas.
- **P** = Presente · **F** = Falta · **T** = Tarde
- Puedes filtrar por materia usando el selector en la barra de herramientas.

### Historial
Vista agrupada por estudiante con el detalle completo de cada novedad:
- Fecha, Tipo (Falta/Llegada Tarde), Hora de llegada, Justificación.
- Ordenado de mayor a menor cantidad de incidencias.

### Exportar
Desde el botón **"Exportar"** puedes descargar:
- **Excel (.xlsx)** para editar o compartir en hoja de cálculo.
- **PDF** en orientación horizontal con tabla formateada.

> [!NOTE]
> El administrador tiene acceso de **solo lectura** en las vistas de Planilla e Historial. El registro y modificación de asistencia es responsabilidad exclusiva del **Docente**.

> [!NOTE]
> **Sobre las justificaciones:** Solo el **estudiante** puede subir su justificación. El **profesor y el administrador** pueden eliminarla para que el estudiante la suba nuevamente.

