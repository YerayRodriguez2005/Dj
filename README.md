# 🎧 AUTO DJ INTELIGENTE - 100% Automático

Un sistema de DJ completamente automático que selecciona, mezcla y transiciona entre canciones de forma inteligente, sin intervención manual.

## 📋 Contenido del Proyecto

```
.
├── index.html                    # Interfaz visual
├── generate_index.py             # Script para actualizar lista de canciones
│
├── JavaScript (módulos)
│   ├── FileScanner.js           # Escanea y encuentra canciones
│   ├── MetadataLoader.js        # Carga metadata de canciones
│   ├── AudioPlayer.js           # Reproduce audio con Web Audio API
│   ├── TrackSelector.js         # Elige la siguiente canción
│   ├── TransitionCalculator.js  # Calcula transiciones suaves
│   └── MixController.js         # Controlador principal del DJ
│
└── musica/
    ├── canciones/               # Archivos MP3
    │   └── index.json          # Lista auto-generada
    └── json/                    # Metadata de cada canción
```

## 🚀 Instalación y Arranque

### Requisitos
- Python 3.8+
- Navegador moderno (Chrome, Firefox, Edge, Safari)

### Pasos

**1. Verificar Python:**
```powershell
python --version
```

**2. Crear entorno virtual (si no existe):**
```powershell
cd "c:\Users\yeray\Documents\DJ"
python -m venv .venv
.venv\Scripts\activate
```

**3. Iniciar servidor web:**
```powershell
cd "c:\Users\yeray\Documents\DJ"
python -m http.server 8000
```

**4. Abrir en navegador:**
```
http://localhost:8000
```

**5. Presionar:**
```
▶️ Iniciar DJ Automático
```

---

## 🎵 Cómo Agregar Canciones

### Paso 1: Copiar MP3
Coloca tu archivo en:
```
musica/canciones/NombreCancion.mp3
```

### Paso 2: Crear Metadata JSON
Crea un archivo con el mismo nombre en:
```
musica/json/NombreCancion.json
```

**Ejemplo de contenido JSON:**
```json
{
  "bpm": 100,
  "mix_in": 0,
  "mix_out": 30,
  "vocals": "alta",
   "energy": 3
}
```

#### Explicación de campos:

| Campo | Tipo | Descripción | Ejemplo |
|-------|------|-------------|---------|
| **bpm** | number | Beats Por Minuto (tempo) | 97, 128, 90 |
| **mix_in** | number | Segundos de fade-in (entrada suave) | 0-5 |
| **mix_out** | number | Segundo donde la canción termina (para transición) | 30-120 |
| **vocals** | string | Nivel de voces: "alta", "media", "baja" | "alta" |

**Ejemplo real:**
```json
{
  "bpm": 97,
  "mix_in": 0,
  "mix_out": 77.4,
  "vocals": "alta"
}
```

### Paso 3: Actualizar índice
Ejecuta en la terminal:
```powershell
cd "c:\Users\yeray\Documents\G"
python generate_index.py
```

Verás:
```
✅ Generado index.json con 4 canciones
```

### Paso 4: Refrescar navegador
- Presiona **F5** o **Ctrl+R** en http://localhost:8000
- La nueva canción estará disponible

---

## 🎚️ Cómo Funciona el DJ Automático

### 1. **Escaneo de Carpetas** 📁
- FileScanner.js busca todas las canciones
- Lee el `index.json` generado automáticamente
- Verifica que exista metadata (JSON) para cada canción

### 2. **Carga de Metadata** 📊
- MetadataLoader.js lee cada archivo `.json`
- Extrae BPM, mix points y nivel de voces

### 3. **Selección Inteligente** 🧠
- TrackSelector elige la siguiente canción basada en:
  - BPM similar (para transiciones suaves)
  - Nivel de energía
  - Hora del día (día vs noche)

### 4. **Transiciones** 🔄
- TransitionCalculator calcula cómo acelerar/desacelerar
- AudioPlayer aplica fade-out/fade-in
- Sincroniza beats automáticamente

### 5. **Reproducción** 🎵
- AudioPlayer usa Web Audio API
- Controla volumen, tempo y timeline
- Carga la siguiente canción mientras suena la actual

---

## 🎛️ Interfaz de Usuario

```
🎧 AUTO DJ INTELIGENTE

┌─────────────────────────────┐
│ 🎵 Reproduciendo Ahora       │
│ Chulo - Bad Gyal            │
│ BPM: 97 | Vocals: alta      │
│ Mix In: 0s | Mix Out: 77.4s │
└─────────────────────────────┘

[▶️ Iniciar DJ Automático] [⏹️ Detener]

📋 LOG DEL SISTEMA:
[16:21:40] === INICIANDO SISTEMA DE DJ AUTOMÁTICO ===
[16:21:40] 🔊 AudioPlayer inicializado
[16:21:40] 🤖 Modo automático: escaneando carpetas...
[16:21:40] ✅ Encontrado: El Conjuntito - El Bobe
...
```

---

## ⚙️ Módulos Principales

### `FileScanner.js`
- Busca archivos de audio en `musica/canciones/`
- Verifica que exista metadata para cada uno
- Retorna lista de tracks listos para cargar

### `MetadataLoader.js`
- Carga archivos JSON con información de la canción
- Extrae y valida datos (BPM, vocals, mix points)

### `AudioPlayer.js`
- Reproductor con Web Audio API
- Controla volumen, playback rate, timing
- Maneja fade-in/fade-out

### `TrackSelector.js`
- Algoritmo para elegir próxima canción
- Considera energía, BPM, contexto (día/noche)
- Evita saltos abruptos

### `TransitionCalculator.js`
- Calcula cambios de tempo para sincronizar
- Define duración de transiciones
- Calcula fade curves

### `MixController.js` (Principal)
- Orquesta todos los módulos
- Gestiona la playlist
- Inicia el modo automático
- Maneja reproducción continua

---

## 🐛 Solución de Problemas

### ❌ "No se pudo leer la carpeta"
**Solución:** 
1. Asegúrate de que el servidor está corriendo: `python -m http.server 8000`
2. Abre http://localhost:8000 (no archivo local)

### ❌ Canción nueva no aparece
**Solución:**
1. Verifica que exista el MP3 en `musica/canciones/`
2. Verifica que exista el JSON en `musica/json/` con el mismo nombre
3. Ejecuta: `python generate_index.py`
4. Presiona F5 en el navegador

### ❌ Transiciones irregulares
**Solución:**
1. Revisa los valores de `mix_out` en cada JSON
2. Asegúrate de que los BPM sean precisos
3. Prueba con canciones de tempo similar primero

### ❌ No reproduce sonido
**Solución:**
1. Revisa que el volumen del navegador esté activo
2. Abre la consola (F12) para ver errores
3. Verifica que los archivos MP3 sean válidos

---

## 📝 Ejemplo Completo: Agregar "Reggaeton Party"

**1. Copiar archivo:**
```
musica/canciones/Reggaeton Party.mp3
```

**2. Crear metadata:**
```
musica/json/Reggaeton Party.json
```

**Contenido:**
```json
{
  "bpm": 92,
  "mix_in": 2,
  "mix_out": 180,
  "vocals": "alta"
}
```

**3. Terminal:**
```powershell
python generate_index.py
✅ Generado index.json con 5 canciones
```

**4. Navegador:**
- F5 en http://localhost:8000
- Click en ▶️ Iniciar DJ Automático
- ¡La canción aparecerá en rotación automática!

---

## 🎯 Estructura de Archivos Esperada

```
G/
├── index.html
├── generate_index.py
├── FileScanner.js
├── MetadataLoader.js
├── AudioPlayer.js
├── TrackSelector.js
├── TransitionCalculator.js
├── MixController.js
├── README.md
└── musica/
    ├── canciones/
    │   ├── Chulo - Bad Gyal.mp3
    │   ├── El Conjuntito - El Bobe.mp3
    │   ├── El Mambo - Kiko Rivera.mp3
    │   ├── Muevelo - Lirico En La Casa.mp3
    │   └── index.json  ← AUTO-GENERADO
    └── json/
        ├── Chulo - Bad Gyal.json
        ├── El Conjuntito - El Bobe.json
        ├── El Mambo - Kiko Rivera.json
        └── Muevelo - Lirico En La Casa.json
```

---

## 💡 Tips

- **Mejor BPM**: Busca el tempo real con Spotify o Shazam
- **Mix Out**: Identifica dónde termina cada sección (verso/coro)
- **Vocals Level**: "alta" si hay muchas voces, "baja" si es más instrumental
- **Mix In**: Usa 0 para entrada abrupta, 2-5 para fade suave

---

## 🎪 ¡Listo para usar!

```powershell
python -m http.server 8000
# Abre http://localhost:8000
# Presiona ▶️ Iniciar DJ Automático
# ¡A disfrutar! 🎵
```

---

**Versión:** 1.0  
**Última actualización:** Enero 2026  
**Estado:** ✅ Funcionando