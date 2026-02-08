# 🎧 AUTO DJ INTELIGENTE - Sistema Completo

Un sistema de DJ completamente automático que selecciona, mezcla y transiciona entre canciones de forma inteligente, con análisis offline opcional para transiciones profesionales.

## 📋 Contenido del Proyecto

```
.
├── index.html                    # Interfaz visual
├── generate_index.py             # Script para actualizar lista de canciones
├── analyze_track.py              # 🆕 Analizador offline de audio (FASE 4.0)
│
├── JavaScript (módulos)
│   ├── FileScanner.js           # Escanea y encuentra canciones
│   ├── MetadataLoader.js        # Carga metadata + análisis offline
│   ├── AudioPlayer.js           # Reproduce audio con Web Audio API
│   ├── TrackSelector.js         # Elige la siguiente canción
│   ├── TransitionCalculator.js  # Calcula transiciones (evita drops/peaks)
│   └── MixController.js         # Controlador principal del DJ
│
└── musica/
    ├── canciones/               # Archivos MP3
    │   └── index.json          # Lista auto-generada
    └── json/                    # Metadata de cada canción
```

---

## 🚀 Instalación y Arranque

### Requisitos
- **Python 3.8+**
- **Navegador moderno** (Chrome, Firefox, Edge, Safari)
- **Librosa** (opcional, solo para análisis offline)

### Inicio Rápido

**1. Verificar Python:**
```powershell
python --version
```

**2. Crear entorno virtual:**
```powershell
cd "c:\Users\yeray\Documents\DJ"
python -m venv .venv
.venv\Scripts\activate
```

**3. 🆕 Instalar dependencias opcionales (para análisis offline):**
```powershell
pip install librosa numpy scipy soundfile
```

**4. Iniciar servidor web:**
```powershell
python -m http.server 8000
```

**5. Abrir en navegador:**
```
http://localhost:8000
```

**6. Presionar:**
```
▶️ Iniciar DJ Automático
```

---

## 🎵 Cómo Agregar Canciones

### Método Básico (Solo Metadata Esencial)

#### Paso 1: Copiar MP3
```
musica/canciones/NombreCancion.mp3
```

#### Paso 2: Crear Metadata JSON Mínima
```
musica/json/NombreCancion.json
```

**Contenido mínimo (solo BPM obligatorio):**
```json
{
  "bpm": 128
}
```

El sistema aplicará defaults inteligentes automáticamente:
- `energy`: 2 (media)
- `vocals`: "media"
- `mix_in`: 0.5s
- `mix_out`: 60s

#### Paso 3: Actualizar índice
```powershell
python generate_index.py
```

---

### 🆕 Método Avanzado (Con Análisis Offline - FASE 4.0)

Para transiciones de calidad profesional que evitan cortar en drops/peaks:

#### Paso 1: Copiar MP3
```
musica/canciones/Mi Cancion.mp3
```

#### Paso 2: Crear Metadata Base
```json
{
  "bpm": 128,
  "energy": 3,
  "vocals": "alta",
  "mix_in": 0,
  "mix_out": 180
}
```

#### Paso 3: Ejecutar Análisis Offline
```powershell
# Analizar una canción específica
python analyze_track.py "musica/canciones/Mi Cancion.mp3"

# Analizar toda la carpeta
python analyze_track.py --batch musica/canciones/

# Con BPM conocido (mejora precisión)
python analyze_track.py "musica/canciones/Mi Cancion.mp3" --bpm 128
```

El script agregará automáticamente un bloque `analysis` al JSON:

```json
{
  "bpm": 128,
  "energy": 3,
  "vocals": "alta",
  "mix_in": 0,
  "mix_out": 180,
  "analysis": {
    "version": "1.0",
    "analyzed_at": "2026-02-07T14:23:45Z",
    "duration": 205.3,
    "energy_curve": [0.234, 0.456, 0.789, ...],
    "events": [
      {"type": "drop", "time": 45.2, "intensity": 0.85},
      {"type": "peak", "time": 120.5, "intensity": 0.92}
    ],
    "structure": [
      {"section": "intro", "start": 0, "end": 16},
      {"section": "groove", "start": 16, "end": 90},
      {"section": "peak", "start": 90, "end": 150},
      {"section": "outro", "start": 150, "end": 205.3}
    ],
    "no_cut_zones": [
      [43.0, 47.5],
      [118.0, 123.0]
    ],
    "safe_exit_points": [35.2, 82.1, 145.6],
    "dynamic_range": 0.724
  }
}
```

#### Paso 4: Actualizar índice y recargar
```powershell
python generate_index.py
# Recargar navegador (F5)
```

---

## 📊 Estructura de Metadata Completa

### Campos Obligatorios
| Campo | Tipo | Descripción | Ejemplo |
|-------|------|-------------|---------|
| **bpm** | number | Beats Por Minuto | 97, 128, 140 |

### Campos Opcionales (con defaults inteligentes)
| Campo | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| **energy** | 1-3 | 2 | Nivel de energía (1=baja, 2=media, 3=alta) |
| **vocals** | string | "media" | Nivel de voces ("alta", "media", "baja") |
| **mix_in** | number | 0.5 | Segundos de fade-in |
| **mix_out** | number | 60 | Segundo donde termina la canción |

### 🆕 Bloque de Análisis Offline (opcional)
| Campo | Tipo | Descripción |
|-------|------|-------------|
| **analysis.version** | string | Versión del formato de análisis |
| **analysis.energy_curve** | number[] | Curva de energía normalizada [0-1] |
| **analysis.events** | object[] | Drops, peaks, buildups detectados |
| **analysis.structure** | object[] | Intro, groove, peak, outro |
| **analysis.no_cut_zones** | [number, number][] | Zonas donde NO cortar (drops/peaks) |
| **analysis.safe_exit_points** | number[] | Puntos seguros para transición |
| **analysis.dynamic_range** | number | Rango dinámico [0-1] |

---

## 🎚️ Cómo Funciona el Sistema

### 1. **Escaneo Automático** 📁
- `FileScanner.js` busca todas las canciones
- Lee el `index.json` generado
- Verifica metadata para cada canción

### 2. **Carga de Metadata** 📊
- `MetadataLoader.js` lee archivos JSON
- Aplica defaults inteligentes si faltan campos
- 🆕 Valida análisis offline si existe
- Rastrea qué canciones usan defaults vs análisis completo

### 3. **Selección Inteligente** 🧠
- `TrackSelector` elige la siguiente canción:
  - BPM similar (±10 BPM)
  - Nivel de energía compatible
  - Evita conflictos de vocals altas
  - Considera contexto (día/noche)
  - 🆕 Prioriza canciones con análisis offline si disponible

### 4. **Cálculo de Transiciones** 🔄
- `TransitionCalculator` determina timing:
  - Calcula punto de inicio del crossfade
  - 🆕 **Evita zonas críticas** (drops/peaks) usando `no_cut_zones`
  - Ajusta playback rate si BPMs son cercanos
  - Buffer de seguridad de 2s antes de zonas críticas

### 5. **Reproducción** 🎵
- `AudioPlayer` usa Web Audio API
- Crossfades suaves (6-8 segundos)
- Pre-carga la siguiente canción

---

## 🆕 Análisis Offline en Detalle

### ¿Qué Detecta el Analizador?

**Energy Curve** (Curva de Energía)
- Divide la canción en segmentos de ~16 segundos
- Combina RMS (volumen) + Spectral Centroid (brillo)
- Normaliza a rango [0-1]
- Usado para detectar cambios de energía

**Events** (Eventos Musicales)
- **Drops**: Caídas abruptas de energía (>30%)
- **Peaks**: Picos de máxima energía (>85%)
- **Buildups**: Incrementos sostenidos de energía

**Structure** (Estructura)
- **Intro**: Primeros 10-30s con energía baja
- **Groove**: Secciones estables de energía media
- **Peak**: Momentos de máxima energía
- **Outro**: Últimos 15-45s con energía decreciente

**No-Cut Zones** (Zonas Críticas)
- 2 segundos alrededor de cada drop
- 3 segundos alrededor de cada peak
- El sistema evita automáticamente cortar aquí

**Safe Exit Points** (Puntos Seguros)
- Finales de secciones groove
- Momentos de energía estable
- Sugerencias para `mix_out` manual

### Ejemplo de Análisis

**Canción: "Epic Progressive House" (180s, 128 BPM)**

```
Estructura detectada:
├─ Intro        [  0s -  16s] Energy: 0.2 → 0.4
├─ Groove       [ 16s -  64s] Energy: 0.6 (estable)
├─ Buildup      [ 64s -  80s] Energy: 0.6 → 0.9
├─ Peak + Drop  [ 80s -  96s] Energy: 0.9 → 0.3  ⚠️ NO CORTAR
├─ Groove       [ 96s - 144s] Energy: 0.5 (estable)
└─ Outro        [144s - 180s] Energy: 0.5 → 0.2

Safe exit points: [62s, 140s]
No-cut zones: [[78-82], [94-98]]
```

**Resultado:**
- Si `mix_out = 80`, el sistema lo ajustará a `76s` (evita el drop)
- TransitionCalculator usará 140s como punto ideal de salida

---

## 🎛️ Interfaz de Usuario

```
🎧 AUTO DJ INTELIGENTE

┌─────────────────────────────────────────┐
│ 🎵 Reproduciendo Ahora                   │
│ Epic Progressive House                  │
│ BPM: 128 | Energy: 3 | Vocals: alta    │
│ Mix In: 0s | Mix Out: 140s              │
│ ✓ Análisis offline disponible           │
└─────────────────────────────────────────┘

[▶️ Iniciar DJ Automático] [⏹️ Detener]

📋 LOG DEL SISTEMA:
[16:21:40] === INICIANDO SISTEMA ===
[16:21:41] ✅ Encontrado: Epic Progressive House
[16:21:41] ✅ Análisis cargado (45 segmentos, 3 eventos)
[16:21:42] ✅ Transición ajustada 80s → 76s (evita drop)
[16:21:45] 🔀 Crossfade programado: 6s
```

---

## 🐛 Solución de Problemas

### ❌ Error instalando librosa
```
# Windows
pip install pipwin
pipwin install librosa

# O usar conda
conda install -c conda-forge librosa
```

### ❌ "No se pudo leer la carpeta"
**Solución:**
```powershell
# Asegúrate de que el servidor está corriendo
python -m http.server 8000

# Abre http://localhost:8000 (NO archivo local)
```

### ❌ Canción nueva no aparece
**Solución:**
1. Verifica MP3 en `musica/canciones/`
2. Verifica JSON en `musica/json/` (al menos con `bpm`)
3. `python generate_index.py`
4. F5 en navegador

### ❌ Transiciones cortan en drops
**Solución:**
```powershell
# Ejecutar análisis offline
python analyze_track.py "musica/canciones/cancion.mp3"

# O toda la carpeta
python analyze_track.py --batch musica/canciones/
```

### ⚠️ Warnings de metadata incompleta
```
⚠️ track.json: Metadata incompleta
   Campos aplicados por default: [energy, vocals, mix_in, mix_out]
```

**Esto es normal** - El sistema funciona perfectamente con defaults. Para mejor control:
1. Especifica manualmente los campos en el JSON
2. O ejecuta análisis offline para sugerencias automáticas

---

## 📊 Estadísticas y Monitoreo

### Consultar estadísticas en consola del navegador:

```javascript
// Cuántas canciones usan defaults
dj.metadataLoader.getDefaultsStats()
// Retorna:
{
  countDefaults: 2,
  countAnalysis: 1,
  tracksWithDefaults: ["track1.json", "track2.json"],
  tracksWithAnalysis: ["track3.json"],
  defaults: {energy: 2, vocals: "media", ...}
}

// Resetear estadísticas
dj.metadataLoader.resetStats()
```

---

## 📝 Ejemplo Completo: Agregar Canción con Análisis

```powershell
# 1. Copiar MP3
copy "nueva_cancion.mp3" "musica/canciones/"

# 2. Crear JSON base
echo '{"bpm": 130, "energy": 3, "vocals": "alta"}' > musica/json/nueva_cancion.json

# 3. Ejecutar análisis offline
python analyze_track.py "musica/canciones/nueva_cancion.mp3" --bpm 130

# 4. Actualizar índice
python generate_index.py

# 5. Refrescar navegador
# Presiona F5 en http://localhost:8000
```

**Resultado en consola del DJ:**
```
✅ nueva_cancion.json cargado
✅ Análisis cargado correctamente
   • 52 segmentos de energía
   • 4 eventos detectados
   • 4 secciones identificadas
   • 2 zonas críticas
   • 3 puntos de salida seguros
```

---

## 🎯 Estructura de Archivos Esperada

```
DJ/
├── index.html
├── generate_index.py
├── analyze_track.py              # 🆕 FASE 4.0
├── MetadataLoader.js
├── AudioPlayer.js
├── TrackSelector.js
├── TransitionCalculator.js
├── MixController.js
├── FileScanner.js
├── test.js
├── README.md
│
└── musica/
    ├── canciones/
    │   ├── Cancion1.mp3
    │   ├── Cancion2.mp3
    │   └── index.json              # AUTO-GENERADO
    │
    └── json/
        ├── Cancion1.json           # BPM + opcionales
        ├── Cancion2.json           # BPM + analysis 🆕
        └── ...
```

---

## 💡 Tips Profesionales

### Para Metadata Manual
- **BPM**: Busca el tempo con Spotify, Shazam o rekordbox
- **Mix Out**: Identifica dónde termina el último coro/verso útil
- **Energy**: 1=chill, 2=medio, 3=peak time
- **Vocals**: Evita "alta+alta" para crossfades limpios

### Para Análisis Offline
- Ejecuta `--batch` en toda la carpeta una vez
- Actualiza análisis si editas el audio
- Revisa `no_cut_zones` si las transiciones suenan raras
- Usa `safe_exit_points` como sugerencias para `mix_out`

### Optimización de Rendimiento
- El análisis offline solo se ejecuta UNA VEZ
- Los JSONs se cachean en el navegador
- Pre-carga funciona en background
- Usa defaults para canciones simples, análisis para pistas complejas

---

## 🚀 Flujo de Trabajo Recomendado

### Setup Inicial
```powershell
# 1. Activar entorno
.venv\Scripts\activate

# 2. Instalar dependencias (una vez)
pip install librosa numpy scipy soundfile

# 3. Iniciar servidor
python -m http.server 8000
```

### Agregar Nueva Canción
```powershell
# 1. Copiar MP3
copy "nueva.mp3" "musica/canciones/"

# 2. Crear JSON mínimo
echo '{"bpm": 125}' > musica/json/nueva.json

# 3. (OPCIONAL) Análisis offline para calidad pro
python analyze_track.py "musica/canciones/nueva.mp3" --bpm 125

# 4. Actualizar índice
python generate_index.py

# 5. F5 en navegador
```

### Actualizar Biblioteca Completa
```powershell
# Analizar todas las canciones sin análisis
python analyze_track.py --batch musica/canciones/
python generate_index.py
```

---

## 🎪 ¡Listo para usar!

```powershell
# Terminal 1: Servidor
python -m http.server 8000

# Navegador
http://localhost:8000
```

**Presiona ▶️ Iniciar DJ Automático y disfruta de mezclas profesionales 🎵**

---

## 🔄 Changelog

### Versión 2.0 - FASE 4.0 (Febrero 2026)
- 🆕 **Análisis offline con librosa**
  - Detección de drops, peaks, buildups
  - Curva de energía detallada
  - Identificación de estructura (intro/outro)
  - Zonas críticas (no-cut zones)
  - Puntos seguros de salida
- 🆕 **TransitionCalculator mejorado**
  - Evita automáticamente cortar en drops/peaks
  - Buffer de seguridad de 2 segundos
  - Logging detallado de ajustes
- 🆕 **MetadataLoader ampliado**
  - Validación de análisis offline
  - Tracking de canciones con análisis
  - Cross-validation (mix_out vs no_cut_zones)
  - Helpers para acceso a estructura
- 🆕 **Script analyze_track.py**
  - Procesamiento batch
  - Actualización no-destructiva de JSONs
  - Resúmenes detallados
  - Soporte para MP3/WAV/OGG

### Versión 1.0 - FASE 3.5 (Enero 2026)
- ✅ Defaults inteligentes para metadata incompleta
- ✅ Sistema de tracking de defaults
- ✅ Validación robusta de metadata
- ✅ Logging mejorado
- ✅ Tests automatizados (test.js)

---

**Versión:** 2.0  
**Última actualización:** Febrero 2026  
**Estado:** ✅ Funcionando - Calidad Profesional