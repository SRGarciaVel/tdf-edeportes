# TDF e-deportes — Documentación de funcionalidades

Documento de referencia del proyecto: qué hace la plataforma, quién puede
hacer qué, cómo se comporta cada módulo y qué queda fuera de alcance por
decisión explícita. Complementa (no reemplaza) `SPECS.md`, `ROADMAP.md` y
`CODESTYLE.md` del repositorio, que cubren el detalle técnico de
implementación.

**Última actualización:** 30-08-2026. Ver [Changelog](#changelog) al final.

---

## Índice

1. [Visión general y arquitectura](#1-visión-general-y-arquitectura)
2. [Roles y niveles de acceso](#2-roles-y-niveles-de-acceso)
3. [Autenticación](#3-autenticación)
4. [Estructura de navegación](#4-estructura-de-navegación)
5. [Jugadores](#5-jugadores)
6. [Perfil de jugador — propio](#6-perfil-de-jugador--propio)
7. [Comentarios de perfil](#7-comentarios-de-perfil)
8. [Notificaciones](#8-notificaciones)
9. [Calendario](#9-calendario)
10. [Torneos](#10-torneos)
11. [Objetivos trimestrales](#11-objetivos-trimestrales)
12. [Puntos](#12-puntos)
13. [Panel de Administración](#13-panel-de-administración)
14. [Tier List](#14-tier-list)
15. [Hub SF6](#15-hub-sf6)
16. [Recopilaciones de Instagram](#16-recopilaciones-de-instagram)
17. [FODA de la comunidad](#17-foda-de-la-comunidad)
18. [Streams destacados y chat](#18-streams-destacados-y-chat)
19. ["Nosotros"](#19-nosotros)
20. [Flujos principales](#20-flujos-principales)
21. [Estados de cada entidad](#21-estados-de-cada-entidad)
22. [Reglas de negocio](#22-reglas-de-negocio)
23. [Dependencias externas](#23-dependencias-externas)
24. [Parámetros técnicos y frecuencias](#24-parámetros-técnicos-y-frecuencias)
25. [Comportamiento ante fallos](#25-comportamiento-ante-fallos)
26. [Seguridad y moderación](#26-seguridad-y-moderación)
27. [Infraestructura](#27-infraestructura)
28. [Funcionalidades implementadas vs. planificadas](#28-funcionalidades-implementadas-vs-planificadas)
29. [Prioridades](#29-prioridades)
30. [Fuera de alcance por decisión](#30-fuera-de-alcance-por-decisión)
31. [Propuestas a evaluar (no implementadas)](#31-propuestas-a-evaluar-no-implementadas)
32. [Glosario](#32-glosario)
33. [Changelog](#changelog)

---

## 1. Visión general y arquitectura

TDF e-deportes es la plataforma web de un club de esports de juegos de
pelea (foco principal: Street Fighter 6, con actividad recurrente también
en Third Strike), centrado en streaming. La plataforma cumple dos
funciones: organización interna del club (calendario, roles) y presencia
pública para la comunidad (perfiles de jugadores, contenido, interacción).

```
                     Persona visitante / usuaria
                              │
                              ▼
                    Frontend (React, Vercel)
                              │
                              ▼
                    Backend (FastAPI, Render)
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
        Base de datos   Servicios          Automatización
        (Supabase/          externos            (GitHub Actions)
        Postgres)              │                     │
                        ┌──────┼──────┐        ┌──────┴──────┐
                        ▼      ▼      ▼        ▼             ▼
                    Twitch  Capcom  Meta    Refresh CFN   Refresh meta
                    (OAuth, (datos  (embed  (cada hora)   SF6 (mensual)
                    en vivo, jugador,  de
                    chat)   scraping) Instagram)
```

El frontend nunca habla directo con Twitch/Capcom/Instagram para obtener
datos — todo pasa por el backend propio, que valida, cachea y expone la
información ya procesada. La única excepción es el embed de Instagram, que
sí corre en el navegador de la persona visitante (ver
[sección 16](#16-recopilaciones-de-instagram)).

---

## 2. Roles y niveles de acceso

Cuatro niveles, de menor a mayor:

### 2.1 Visitante (sin cuenta)

Acceso a todas las páginas públicas. Puede ranquear una tier list existente
y publicar una entrada de FODA sin necesidad de cuenta. No puede comentar
en perfiles, no tiene notificaciones, no puede editar nada.

### 2.2 Autenticado (login con Twitch)

Cualquier cuenta con sesión iniciada. Puede comentar en cualquier perfil,
recibir notificaciones, crear plantillas de tier list, y — si además tiene
un CFN ID registrado y aprobado — editar su propio perfil de jugador
completo.

### 2.3 Staff (`is_staff = true`)

Asignado manualmente en la base de datos o desde el Panel de
Administración. Gestiona el calendario, aprueba o rechaza registros de CFN,
modera fotos de fondo de cualquier card, borra contenido de cualquier
persona, vincula cuentas antiguas del roster.

### 2.4 Administrador (`is_admin = true`)

Nivel más alto. Asignado exclusivamente de forma manual en la base de
datos — ningún endpoint, ni siquiera el Panel de Administración, puede
otorgar este nivel. Gestiona Staff, el catálogo de roles, y accede al
dashboard técnico del sitio.

| Acción | Visitante | Autenticado | Staff | Admin |
|---|:---:|:---:|:---:|:---:|
| Ver páginas públicas | ✅ | ✅ | ✅ | ✅ |
| Ranquear tier list | ✅ | ✅ | ✅ | ✅ |
| Publicar FODA | ✅ | ✅ | ✅ | ✅ |
| Comentar en perfiles | ❌ | ✅ | ✅ | ✅ |
| Recibir notificaciones | ❌ | ✅ | ✅ | ✅ |
| Crear plantilla de tier list | ❌ | ✅ | ✅ | ✅ |
| Editar perfil propio (si CFN aprobado) | ❌ | ✅ | ✅ | ✅ |
| Gestionar calendario | ❌ | ❌ | ✅ | ✅ |
| Aprobar/rechazar registros de CFN | ❌ | ❌ | ✅ | ✅ |
| Moderar contenido de cualquier persona | ❌ | ❌ | ✅ | ✅ |
| Otorgar/quitar Staff | ❌ | ❌ | ❌ | ✅ |
| Gestionar catálogo de roles | ❌ | ❌ | ❌ | ✅ |
| Ver dashboard técnico | ❌ | ❌ | ❌ | ✅ |

---

## 3. Autenticación

Único método: OAuth de Twitch (flujo "Authorization Code"). No existe
registro con email/contraseña propio del sitio.

- Al iniciar sesión por primera vez se crea una cuenta con
  `is_staff = false` e `is_admin = false` por defecto.
- El backend emite un JWT de sesión propio; el token de Twitch nunca se
  reenvía al navegador.
- El `state` del flujo OAuth es un JWT autocontenido de 10 minutos,
  protección estándar contra CSRF.
- El JWT de sesión se almacena en `localStorage` del navegador.

---

## 4. Estructura de navegación

- **Directos:** Inicio, Calendario, Jugadores.
- **Comunidad ▾:** Torneos, Objetivos, Nosotros, Puntos, Tier List,
  Recopilaciones, FODA.
- **SF6 ▾:** Meta Actual, Notas de Parche.
- **Buscador:** filtra en tiempo real sobre jugadores del roster y páginas
  del sitio.
- **Notificaciones:** ícono independiente, visible solo con sesión
  iniciada.
- **Menú de usuario:** perfil propio, Administración (solo si
  `is_admin`), cerrar sesión.
- **Panel de chat:** deslizable, disponible en todas las páginas. Pestaña
  del canal del club siempre presente; pestañas adicionales aparecen solo
  mientras otros canales asociados están en vivo.

---

## 5. Jugadores

Roster público del club y de la escena competitiva local.

### 5.1 Origen de los datos

Rango, puntos de liga, personaje y estadísticas se obtienen mediante
scraping del sitio oficial de perfiles de Capcom (Buckler's Boot Camp), que
no ofrece API pública para este dato. La actualización corre en un proceso
automatizado programado.

### 5.2 Registro en el roster

Cualquier cuenta autenticada puede solicitar sumarse indicando su CFN ID
numérico. La solicitud queda pendiente hasta revisión de Staff (ver
[estados](#21-estados-de-cada-entidad)). Al aprobar, Staff puede ajustar el
nombre público, marcar la afiliación al club y agregar un enlace externo de
perfil competitivo.

### 5.3 Vistas y filtros

Vista de galería (tarjetas con imagen) o de lista (compacta, con búsqueda y
filtros). Filtro por rango, orden por puntos/rango/nombre, y selector de
ventana de historial reciente.

### 5.4 Tarjeta de jugador

Incluye imagen de fondo personalizable, avatar, nombre, personaje, rango,
y — al voltearse — estadísticas de partidas recientes, biografía corta,
enlaces sociales y acceso al perfil completo.

### 5.5 Casos de moderación

Entradas de roster sin cuenta vinculada (migradas antes de existir el
autorregistro) pueden asociarse manualmente a una cuenta desde una
herramienta de Staff que solo sugiere coincidencias exactas de nombre de
usuario. Algunas personas de la escena pueden quedar excluidas del roster
hasta confirmación personal de que desean aparecer.

---

## 6. Perfil de jugador — propio

Editable únicamente por la propia cuenta, con registro de CFN aprobado.

| Campo | Descripción |
|---|---|
| Nombre | Editable libremente. |
| Biografía | Texto libre corto. |
| Avatar | Imagen propia o la de Twitch por defecto. Soporta GIF animado. |
| Banner | Imagen de portada del perfil, con editor de recorte y zoom integrado. Campo independiente de la imagen de fondo de la tarjeta. |
| Imagen de fondo de tarjeta | La que se muestra en el listado de Jugadores. |
| Redes sociales | Hasta 5 enlaces, con reconocimiento de marca para plataformas comunes. |
| Radar de habilidades | Gráfico de 5 ejes, escala relativa al resto del roster. |
| Comentarios | Ver [sección 7](#7-comentarios-de-perfil). |
| Achievements | Sección reservada, sin mecánica activa todavía. |

Los tres campos de imagen admiten GIF animado. Dado que el procesamiento
estándar de imágenes (recorte automático vía canvas) no puede preservar
animación, los archivos GIF se almacenan sin ese procesamiento, con un
límite de tamaño propio (ver [reglas de negocio](#22-reglas-de-negocio)).

---

## 7. Comentarios de perfil

Cualquier cuenta autenticada puede comentar en el perfil de cualquier
jugador del roster. Puede eliminar un comentario: quien lo escribió, la
persona dueña del perfil comentado, o Staff. Cada comentario nuevo genera
una notificación para la persona dueña del perfil (salvo autocomentarios).
Los comentarios más recientes de todo el sitio se muestran en la sección de
actividad del inicio.

---

## 8. Notificaciones

Sistema genérico, diseñado para admitir más tipos en el futuro. El único
tipo activo hoy es "comentario recibido en el perfil". Se actualizan
automáticamente en intervalos regulares y se marcan como leídas en bloque
al abrir el listado.

---

## 9. Calendario

Vista pública de eventos marcados como visibles, y vista de gestión para
Staff (creación, edición y borrado de torneos, streams y reuniones, con
comentarios internos por evento).

---

## 10. Torneos

Página de referencia de torneos organizados por el club, con enlace al
bracket externo cuando corresponde.

---

## 11. Objetivos trimestrales

Metas del club organizadas por trimestre, con estado de avance. Lectura
pública; gestión disponible para Staff.

---

## 12. Puntos

Sección con maqueta visual (podio y tabla), sin mecánica de acumulación
implementada todavía. El diseño de cómo se otorgan y canjean puntos está en
definición conjunta con la dirección del club.

---

## 13. Panel de Administración

Accesible únicamente para cuentas con `is_admin`. Incluye:

- Dashboard con conteos generales del sitio (cuentas, roster, contenido
  generado, estado del entorno).
- Gestión del catálogo de roles (creación, borrado, asignación).
- Gestión de Staff por cuenta.

---

## 14. Tier List

Herramienta para crear y compartir listas de nivel ("tier lists") de la
comunidad.

- No incluye ningún roster de personajes propio del sitio; el 100% del
  contenido visual proviene de plantillas subidas por la propia comunidad.
- Crear una plantilla requiere sesión iniciada. Ranquear una plantilla
  existente no la requiere.
- Edición completa de niveles (agregar, quitar, reordenar, renombrar),
  exportación como imagen, y compartición por enlace.
- Galería de plantillas creadas por la comunidad disponible como punto de
  entrada alternativo.

---

## 15. Hub SF6

- **Meta Actual:** estadísticas de uso de personajes y matchups a nivel
  global, con vista general y de rango alto, actualizadas periódicamente.
- **Notas de Parche:** resumen de cada actualización del juego. Contenido
  disponible en inglés; la traducción combinada (términos técnicos en
  inglés, prosa en español) está pendiente de definición de mecanismo.

---

## 16. Recopilaciones de Instagram

Publicaciones de la cuenta oficial del club en Instagram, seleccionadas
manualmente por Staff (no existe sincronización automática con la API de
Instagram). Se muestran mediante el mecanismo de inserción oficial de la
plataforma, que se ejecuta en el navegador de la persona visitante. El
inicio muestra un adelanto con las publicaciones más recientes.

---

## 17. FODA de la comunidad

Herramienta de análisis colaborativo (Fortalezas, Oportunidades,
Debilidades, Amenazas) sobre cualquier persona de la escena competitiva,
sin restricción de nombre.

- Disponible con o sin sesión iniciada.
- Cada uno de los cuatro campos admite texto extenso.
- Cada entrada puede marcarse pública o privada. Las privadas son visibles
  solo para quien las creó (si tenía sesión iniciada) y para Staff. Al
  crear una entrada privada sin sesión iniciada, se ofrece descargarla como
  imagen, dado que no existe otro mecanismo para recuperarla después.
- Eliminación disponible para quien la creó (con sesión) o Staff.

---

## 18. Streams destacados y chat

El inicio destaca canales aliados del club cuando están transmitiendo en
simultáneo con el canal principal (mostrando ambos si coinciden). El panel
de chat global agrega una pestaña por cada canal destacado mientras
permanece en vivo.

---

## 19. "Nosotros"

Presentación del club: quiénes lo integran, qué actividades realiza y cómo
sumarse.

---

## 20. Flujos principales

### 20.1 Registro y aprobación de jugador

```
Iniciar sesión con Twitch
        │
        ▼
Solicitar registro con CFN ID
        │
        ▼
Estado: pendiente
        │
        ▼
Staff revisa la solicitud
        │
   ┌────┴────┐
   ▼         ▼
Aprobado   Rechazado
   │
   ▼
Puede editar su perfil completo
```

### 20.2 Comentario en un perfil

```
Cuenta autenticada escribe un comentario
        │
        ▼
Se guarda el comentario
        │
        ▼
Se genera una notificación para la
persona dueña del perfil (si no es
la misma persona)
        │
        ▼
Aparece en el perfil comentado y en
"Actividad reciente" del inicio
```

### 20.3 Carga de una imagen (avatar, banner o fondo de tarjeta)

```
Se selecciona un archivo
        │
        ▼
¿Es GIF animado?
   │            │
  Sí            No
   │            │
   ▼            ▼
Se sube tal    Se recorta y comprime
cual (con      automáticamente
límite de
tamaño)
   │            │
   └─────┬──────┘
         ▼
El servidor valida que sea una
imagen real antes de guardar
         │
         ▼
Se actualiza el campo y se refleja
al instante en la vista previa
```

### 20.4 Publicación de un FODA privado sin sesión iniciada

```
Se completa el formulario
        │
        ▼
Se marca como privado
        │
        ▼
Se publica (queda asociado solo a
un nombre escrito a mano, sin cuenta)
        │
        ▼
Se ofrece descargar como imagen
        │
        ▼
Esa descarga es la única copia
recuperable después
```

---

## 21. Estados de cada entidad

| Entidad | Estados posibles |
|---|---|
| Registro de CFN | `pending` (pendiente) → `approved` (aprobado) / `rejected` (rechazado) |
| Notificación | `no leída` → `leída` |
| Evento de calendario | `staff` (visible solo internamente) / `público` |
| Entrada de FODA | `pública` / `privada` |
| Comentario, entrada de FODA, recopilación | existe → eliminado (sin estado intermedio; el borrado es definitivo) |

---

## 22. Reglas de negocio

| Regla | Valor |
|---|---|
| Nombre de perfil | 1–40 caracteres, no puede quedar vacío |
| Biografía de perfil | hasta 280 caracteres |
| Comentario de perfil | 1–500 caracteres |
| Cada cuadrante de FODA | 1–20.000 caracteres |
| Nombre del sujeto de un FODA | 1–80 caracteres |
| Nombre de autor invitado (sin cuenta) | hasta 40 caracteres |
| Enlaces de redes sociales por perfil | hasta 5 |
| Imagen GIF (avatar/banner/fondo de tarjeta) | hasta 5MB de archivo |
| Imagen estática recortada automáticamente | avatar 160×160px, banner 1200×400px, fondo de tarjeta 480×480px |
| Imagen de un ítem de tier list | formatos PNG/JPEG/WEBP, ~150KB |
| CFN ID | 5 a 20 dígitos numéricos |
| Publicación de comentarios de perfil | máx. 20 por hora por cuenta |
| Publicación de FODA / creación de ranking de tier list sin cuenta | máx. 20 por hora por origen |
| Mínimo de partidas para figurar en rankings de estadísticas | 20 partidas registradas |

---

## 23. Dependencias externas

| Servicio | Uso en la plataforma |
|---|---|
| Twitch | Inicio de sesión, estado en vivo, chat embebido |
| Capcom (Buckler's Boot Camp) | Datos de perfil de jugadores, estadísticas de juego |
| Meta / Instagram | Inserción de publicaciones seleccionadas |
| Supabase | Base de datos |
| Render | Alojamiento del backend |
| Vercel | Alojamiento del frontend, despliegue automático |
| GitHub Actions | Automatización de actualizaciones periódicas |

---

## 24. Parámetros técnicos y frecuencias

| Parámetro | Valor |
|---|---|
| Actualización de datos de jugadores (Capcom) | cada hora |
| Actualización de estadísticas globales del juego | mensual |
| Verificación de canales en vivo | cada 3 minutos (frontend), con caché breve del lado del servidor |
| Actualización de notificaciones | cada 90 segundos |
| Vigencia de datos en caché de navegación (jugadores/inicio) | 60 segundos antes de revalidar |
| Historial de partidas disponible en perfil | ventanas de 1, 3 o 7 días |

---

## 25. Comportamiento ante fallos

| Situación | Comportamiento actual |
|---|---|
| Twitch no responde | El estado "en vivo" cae a "sin datos" sin interrumpir el resto del sitio. El inicio de sesión con Twitch no está disponible mientras dure la falla. |
| Capcom cambia la estructura de su sitio | El proceso de actualización de datos de jugadores puede fallar o dejar de extraer campos correctamente; requiere revisión manual, no hay recuperación automática. |
| La automatización periódica (GitHub Actions) falla en una corrida | Los datos quedan con la antigüedad de la última corrida exitosa hasta la siguiente ejecución programada; no hay alertas automáticas configuradas todavía. |
| La cuenta de Twitch de una persona es eliminada o inhabilitada | No hay un manejo específico implementado para este caso. |
| La base de datos no está disponible | Los endpoints del backend devuelven error; no existe una copia en caché de respaldo para servir datos mientras tanto. |
| Se intenta subir un archivo que no es una imagen válida | El servidor lo rechaza antes de guardarlo. |
| El proveedor de embeds de Instagram no carga (bloqueadores del navegador, cambios de la plataforma) | La publicación muestra un enlace directo de respaldo en lugar de quedar vacía. |

---

## 26. Seguridad y moderación

- Toda imagen subida se valida en el servidor como archivo de imagen real
  en formato admitido; no se acepta una URL externa arbitraria.
- Los endpoints públicos de escritura sin cuenta tienen límite de
  solicitudes por hora (ver [reglas de negocio](#22-reglas-de-negocio)).
- El backend no arranca en el entorno de producción si detecta que la
  clave de firma de sesión sigue en su valor por defecto.
- El nivel de administrador no puede otorgarse desde ningún endpoint;
  exclusivamente manual en la base de datos.
- Cabeceras de seguridad del sitio (política de contenido, protección
  contra incrustación en otros sitios, políticas de permisos del
  navegador) configuradas a nivel de despliegue, limitadas a los dominios
  externos que la plataforma efectivamente utiliza.

---

## 27. Infraestructura

| Capa | Tecnología |
|---|---|
| Backend | FastAPI (Python), PostgreSQL, SQLAlchemy, Alembic, JWT |
| Frontend | React + Vite + TypeScript, Tailwind CSS |
| Base de datos | Supabase (PostgreSQL administrado) |
| Alojamiento backend | Render |
| Alojamiento frontend | Vercel |
| Obtención de datos de jugadores | Automatización basada en navegador headless, programada por hora |
| Autenticación | Twitch OAuth exclusivamente |

---

## 28. Funcionalidades implementadas vs. planificadas

### Implementadas y en producción

Autenticación, roster de Jugadores, perfil de jugador completo,
comentarios de perfil, notificaciones, calendario, torneos, objetivos
trimestrales, Panel de Administración, Tier List, hub SF6 (Meta Actual y
Notas de Parche), Recopilaciones de Instagram, FODA de la comunidad,
streams destacados y chat multicanal.

### Con maqueta visual, sin mecánica funcional

- **Puntos:** vista implementada, sistema de acumulación pendiente de
  definición.
- **Achievements:** sección reservada en el perfil, sin lógica de
  desbloqueo definida.

### Planificadas, sin iniciar

- Calendario público enriquecido con brackets en vivo.
- Sistema de interacción en tiempo real durante transmisiones.
- Overlay dinámico conectado a la plataforma.
- Integración más profunda con Discord (más allá del anuncio saliente
  planificado).
- Traducción combinada de notas de parche.

### Parada por bloqueo externo

- Hub de estadísticas para Third Strike: la fuente de datos pública
  correspondiente presenta una restricción de acceso automatizado por
  parte del proveedor, sin fecha de resolución conocida (ver
  [sección 30](#30-fuera-de-alcance-por-decisión)).

---

## 29. Prioridades

| Nivel | Funcionalidades |
|---|---|
| Crítico | Autenticación, roster de Jugadores, perfiles, Calendario |
| Importante | FODA, Tier List, Recopilaciones, Notificaciones, Comentarios |
| Experimental / en definición | Achievements, Puntos, hub de Third Strike |

---

## 30. Fuera de alcance por decisión

- **Roster de personajes propio del sitio:** no existe para ningún juego,
  por consideración de derechos de autor sobre el material visual de los
  desarrolladores de los juegos. Todo el contenido visual de Tier List
  proviene de plantillas subidas por la comunidad.
- **Automatización de sistemas de verificación humana de terceros:** la
  plataforma no automatiza la resolución de desafíos anti-automatización
  (verificación de Capcom, protección del proveedor de datos de Third
  Strike), independientemente del propósito. Esta es la causa directa del
  bloqueo del hub de Third Strike.
- **Sincronización automática con la API de Instagram:** se optó por
  selección manual de contenido en lugar de mantener credenciales de
  acceso con vencimiento periódico, dada la frecuencia de publicación del
  contenido de origen.

---

## 31. Propuestas a evaluar (no implementadas)

Lista de mejoras sugeridas para evaluación futura — ninguna está
implementada todavía:

- Sistema de auditoría de acciones de Staff y Administradores (registro de
  quién hizo qué y cuándo).
- Indicador de estado de sincronización con servicios externos (por
  ejemplo, si la última actualización de datos de Capcom falló).
- Sistema de reportes de contenido generado por usuarios (comentarios,
  FODA), como complemento a la moderación manual actual.
- Política formal de respaldo y recuperación de la base de datos.
- Panel de métricas de uso (comentarios, publicaciones de FODA, cuentas
  activas, visitas a perfiles).
- Anexo técnico separado con el modelo de datos completo y sus relaciones.

---

## 32. Glosario

| Término | Significado |
|---|---|
| CFN | Capcom Fighters Network — identificador de cuenta de jugador de Street Fighter 6 |
| LP | Puntos de Liga — puntuación de progreso dentro de un rango en SF6 |
| MR | Master Rating — puntuación numérica una vez alcanzado el rango más alto |
| Buckler's Boot Camp | Sitio oficial de Capcom donde vive el perfil competitivo de cada jugador de SF6 |
| Staff | Nivel de acceso para el equipo organizador del club |
| Records | Conjunto de cinco estadísticas promedio por jugador (Drive Impact recibido, Perfect Parry, Punish con Drive Impact, tiempo en esquina del rival, throws conectados) |
| TierMaker | Sitio de referencia externo para el formato de herramienta de tier list |
| OAuth | Protocolo estándar de autorización usado para iniciar sesión con una cuenta de Twitch |
| FODA | Fortalezas, Oportunidades, Debilidades, Amenazas — herramienta de análisis |
| GGPO | Middleware de red usado por la plataforma de juego en línea Fightcade |
| CSP | Content Security Policy — cabecera de seguridad que restringe qué recursos externos puede cargar el sitio |

---

## Changelog

Registro por fecha de los cambios funcionales más relevantes. No sigue un
esquema de versionado numérico formal.

- **30-08-2026** — Documentación funcional reestructurada: índice,
  diagrama de arquitectura, flujos, estados de entidades, reglas de
  negocio consolidadas, glosario y este changelog.
- **29-08-2026** — Perfil de jugador ampliado (banner, redes sociales,
  radar de habilidades, soporte de GIF animado), comentarios de perfil,
  notificaciones, Panel de Administración, FODA de la comunidad,
  Recopilaciones de Instagram, streams destacados con chat multicanal,
  caché de navegación para Jugadores e Inicio, revisión de seguridad de
  validación de imágenes.
- **21/22-08-2026** — Hub SF6 (Meta Actual y Notas de Parche), rediseño de
  navbar con búsqueda real.
- **20-08-2026** — Historial de partidas y estadísticas ("Records") por
  jugador, chips de comunidad.
- **18-08-2026** — Primera revisión de seguridad del proyecto (límites de
  solicitudes, cabeceras de despliegue).
- **16-08-2026** — Herramienta de Tier List, identidad visual definitiva
  del club aplicada al sitio.
- Fase 1 (fecha de referencia previa) — Autenticación, calendario interno,
  objetivos trimestrales, primer despliegue.
