#!/usr/bin/env python3
"""
🎵 ANALIZADOR DE AUDIO OFFLINE PARA DJ AUTOMÁTICO

Extrae estructura musical de MP3s usando procesamiento de señal tradicional.
NO usa ML pesado, solo librosa + numpy.

Genera metadata que el DJ JavaScript puede usar para:
- Evitar cortar en drops/peaks
- Mejorar timing de transiciones
- Seleccionar canciones con mejor encaje estructural

Uso:
    # Analizar una canción
    python analyze_track.py "musica/canciones/Chulo - Bad Gyal.mp3"
    
    # Analizar carpeta completa
    python analyze_track.py --batch musica/canciones/
    
    # Especificar carpeta de JSONs
    python analyze_track.py song.mp3 --json-dir musica/json/

Instalación:
    pip install librosa numpy scipy soundfile

Autor: DJ Automático Project
Versión: 1.0
"""

import librosa
import numpy as np
import json
import os
import sys
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Tuple, Optional


class AudioAnalyzer:
    """
    Analizador de audio basado en principios de DJ real.
    
    NO usa ML, solo procesamiento de señal tradicional:
    - RMS (volumen promedio)
    - Spectral centroid (brillo/densidad espectral)
    - Detección de cambios abruptos (drops)
    - Segmentación por energía
    
    Filosofía: Análisis explicable y determinista.
    """
    
    def __init__(self, segment_duration: float = 16.0):
        """
        Args:
            segment_duration: Duración base de cada segmento en segundos.
                             16s ≈ 8 compases a 120 BPM (estándar en electrónica)
                             Se ajusta automáticamente según BPM si está disponible.
        """
        self.segment_duration = segment_duration
        self.sr = 22050  # Sample rate reducido (más rápido, suficiente para estructura)
        
        # Umbrales de detección
        self.DROP_THRESHOLD = 0.30      # Caída >30% = drop
        self.PEAK_THRESHOLD = 0.85      # Energía >85% = peak
        self.BUILDUP_MIN_SEGMENTS = 3   # Mínimo 3 segmentos para buildup
        self.BUILDUP_MIN_INCREASE = 0.20  # Aumento mínimo de energía
        
        # Umbrales de secciones
        self.INTRO_ENERGY_MAX = 0.40    # Intro: energía baja
        self.OUTRO_ENERGY_SLOPE = -0.1  # Outro: energía decreciente
        
        print(f"🎚️ AudioAnalyzer inicializado")
        print(f"   Sample rate: {self.sr} Hz")
        print(f"   Duración base de segmento: {segment_duration}s")
    
    def analyze(self, audio_path: str, bpm: Optional[float] = None) -> Dict:
        """
        Análisis completo de una canción.
        
        Args:
            audio_path: Ruta al archivo MP3/WAV/OGG
            bpm: BPM conocido (opcional). Si se proporciona, mejora la segmentación.
        
        Returns:
            Diccionario con análisis completo listo para insertar en JSON
            
        Raises:
            FileNotFoundError: Si el archivo no existe
            Exception: Si hay error en decodificación
        """
        if not os.path.exists(audio_path):
            raise FileNotFoundError(f"Archivo no encontrado: {audio_path}")
        
        filename = Path(audio_path).name
        print(f"\n📊 Analizando: {filename}")
        
        # ═══════════════════════════════════════════════════════════
        # 1. CARGAR AUDIO
        # ═══════════════════════════════════════════════════════════
        try:
            y, sr = librosa.load(audio_path, sr=self.sr, mono=True)
            duration = librosa.get_duration(y=y, sr=sr)
        except Exception as e:
            raise Exception(f"Error cargando audio: {e}")
        
        print(f"   ✓ Duración: {duration:.1f}s")
        print(f"   ✓ Muestras: {len(y):,}")
        
        # ═══════════════════════════════════════════════════════════
        # 2. CALCULAR CURVA DE ENERGÍA
        # ═══════════════════════════════════════════════════════════
        print(f"   ⏳ Calculando curva de energía...")
        energy_curve = self._compute_energy_curve(y, sr, bpm)
        print(f"   ✓ {len(energy_curve)} segmentos generados")
        
        # ═══════════════════════════════════════════════════════════
        # 3. DETECTAR EVENTOS (drops, peaks, buildups)
        # ═══════════════════════════════════════════════════════════
        print(f"   ⏳ Detectando eventos...")
        events = self._detect_events(energy_curve, bpm, duration)
        print(f"   ✓ {len(events)} eventos detectados")
        
        # ═══════════════════════════════════════════════════════════
        # 4. IDENTIFICAR ESTRUCTURA (intro, groove, peak, outro)
        # ═══════════════════════════════════════════════════════════
        print(f"   ⏳ Identificando estructura...")
        structure = self._identify_structure(energy_curve, duration, bpm)
        print(f"   ✓ {len(structure)} secciones identificadas")
        
        # ═══════════════════════════════════════════════════════════
        # 5. CALCULAR ZONAS CRÍTICAS
        # ═══════════════════════════════════════════════════════════
        print(f"   ⏳ Calculando zonas críticas...")
        no_cut_zones = self._compute_no_cut_zones(events, structure)
        safe_exit_points = self._compute_safe_exit_points(
            energy_curve, structure, duration, bpm
        )
        print(f"   ✓ {len(no_cut_zones)} zonas críticas")
        print(f"   ✓ {len(safe_exit_points)} puntos de salida seguros")
        
        # ═══════════════════════════════════════════════════════════
        # 6. MÉTRICAS ADICIONALES
        # ═══════════════════════════════════════════════════════════
        dynamic_range = self._compute_dynamic_range(energy_curve)
        
        # ═══════════════════════════════════════════════════════════
        # 7. CONSTRUIR RESULTADO
        # ═══════════════════════════════════════════════════════════
        analysis = {
            "version": "1.0",
            "analyzed_at": datetime.utcnow().isoformat() + "Z",
            "duration": round(duration, 2),
            "energy_curve": [round(e, 3) for e in energy_curve],
            "events": events,
            "structure": structure,
            "no_cut_zones": no_cut_zones,
            "safe_exit_points": safe_exit_points,
            "dynamic_range": round(dynamic_range, 3)
        }
        
        print(f"   ✅ Análisis completado")
        return analysis
    
    def _compute_energy_curve(
        self, 
        y: np.ndarray, 
        sr: int, 
        bpm: Optional[float]
    ) -> List[float]:
        """
        Calcula curva de energía dividiendo la canción en segmentos.
        
        Combina dos métricas:
        - RMS (Root Mean Square): Volumen/potencia promedio
        - Spectral Centroid: "Brillo" o densidad espectral
        
        Returns:
            Array normalizado [0.0-1.0] con un valor por segmento
        """
        # ─────────────────────────────────────────────────────────
        # Ajustar tamaño de segmento según BPM (si disponible)
        # ─────────────────────────────────────────────────────────
        if bpm and bpm > 0:
            # 8 compases = 32 beats
            segment_duration = (32 / bpm) * 60
            # Limitar entre 10-30 segundos
            segment_duration = max(10, min(30, segment_duration))
        else:
            segment_duration = self.segment_duration
        
        # ─────────────────────────────────────────────────────────
        # Configuración de ventanas para análisis espectral
        # ─────────────────────────────────────────────────────────
        hop_length = 512
        frame_length = 2048
        
        # ─────────────────────────────────────────────────────────
        # Calcular RMS (volumen)
        # ─────────────────────────────────────────────────────────
        rms = librosa.feature.rms(
            y=y, 
            frame_length=frame_length, 
            hop_length=hop_length
        )[0]
        
        # ─────────────────────────────────────────────────────────
        # Calcular Spectral Centroid (brillo)
        # ─────────────────────────────────────────────────────────
        centroid = librosa.feature.spectral_centroid(
            y=y, 
            sr=sr, 
            hop_length=hop_length
        )[0]
        
        # Normalizar centroid a [0-1]
        centroid_min = centroid.min()
        centroid_max = centroid.max()
        if centroid_max > centroid_min:
            centroid_norm = (centroid - centroid_min) / (centroid_max - centroid_min)
        else:
            centroid_norm = np.zeros_like(centroid)
        
        # ─────────────────────────────────────────────────────────
        # Combinar métricas: 70% RMS + 30% Centroid
        # ─────────────────────────────────────────────────────────
        # RMS captura volumen, Centroid captura densidad espectral
        energy = 0.7 * rms + 0.3 * centroid_norm
        
        # ─────────────────────────────────────────────────────────
        # Dividir en segmentos y promediar
        # ─────────────────────────────────────────────────────────
        samples_per_segment = int(segment_duration * sr / hop_length)
        num_segments = max(1, len(energy) // samples_per_segment)
        
        curve = []
        for i in range(num_segments):
            start = i * samples_per_segment
            end = min((i + 1) * samples_per_segment, len(energy))
            segment_energy = np.mean(energy[start:end])
            curve.append(segment_energy)
        
        # ─────────────────────────────────────────────────────────
        # Normalizar a [0-1]
        # ─────────────────────────────────────────────────────────
        curve = np.array(curve)
        curve_min = curve.min()
        curve_max = curve.max()
        
        if curve_max > curve_min:
            curve = (curve - curve_min) / (curve_max - curve_min)
        else:
            curve = np.ones_like(curve) * 0.5  # Energía constante
        
        return curve.tolist()
    
    def _detect_events(
        self, 
        energy_curve: List[float], 
        bpm: Optional[float],
        duration: float
    ) -> List[Dict]:
        """
        Detecta eventos musicales importantes:
        - Drops: Caídas abruptas de energía (>30%)
        - Peaks: Momentos de energía máxima sostenida
        - Buildups: Subidas graduales de energía
        
        Returns:
            Lista de eventos con tipo, tiempo y metadata
        """
        events = []
        curve = np.array(energy_curve)
        
        # Calcular duración de cada segmento
        if bpm and bpm > 0:
            segment_duration = (32 / bpm) * 60
            segment_duration = max(10, min(30, segment_duration))
        else:
            segment_duration = self.segment_duration
        
        # ─────────────────────────────────────────────────────────
        # 1. DETECTAR DROPS (caídas abruptas)
        # ─────────────────────────────────────────────────────────
        for i in range(1, len(curve)):
            drop_magnitude = curve[i-1] - curve[i]
            
            if drop_magnitude > self.DROP_THRESHOLD:
                time = i * segment_duration
                
                # Validar que no exceda duración
                if time <= duration:
                    events.append({
                        "type": "drop",
                        "time": round(time, 1),
                        "magnitude": round(drop_magnitude, 2)
                    })
        
        # ─────────────────────────────────────────────────────────
        # 2. DETECTAR PEAKS (energía máxima sostenida)
        # ─────────────────────────────────────────────────────────
        for i in range(len(curve)):
            if curve[i] > self.PEAK_THRESHOLD:
                # Verificar que se sostiene (siguiente segmento también alto)
                sustained = True
                if i < len(curve) - 1 and curve[i+1] < (self.PEAK_THRESHOLD - 0.15):
                    sustained = False
                
                if sustained:
                    time = i * segment_duration
                    
                    if time <= duration:
                        events.append({
                            "type": "peak",
                            "time": round(time, 1),
                            "energy": round(curve[i], 2)
                        })
        
        # ─────────────────────────────────────────────────────────
        # 3. DETECTAR BUILDUPS (subidas graduales)
        # ─────────────────────────────────────────────────────────
        min_segments = self.BUILDUP_MIN_SEGMENTS
        
        for i in range(len(curve) - min_segments):
            # Verificar subida sostenida
            is_buildup = all(
                curve[i+j+1] > curve[i+j] 
                for j in range(min_segments)
            )
            
            total_increase = curve[i+min_segments] - curve[i]
            
            if is_buildup and total_increase > self.BUILDUP_MIN_INCREASE:
                start_time = i * segment_duration
                end_time = (i + min_segments) * segment_duration
                
                if end_time <= duration:
                    events.append({
                        "type": "buildup",
                        "start": round(start_time, 1),
                        "end": round(end_time, 1),
                        "increase": round(total_increase, 2)
                    })
        
        # Ordenar eventos por tiempo
        events.sort(key=lambda x: x.get('time', x.get('start', 0)))
        
        return events
    
    def _identify_structure(
        self, 
        energy_curve: List[float], 
        duration: float,
        bpm: Optional[float]
    ) -> List[Dict]:
        """
        Identifica secciones macro de la canción:
        - Intro: Primeros segmentos con energía baja
        - Outro: Últimos segmentos con energía decreciente
        - Peak: Segmento(s) con energía máxima
        - Groove: Todo lo demás (cuerpo principal)
        
        Heurística simple pero efectiva para música electrónica.
        """
        structure = []
        curve = np.array(energy_curve)
        
        # Calcular duración de segmento
        if bpm and bpm > 0:
            segment_duration = (32 / bpm) * 60
            segment_duration = max(10, min(30, segment_duration))
        else:
            segment_duration = self.segment_duration
        
        # ─────────────────────────────────────────────────────────
        # 1. DETECTAR INTRO (energía baja al inicio)
        # ─────────────────────────────────────────────────────────
        intro_end_idx = 0
        for i, energy in enumerate(curve):
            if energy > self.INTRO_ENERGY_MAX:
                break
            intro_end_idx = i + 1
        
        if intro_end_idx > 0:
            intro_end = min(intro_end_idx * segment_duration, duration)
            structure.append({
                "section": "intro",
                "start": 0,
                "end": round(intro_end, 1)
            })
        
        # ─────────────────────────────────────────────────────────
        # 2. DETECTAR OUTRO (energía decreciente al final)
        # ─────────────────────────────────────────────────────────
        outro_start_idx = len(curve)
        
        for i in range(len(curve) - 1, 0, -1):
            # Verificar tendencia decreciente o energía baja
            if i > 0 and (curve[i] > curve[i-1] or curve[i] > 0.6):
                break
            outro_start_idx = i
        
        if outro_start_idx < len(curve):
            outro_start = outro_start_idx * segment_duration
            structure.append({
                "section": "outro",
                "start": round(outro_start, 1),
                "end": round(duration, 1)
            })
        else:
            outro_start_idx = len(curve)  # Para cálculo de groove
        
        # ─────────────────────────────────────────────────────────
        # 3. DETECTAR PEAK (energía máxima sostenida)
        # ─────────────────────────────────────────────────────────
        peak_idx = np.argmax(curve)
        
        if curve[peak_idx] > 0.8:
            # Encontrar rango completo del peak
            peak_start = peak_idx
            while peak_start > 0 and curve[peak_start - 1] > 0.7:
                peak_start -= 1
            
            peak_end = peak_idx
            while peak_end < len(curve) - 1 and curve[peak_end + 1] > 0.7:
                peak_end += 1
            
            peak_start_time = peak_start * segment_duration
            peak_end_time = min((peak_end + 1) * segment_duration, duration)
            
            structure.append({
                "section": "peak",
                "start": round(peak_start_time, 1),
                "end": round(peak_end_time, 1)
            })
        
        # ─────────────────────────────────────────────────────────
        # 4. DETECTAR GROOVE (lo que queda en el medio)
        # ─────────────────────────────────────────────────────────
        groove_start = intro_end_idx * segment_duration
        groove_end = outro_start_idx * segment_duration
        
        if groove_end > groove_start + segment_duration:  # Al menos 1 segmento
            structure.append({
                "section": "groove",
                "start": round(groove_start, 1),
                "end": round(groove_end, 1)
            })
        
        # Ordenar por tiempo
        structure.sort(key=lambda x: x['start'])
        
        return structure
    
    def _compute_no_cut_zones(
        self, 
        events: List[Dict], 
        structure: List[Dict]
    ) -> List[List[float]]:
        """
        Calcula zonas donde NO se debe cortar:
        - ±3s alrededor de drops
        - ±3s alrededor de peaks
        - Durante buildups completos
        
        Returns:
            Lista de rangos [start, end] con zonas críticas merged
        """
        zones = []
        buffer = 3.0  # segundos de margen
        
        # ─────────────────────────────────────────────────────────
        # Agregar zonas alrededor de eventos
        # ─────────────────────────────────────────────────────────
        for event in events:
            if event['type'] in ['drop', 'peak']:
                time = event['time']
                zones.append([
                    round(max(0, time - buffer), 1),
                    round(time + buffer, 1)
                ])
            
            elif event['type'] == 'buildup':
                # No cortar durante buildups
                zones.append([
                    round(event['start'], 1),
                    round(event['end'], 1)
                ])
        
        # ─────────────────────────────────────────────────────────
        # Merge zonas superpuestas
        # ─────────────────────────────────────────────────────────
        if not zones:
            return []
        
        zones.sort(key=lambda x: x[0])
        merged = [zones[0]]
        
        for current in zones[1:]:
            last = merged[-1]
            
            # Si se superponen o están muy cerca (< 2s), merge
            if current[0] <= last[1] + 2:
                merged[-1] = [last[0], max(last[1], current[1])]
            else:
                merged.append(current)
        
        return merged
    
    def _compute_safe_exit_points(
        self, 
        energy_curve: List[float], 
        structure: List[Dict],
        duration: float,
        bpm: Optional[float]
    ) -> List[float]:
        """
        Calcula puntos seguros para salir de la canción:
        - Energía estable y baja (<0.5)
        - Cambio mínimo con siguiente segmento (<0.1)
        - Evita extremos (primeros/últimos 10s)
        
        Returns:
            Lista de tiempos (segundos) donde es seguro iniciar transición
        """
        curve = np.array(energy_curve)
        
        if bpm and bpm > 0:
            segment_duration = (32 / bpm) * 60
            segment_duration = max(10, min(30, segment_duration))
        else:
            segment_duration = self.segment_duration
        
        safe_points = []
        
        # ─────────────────────────────────────────────────────────
        # Buscar segmentos con energía estable y baja
        # ─────────────────────────────────────────────────────────
        for i in range(len(curve) - 1):
            energy_low = curve[i] < 0.5
            change_minimal = abs(curve[i+1] - curve[i]) < 0.1
            
            if energy_low and change_minimal:
                time = (i + 1) * segment_duration
                
                # Evitar extremos
                if 10 < time < duration - 5:
                    safe_points.append(round(time, 1))
        
        # ─────────────────────────────────────────────────────────
        # Limitar a 3-5 sugerencias distribuidas uniformemente
        # ─────────────────────────────────────────────────────────
        if len(safe_points) > 5:
            step = len(safe_points) // 5
            safe_points = safe_points[::step][:5]
        
        return safe_points
    
    def _compute_dynamic_range(self, energy_curve: List[float]) -> float:
        """
        Calcula rango dinámico de la canción.
        
        Indica cuánto contraste energético tiene:
        - 0.0-0.3: Muy plana (poca variación)
        - 0.3-0.6: Moderada
        - 0.6-1.0: Alta dinámica (mucho contraste)
        
        Returns:
            Diferencia entre energía máxima y mínima [0-1]
        """
        curve = np.array(energy_curve)
        return float(curve.max() - curve.min())


# ═══════════════════════════════════════════════════════════
# FUNCIONES DE UTILIDAD
# ═══════════════════════════════════════════════════════════

def update_json_with_analysis(json_path: str, analysis: Dict) -> None:
    """
    Actualiza (o crea) un JSON con el bloque de análisis.
    Preserva todos los campos existentes.
    
    Args:
        json_path: Ruta al archivo JSON
        analysis: Diccionario de análisis generado
    """
    # ─────────────────────────────────────────────────────────
    # Leer JSON existente si existe
    # ─────────────────────────────────────────────────────────
    if os.path.exists(json_path):
        with open(json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        print(f"   📝 JSON existente encontrado")
    else:
        # Crear JSON mínimo si no existe
        data = {
            "bpm": None,  # Usuario debe completar MANUALMENTE
            "energy": 2,
            "vocals": "media",
            "mix_in": 0,
            "mix_out": analysis['duration']
        }
        print(f"   ⚠️  JSON no existía, creado con valores por defecto")
        print(f"   ⚠️  IMPORTANTE: Debes completar el campo 'bpm' manualmente")
    
    # ─────────────────────────────────────────────────────────
    # Añadir/actualizar análisis (sin tocar otros campos)
    # ─────────────────────────────────────────────────────────
    data['analysis'] = analysis
    
    # ─────────────────────────────────────────────────────────
    # Guardar con formato legible
    # ─────────────────────────────────────────────────────────
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"   ✅ JSON actualizado: {json_path}")


def main():
    """
    Punto de entrada principal del script.
    Parsea argumentos y procesa archivos.
    """
    import argparse
    
    parser = argparse.ArgumentParser(
        description='🎵 Analiza archivos de audio para DJ automático',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Ejemplos de uso:
  # Analizar una canción
  python analyze_track.py "musica/canciones/Chulo - Bad Gyal.mp3"
  
  # Analizar carpeta completa
  python analyze_track.py --batch musica/canciones/
  
  # Especificar carpeta de JSONs
  python analyze_track.py song.mp3 --json-dir output/json/
  
  # Proporcionar BPM conocido (mejora segmentación)
  python analyze_track.py song.mp3 --bpm 128
        """
    )
    
    parser.add_argument(
        'path',
        help='Archivo MP3 o carpeta con archivos de audio'
    )
    parser.add_argument(
        '--batch',
        action='store_true',
        help='Procesar todos los MP3 en la carpeta'
    )
    parser.add_argument(
        '--json-dir',
        default=None,
        help='Directorio donde guardar/actualizar JSONs (default: musica/json/)'
    )
    parser.add_argument(
        '--bpm',
        type=float,
        default=None,
        help='BPM conocido (mejora la segmentación)'
    )
    
    args = parser.parse_args()
    
    # ═══════════════════════════════════════════════════════════
    # Determinar archivos a procesar
    # ═══════════════════════════════════════════════════════════
    if args.batch:
        audio_files = list(Path(args.path).glob('*.mp3'))
        audio_files += list(Path(args.path).glob('*.wav'))
        audio_files += list(Path(args.path).glob('*.ogg'))
    else:
        audio_files = [Path(args.path)]
    
    if not audio_files:
        print("❌ No se encontraron archivos de audio")
        sys.exit(1)
    
    print(f"\n🎵 Procesando {len(audio_files)} archivo(s)...\n")
    print("=" * 70)
    
    # ═══════════════════════════════════════════════════════════
    # Inicializar analizador
    # ═══════════════════════════════════════════════════════════
    analyzer = AudioAnalyzer()
    
    # ═══════════════════════════════════════════════════════════
    # Procesar cada archivo
    # ═══════════════════════════════════════════════════════════
    success_count = 0
    error_count = 0
    
    for audio_path in audio_files:
        try:
            # ───────────────────────────────────────────────────
            # Analizar
            # ───────────────────────────────────────────────────
            analysis = analyzer.analyze(str(audio_path), bpm=args.bpm)
            
            # ───────────────────────────────────────────────────
            # Determinar ruta del JSON
            # ───────────────────────────────────────────────────
            if args.json_dir:
                json_dir = Path(args.json_dir)
            else:
                # Asumir estructura: musica/canciones/ → musica/json/
                json_dir = audio_path.parent.parent / 'json'
            
            json_dir.mkdir(parents=True, exist_ok=True)
            json_path = json_dir / f"{audio_path.stem}.json"
            
            # ───────────────────────────────────────────────────
            # Actualizar JSON
            # ───────────────────────────────────────────────────
            update_json_with_analysis(str(json_path), analysis)
            
            # ───────────────────────────────────────────────────
            # Resumen
            # ───────────────────────────────────────────────────
            print(f"   📊 Resumen:")
            print(f"      • Energy range: {min(analysis['energy_curve']):.2f} → {max(analysis['energy_curve']):.2f}")
            print(f"      • Dynamic range: {analysis['dynamic_range']:.2f}")
            print(f"      • Events: {len(analysis['events'])}")
            print(f"      • Sections: {len(analysis['structure'])}")
            print(f"      • No-cut zones: {len(analysis['no_cut_zones'])}")
            print(f"      • Safe exits: {len(analysis['safe_exit_points'])}")
            print()
            
            success_count += 1
            
        except Exception as e:
            print(f"   ❌ Error procesando {audio_path.name}:")
            print(f"      {str(e)}\n")
            error_count += 1
            continue
    
    # ═══════════════════════════════════════════════════════════
    # Resumen final
    # ═══════════════════════════════════════════════════════════
    print("=" * 70)
    print(f"\n✅ Análisis completado")
    print(f"   • Éxitos: {success_count}")
    print(f"   • Errores: {error_count}")
    print()
    
    if error_count > 0:
        sys.exit(1)


if __name__ == '__main__':
    main()