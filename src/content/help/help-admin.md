# 📚 Guía Completa de Ayuda - Administrador

Bienvenido al panel de administración de AcademiX. Esta guía completa te ayudará paso a paso a utilizar todas las funcionalidades disponibles para gestionar la plataforma de manera efectiva.

---

## 🚀 Primeros Pasos

### Acceso al Panel de Administración

1. **Inicia sesión** con tu cuenta de administrador
2. Serás redirigido automáticamente al **Dashboard**
3. En el menú lateral izquierdo verás todas las opciones disponibles

> [!TIP]
> Usa el ícono de menú (☰) en la esquina superior izquierda para expandir o contraer el menú lateral.

---

## 🏠 Panel de Inicio

El panel de inicio es tu centro de control. Aquí encontrarás:

### Vista General del Sistema
- **Total de usuarios** activos en la plataforma
- **Cursos activos** y su estado
- **Actividad reciente** del sistema
- **Alertas importantes** que requieren atención

### Acciones Rápidas
Desde el inicio puedes acceder rápidamente a:
- Crear nuevo usuario
- Ver usuarios recientes
- Acceder a configuración del sistema
- Revisar logs de auditoría

---

## 👥 Gestión de Usuarios

La gestión de usuarios es una de las funciones más importantes del administrador.

### Ver Lista de Usuarios

**Paso 1:** Haz clic en **"Usuarios"** en el menú lateral

**Paso 2:** Verás una tabla con todos los usuarios que incluye:
- Nombre completo
- Correo electrónico
- Rol actual (Estudiante, Profesor, Administrador)
- Estado (Activo/Suspendido)
- Fecha de registro

**Paso 3:** Usa los filtros para encontrar usuarios específicos:
- Buscar por nombre o email
- Filtrar por rol
- Filtrar por estado

> [!NOTE]
> La lista se actualiza automáticamente cuando haces cambios.

### Crear Nuevo Usuario

**Paso 1:** En la página de Usuarios, haz clic en **"Crear Usuario"**

**Paso 2:** Completa el formulario con la información requerida:

| Campo | Descripción | Ejemplo |
|-------|-------------|---------|
| **Nombre** | Nombre completo del usuario | Juan Pérez |
| **Email** | Correo electrónico (será el usuario de acceso) | juan.perez@ejemplo.com |
| **Contraseña** | Contraseña inicial (el usuario puede cambiarla después) | Temporal123! |
| **Rol** | Selecciona: Profesor o Administrador | Profesor |

**Paso 3:** Haz clic en **"Crear"**

**Paso 4:** El usuario recibirá sus credenciales y podrá acceder al sistema

> [!IMPORTANT]
> Los estudiantes se crean automáticamente cuando se registran. Solo crea manualmente profesores y administradores.

> [!TIP]
> Usa contraseñas temporales seguras y pide al usuario que la cambie en su primer acceso.

### Editar Información de Usuario

**Paso 1:** Localiza al usuario en la lista

**Paso 2:** Haz clic en el **ícono de edición** (lápiz) en la fila del usuario

**Paso 3:** Modifica los campos que necesites:
- Nombre
- Email
- Contraseña (si necesitas resetearla)

**Paso 4:** Haz clic en **"Guardar Cambios"**

> [!WARNING]
> Cambiar el email de un usuario puede afectar su acceso. Asegúrate de informarle.

### Cambiar Rol de Usuario

Puedes promover o cambiar el rol de cualquier usuario.

**Paso 1:** En la lista de usuarios, localiza al usuario

**Paso 2:** Haz clic en el **menú desplegable de rol**

**Paso 3:** Selecciona el nuevo rol:
- **Estudiante**: Acceso a cursos y actividades
- **Profesor**: Puede crear y gestionar cursos
- **Administrador**: Acceso completo al sistema

**Paso 4:** Confirma el cambio en el diálogo que aparece

> [!CAUTION]
> Cambiar un usuario a Administrador le dará acceso completo al sistema, incluyendo la gestión de otros usuarios.

### Suspender o Activar Usuario

**Para suspender un usuario:**

1. Localiza al usuario en la lista
2. Haz clic en el **interruptor de estado** (toggle)
3. Confirma la acción
4. El usuario no podrá acceder al sistema hasta que lo reactives

**Para reactivar un usuario:**

1. Filtra por usuarios suspendidos
2. Haz clic en el **interruptor de estado**
3. El usuario podrá acceder nuevamente

> [!NOTE]
> Suspender un usuario no elimina sus datos, solo bloquea su acceso.

### Eliminar Usuario

> [!CAUTION]
> Esta acción es PERMANENTE y no se puede deshacer. Considera suspender al usuario en su lugar.

**Paso 1:** Localiza al usuario en la lista

**Paso 2:** Haz clic en el **ícono de eliminar** (basura)

**Paso 3:** Lee la advertencia cuidadosamente

**Paso 4:** Escribe **"ELIMINAR"** en el campo de confirmación

**Paso 5:** Haz clic en **"Confirmar Eliminación"**

**Consecuencias de eliminar un usuario:**
- Se eliminan todas sus entregas
- Se eliminan sus calificaciones
- Se elimina su historial de actividad
- Si es profesor, sus cursos quedarán sin profesor asignado

---

## 📖 Gestión de Cursos

Como administrador, puedes ver y gestionar todos los cursos del sistema.

### Ver Todos los Cursos

**Paso 1:** Haz clic en **"Cursos"** en el menú lateral

**Paso 2:** Verás todos los cursos con:
- Nombre del curso
- Profesor asignado
- Número de estudiantes inscritos
- Estado (Activo/Inactivo)
- Fechas de inicio y fin

### Crear Nuevo Curso

**Paso 1:** Haz clic en **"Crear Curso"**

**Paso 2:** Completa la información:

```
Nombre del curso: Introducción a la Programación
Descripción: Curso básico de programación en Python
Profesor: Selecciona de la lista
Código del curso: PROG-101 (opcional)
Fecha de inicio: 2025-01-15
Fecha de fin: 2025-06-30
```

**Paso 3:** Haz clic en **"Crear Curso"**

### Reasignar Profesor a un Curso

**Paso 1:** Abre el curso que deseas modificar

**Paso 2:** Haz clic en **"Editar Curso"**

**Paso 3:** En el campo **"Profesor"**, selecciona el nuevo profesor

**Paso 4:** Guarda los cambios

> [!NOTE]
> El nuevo profesor tendrá acceso inmediato al curso y todas sus actividades.

### Eliminar Curso

> [!WARNING]
> Eliminar un curso eliminará todas sus actividades, entregas y calificaciones.

**Paso 1:** Abre el curso

**Paso 2:** Haz clic en **"Eliminar Curso"**

**Paso 3:** Confirma escribiendo **"ELIMINAR"**

---

## 📢 Sistema de Anuncios

Los anuncios te permiten comunicarte con todos los usuarios de la plataforma.

### Crear Anuncio Global

**Paso 1:** Ve a **"Anuncios"** en el menú

**Paso 2:** Haz clic en **"Nuevo Anuncio"**

**Paso 3:** Completa el formulario:

| Campo | Descripción |
|-------|-------------|
| **Título** | Título corto y descriptivo |
| **Contenido** | Mensaje completo (soporta markdown) |
| **Público** | Todos / Solo Profesores / Solo Estudiantes |
| **Prioridad** | Normal / Importante / Urgente |

**Paso 4:** Haz clic en **"Publicar"**

> [!TIP]
> Usa anuncios importantes solo para información crítica para evitar saturar a los usuarios.

### Ejemplos de Buenos Anuncios

**Mantenimiento del Sistema:**
```markdown
# Mantenimiento Programado

El sistema estará en mantenimiento el **sábado 25 de enero** 
de 2:00 AM a 6:00 AM.

Durante este tiempo no podrás acceder a la plataforma.

Planifica tus entregas con anticipación.
```

**Nueva Funcionalidad:**
```markdown
# Nueva Función: Exportar Calificaciones

Ahora los profesores pueden exportar calificaciones a Excel.

Ve a tu curso → Calificaciones → Exportar
```

### Editar o Eliminar Anuncios

**Para editar:**
1. Haz clic en el anuncio
2. Modifica el contenido
3. Guarda los cambios

**Para eliminar:**
1. Haz clic en el ícono de eliminar
2. Confirma la acción

---

## ⚙️ Configuración del Sistema

### Acceder a Configuración

Ve a **"Sistema"** → **"Configuración"** en el menú lateral

### Configuración de API de Gemini

AcademiX puede usar IA para calificación automática. Configura cómo se usa:

#### Modo Global (Recomendado para instituciones)

**Paso 1:** Selecciona **"Modo Global"**

**Paso 2:** Ingresa tu API Key de Google Gemini:
```
AIzaSy... (tu clave API)
```

**Paso 3:** Haz clic en **"Guardar"**

**Ventajas:**
- Un solo punto de configuración
- Control centralizado de uso
- Más fácil de gestionar

#### Modo Individual

**Paso 1:** Selecciona **"Modo Individual"**

**Paso 2:** Guarda la configuración

**Paso 3:** Cada usuario deberá ingresar su propia API key en su perfil

**Ventajas:**
- Cada usuario usa su propia cuota
- Mayor flexibilidad

> [!IMPORTANT]
> Si cambias de Modo Global a Individual, los usuarios deberán configurar sus propias claves.

### Monitoreo del Sistema

En **"Sistema"** puedes ver:

- **Estado del servidor**: Online/Offline
- **Uso de recursos**: CPU, Memoria, Disco
- **Conexiones activas**: Usuarios conectados
- **Logs del sistema**: Errores y advertencias

> [!TIP]
> Revisa el monitoreo regularmente para detectar problemas antes de que afecten a los usuarios.

---

## 📋 Auditoría

El sistema de auditoría registra todas las acciones importantes.

### Ver Registro de Auditoría

**Paso 1:** Ve a **"Auditoría"** en el menú

**Paso 2:** Verás un registro cronológico de:
- Creación/edición/eliminación de usuarios
- Cambios en cursos
- Modificaciones de configuración
- Accesos al sistema
- Cambios de roles

### Filtrar Auditoría

**Por tipo de acción:**
```
Crear | Actualizar | Eliminar | Acceso
```

**Por usuario:**
```
Busca por nombre o email del usuario que realizó la acción
```

**Por rango de fechas:**
```
Desde: 2025-01-01
Hasta: 2025-01-31
```

**Por entidad:**
```
Usuario | Curso | Actividad | Configuración
```

### Exportar Registro de Auditoría

**Paso 1:** Aplica los filtros deseados

**Paso 2:** Haz clic en **"Exportar"**

**Paso 3:** Selecciona el formato:
- CSV (para Excel)
- PDF (para reportes)
- JSON (para procesamiento)

> [!NOTE]
> Los registros de auditoría se conservan permanentemente y no se pueden eliminar.

---

## 🔧 Tareas Administrativas Comunes

### Inicio de Semestre

**Checklist:**
- [ ] Crear cuentas de nuevos profesores
- [ ] Verificar que los cursos estén configurados
- [ ] Publicar anuncio de bienvenida
- [ ] Revisar configuración del sistema
- [ ] Verificar que la API de Gemini funcione

### Fin de Semestre

**Checklist:**
- [ ] Exportar todas las calificaciones
- [ ] Hacer respaldo de la base de datos
- [ ] Archivar cursos completados
- [ ] Generar reportes de uso
- [ ] Limpiar usuarios inactivos (opcional)

### Mantenimiento Regular

**Semanal:**
- Revisar logs del sistema
- Verificar espacio en disco
- Revisar registro de auditoría

**Mensual:**
- Hacer respaldo completo
- Revisar usuarios suspendidos
- Actualizar documentación si hay cambios

---

## 🆘 Solución de Problemas

### Usuario no puede acceder

**Verifica:**
1. ¿El usuario está activo? (no suspendido)
2. ¿El email es correcto?
3. ¿La contraseña es correcta? (considera resetearla)

**Solución:**
- Resetea la contraseña del usuario
- Verifica que no esté suspendido
- Revisa los logs de auditoría para ver intentos de acceso

### Profesor no ve su curso

**Verifica:**
1. ¿El curso está asignado a ese profesor?
2. ¿El profesor tiene el rol correcto?

**Solución:**
- Reasigna el curso al profesor
- Verifica el rol del usuario

### Sistema lento

**Verifica:**
1. Uso de recursos en Sistema → Monitoreo
2. Número de usuarios conectados
3. Logs del sistema para errores

**Solución:**
- Reinicia el servidor si es necesario
- Contacta soporte técnico si persiste

---

## 💡 Mejores Prácticas

### Seguridad

✅ **Haz:**
- Usa contraseñas fuertes para administradores
- Revisa regularmente el registro de auditoría
- Mantén actualizada la plataforma
- Haz respaldos frecuentes

❌ **No hagas:**
- Compartir credenciales de administrador
- Dar rol de admin sin necesidad
- Ignorar alertas del sistema
- Eliminar usuarios sin hacer respaldo

### Comunicación

✅ **Haz:**
- Usa anuncios para información importante
- Sé claro y conciso
- Avisa con anticipación sobre mantenimientos
- Responde dudas de profesores rápidamente

❌ **No hagas:**
- Abusar de anuncios urgentes
- Usar lenguaje técnico innecesario
- Hacer cambios sin avisar

### Gestión de Usuarios

✅ **Haz:**
- Verifica la información antes de crear usuarios
- Usa suspensión en lugar de eliminación
- Documenta cambios importantes de roles
- Mantén actualizada la información de contacto

❌ **No hagas:**
- Eliminar usuarios activos
- Cambiar roles sin consultar
- Crear usuarios duplicados

---

## 📞 Soporte y Ayuda Adicional

Si necesitas ayuda adicional:

1. **Documentación técnica**: Consulta el manual técnico del sistema
2. **Soporte técnico**: Contacta al equipo de desarrollo
3. **Comunidad**: Únete al grupo de administradores

---

## 🔄 Actualizaciones de esta Guía

Esta guía se actualiza regularmente. Última actualización: Diciembre 2025

¿Encontraste algo que falta o necesita mejora? Contacta al equipo de desarrollo.
