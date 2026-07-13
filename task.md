# Tareas: Registro e Importación de Estudiantes

- [x] Modificar `AcademicManagement.tsx` para importar `Download` de `lucide-react`.
- [x] Agregar la función `handleDownloadTemplate` en `AcademicManagement.tsx` para generar la plantilla Excel.
- [x] Actualizar `handleExcelFileChange` en `AcademicManagement.tsx` con los nombres de columnas requeridas en español e implementar validación estricta de nombres y apellidos.
- [x] Renombrar los campos del formulario manual en `AcademicManagement.tsx` para que coincidan con las columnas especificadas.
- [x] Añadir el botón "Descargar Plantilla" y actualizar el bloque informativo de columnas esperadas en el JSX de la pestaña "Importar Excel".
- [x] Verificar que compile y funcione correctamente.

# Tareas: Novedades de Estudiantes con Selector de Color y Vista de Alumno

- [x] Añadir el campo opcional `novedad` al modelo `Profile` en `prisma/schema.prisma`.
- [x] Añadir el campo opcional `novedadColor` al modelo `Profile` en `prisma/schema.prisma`.
- [x] Sincronizar el esquema de la base de datos con `prisma db push`.
- [x] Crear e integrar la Server Action `updateStudentNovedadAction` para actualizar la novedad y el color de un estudiante.
- [x] Crear el componente visual reutilizable `StudentNovedadBadge` con tooltip y estilos de color dinámicos.
- [x] Agregar la gestión de novedades con selector interactivo de 7 colores en la administración de usuarios (`UserManagement.tsx`).
- [x] Integrar `StudentNovedadBadge` pasando el prop de color en las vistas clave del Administrador (`UserManagement.tsx`, `AcademicManagement.tsx`).
- [x] Integrar `StudentNovedadBadge` pasando el prop de color en las vistas clave del Profesor (`GroupManager.tsx`, `GradeManagerPanel.tsx`, `StudentManager.tsx`).
- [x] Agregar la consulta de novedades y la renderización constante del banner dinámico en la parte superior del layout del estudiante ([layout.tsx](file:///c:/Users/Jhon/Documents/Datos/Informacion/2026/Proyectos/Academix/src/app/dashboard/layout.tsx)).
- [x] Hacer que la barra superior de novedad del estudiante sea fija (`sticky top-0 z-50`) al hacer scroll y desplazar el header del panel acorde a la presencia del banner.
- [x] Enviar notificaciones push a través de la función `sendPushNotification` al registrar, actualizar o remover la novedad del estudiante.
- [x] Modificar la creación de estudiantes (manual, por Excel, y en la gestión de usuarios) para deshabilitar por defecto el tratamiento de datos (`dataProcessingConsent: false` y `dataProcessingConsentDate: null`), obligándolos a aceptarlo en su primer ingreso de sesión.
- [x] Verificar que el proyecto compile y funcione correctamente.

# Tareas: Categorización de Grupos Académicos y Adaptabilidad

- [x] Añadir el campo `categoria String @default("LECTIVA")` al modelo `Group` en `prisma/schema.prisma`.
- [x] Sincronizar la base de datos con `prisma db push` y regenerar el cliente Prisma.
- [x] Modificar las Server Actions `createGroupAction` y `updateGroupAction` para recibir y guardar la propiedad `categoria` en la base de datos.
- [x] Añadir el selector de categoría (Etapa Lectiva, Etapa Productiva y Egresados) en el modal de creación y edición de grupos en `AcademicManagement.tsx`.
- [x] Renderizar insignias de colores personalizadas para las categorías de grupos en la tabla de grupos en `AcademicManagement.tsx`.
- [x] Filtrar los grupos del programa en `/dashboard/admin/schedule` para que sólo los grupos de categoría `"LECTIVA"` aparezcan en la grilla y herramientas de programación de horarios.
- [x] Separar la vista tabular de grupos en pestañas internas por categorías (**Etapa Lectiva**, **Etapa Productiva**, y **Egresados**) con contadores interactivos y estados informativos vacíos en [AcademicManagement.tsx](file:///c:/Users/Jhon/Documents/Datos/Informacion/2026/Proyectos/Academix/src/features/admin/components/AcademicManagement.tsx).
- [x] Integrar el filtro selector de categoría (etapa del grupo) en la vista de **Gestión de Estudiantes** en [UserManagement.tsx](file:///c:/Users/Jhon/Documents/Datos/Informacion/2026/Proyectos/Academix/src/features/admin/components/UserManagement.tsx) y propagar los datos del backend en [page.tsx](file:///c:/Users/Jhon/Documents/Datos/Informacion/2026/Proyectos/Academix/src/app/dashboard/admin/users/page.tsx).
- [x] Ajustar filtros en `UserManagement.tsx` para que no contengan la opción "Todas las etapas" y por defecto apunten a "Etapa Lectiva".
- [x] Ocultar estudiantes del listado de forma estricta si no hay grupos creados para la combinación de programa/etapa elegida (evitando fallbacks a "all" grupos).
- [x] Optimizar la adaptabilidad móvil de los listados de administración en [AcademicManagement.tsx](file:///c:/Users/Jhon/Documents/Datos/Informacion/2026/Proyectos/Academix/src/features/admin/components/AcademicManagement.tsx) mediante envolturas de scroll horizontal `overflow-x-auto`.
- [x] Optimizar la adaptabilidad móvil de las vistas y listados del profesorado en [GroupManager.tsx](file:///c:/Users/Jhon/Documents/Datos/Informacion/2026/Proyectos/Academix/src/features/teacher/components/GroupManager.tsx) y [StudentManager.tsx](file:///c:/Users/Jhon/Documents/Datos/Informacion/2026/Proyectos/Academix/src/features/teacher/components/StudentManager.tsx).
- [x] Optimizar la adaptabilidad móvil de la vista de registro e historial académico del estudiante en [StudentRecords.tsx](file:///c:/Users/Jhon/Documents/Datos/Informacion/2026/Proyectos/Academix/src/features/student/components/StudentRecords.tsx).
- [x] Constatar que la programación de horarios (`/dashboard/admin/schedule`) bloquee visualmente su visualización en pantallas móviles a través del aviso estructurado en [SchedulePlanning.tsx](file:///c:/Users/Jhon/Documents/Datos/Informacion/2026/Proyectos/Academix/src/features/admin/components/SchedulePlanning.tsx).
- [x] Rediseñar el modal de créditos [CreditsModal.tsx](file:///c:/Users/Jhon/Documents/Datos/Informacion/2026/Proyectos/Academix/src/components/CreditsModal.tsx) para separar a **Boris David Gómez Guerrero** como Líder del Proyecto y destacar a los instructores como Desarrolladores del Proyecto.
- [x] Verificar que el proyecto compile y funcione correctamente.
