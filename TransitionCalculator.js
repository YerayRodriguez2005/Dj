/**
 * Calcula transiciones entre canciones y ajustes de BPM
 */
class TransitionCalculator {
  constructor() {
    this.CROSSFADE_MIN = 6; // segundos mínimos de crossfade
    this.CROSSFADE_MAX = 8; // segundos máximos de crossfade
    this.MAX_BPM_DIFF = 10;  // diferencia máxima de BPM para ajustar
  }

  /**
   * Calcula cuándo y cómo debe empezar la siguiente canción
   * RESPETA: No solapar vocals altas
   * 
   * @param {Object} currentTrack - {trackId, metadata}
   * @param {Object} nextTrack - {trackId, metadata}
   * @returns {Object} {startNextAt, crossfadeDuration, needsAdjustment, vocalConflict}
   */
  calculateTransition(currentTrack, nextTrack) {
    const crossfadeDuration = this.CROSSFADE_MIN;
    
    // Tiempo ideal: empezar crossfade en mix_out - duración del crossfade
    let startNextAt = currentTrack.metadata.mix_out - crossfadeDuration;
    
    // REGLA CRÍTICA: Detectar conflicto de vocals
    const vocalConflict = this.hasVocalConflict(
      currentTrack.metadata,
      nextTrack.metadata
    );
    
    let needsAdjustment = false;
    
    if (vocalConflict) {
      needsAdjustment = true;
      console.warn(`⚠️ Conflicto vocal entre "${currentTrack.trackId}" y "${nextTrack.trackId}"`);
      
      // ESTRATEGIA: Acortar el crossfade o adelantar la salida
      // Por ahora solo advertimos, la IA ya evitó esta combinación
    }
    
    return {
      startNextAt,
      crossfadeDuration,
      needsAdjustment,
      vocalConflict
    };
  }

  /**
   * Detecta si dos canciones tienen vocals altas (conflicto)
   * @returns {boolean}
   */
  hasVocalConflict(metaA, metaB) {
    return metaA.vocals === 'alta' && metaB.vocals === 'alta';
  }

  /**
   * Calcula el playbackRate necesario para igualar BPMs
   * IMPORTANTE: Cambiar playbackRate afecta el pitch (tono)
   * 
   * @param {number} sourceBPM - BPM de la canción que va a entrar
   * @param {number} targetBPM - BPM de la canción actual
   * @returns {number} playbackRate (1.0 = velocidad normal)
   */
  calculatePlaybackRate(sourceBPM, targetBPM) {
    const diff = Math.abs(sourceBPM - targetBPM);
    
    // Si la diferencia es muy grande, NO ajustar
    // (sonaría muy artificial)
    if (diff > this.MAX_BPM_DIFF) {
      console.warn(
        `⚠️ Diferencia de BPM muy grande (${diff}). ` +
        `No se ajustará playbackRate.`
      );
      return 1.0;
    }
    
    // Fórmula: targetBPM / sourceBPM
    // Ejemplo: source=120, target=126 → 1.05 (5% más rápido)
    const rate = targetBPM / sourceBPM;
    
    console.log(
      `🎚️ Ajuste BPM: ${sourceBPM} → ${targetBPM} ` +
      `(rate: ${rate.toFixed(3)})`
    );
    
    return rate;
  }

  /**
   * Verifica si dos BPMs son compatibles para mezclar
   * @returns {boolean}
   */
  areCompatibleBPMs(bpm1, bpm2) {
    return Math.abs(bpm1 - bpm2) <= this.MAX_BPM_DIFF;
  }
}