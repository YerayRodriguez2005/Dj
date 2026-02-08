/**
 * Calcula transiciones entre canciones y ajustes de BPM
 * 🆕 FASE 4.0: Evita cortar en drops/peaks usando análisis offline
 */
class TransitionCalculator {
  constructor() {
    this.CROSSFADE_MIN = 6; // segundos mínimos de crossfade
    this.CROSSFADE_MAX = 8; // segundos máximos de crossfade
    this.MAX_BPM_DIFF = 10;  // diferencia máxima de BPM para ajustar
    this.NO_CUT_BUFFER = 2;  // 🆕 segundos de margen antes de zona crítica
  }

  /**
   * Calcula cuándo y cómo debe empezar la siguiente canción
   * RESPETA: No solapar vocals altas
   * 🆕 RESPETA: No cortar en drops/peaks (si hay análisis)
   * 
   * @param {Object} currentTrack - {trackId, metadata}
   * @param {Object} nextTrack - {trackId, metadata}
   * @returns {Object} {startNextAt, crossfadeDuration, needsAdjustment, vocalConflict}
   */
  calculateTransition(currentTrack, nextTrack) {
    const crossfadeDuration = this.CROSSFADE_MIN;
    
    // Tiempo ideal: empezar crossfade en mix_out - duración del crossfade
    let startNextAt = currentTrack.metadata.mix_out - crossfadeDuration;
    
    // 🆕 PASO NUEVO: Evitar zonas críticas si hay análisis
    if (currentTrack.metadata.analysis) {
      startNextAt = this.avoidNoCutZones(
        startNextAt,
        currentTrack.metadata.analysis,
        currentTrack.trackId
      );
    }
    
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

  // 🆕 ═══════════════════════════════════════════════════════════
  // 🆕 NUEVA FUNCIÓN: Evitar zonas críticas
  // 🆕 ═══════════════════════════════════════════════════════════

  /**
   * 🆕 Ajusta el timing de transición para evitar cortar en drops/peaks
   * 
   * ESTRATEGIA:
   * - Si el tiempo propuesto cae en una no_cut_zone, se mueve ANTES
   * - Se añade un buffer de seguridad (NO_CUT_BUFFER)
   * - Si no es posible evitar la zona, se usa el tiempo original
   * 
   * @param {number} proposedTime - Tiempo de inicio propuesto (segundos)
   * @param {Object} analysis - Bloque de análisis de la canción actual
   * @param {string} trackId - ID de la canción (para logging)
   * @returns {number} Tiempo ajustado (o el original si no hay conflicto)
   */
  avoidNoCutZones(proposedTime, analysis, trackId) {
    // ─────────────────────────────────────────────────────────
    // 1. Validación defensiva
    // ─────────────────────────────────────────────────────────
    if (!analysis || !analysis.no_cut_zones || !Array.isArray(analysis.no_cut_zones)) {
      // Sin zonas críticas definidas, usar tiempo original
      return proposedTime;
    }
    
    const noCutZones = analysis.no_cut_zones;
    
    if (noCutZones.length === 0) {
      // Array vacío, sin restricciones
      return proposedTime;
    }
    
    // ─────────────────────────────────────────────────────────
    // 2. Verificar si el tiempo propuesto cae en alguna zona crítica
    // ─────────────────────────────────────────────────────────
    for (const zone of noCutZones) {
      // Validar formato de zona
      if (!Array.isArray(zone) || zone.length !== 2) {
        console.warn(
          `⚠️ "${trackId}": no_cut_zone con formato inválido, ignorando`
        );
        continue;
      }
      
      const [zoneStart, zoneEnd] = zone;
      
      // Verificar que sean números válidos
      if (typeof zoneStart !== 'number' || typeof zoneEnd !== 'number') {
        continue;
      }
      
      // ❌ CONFLICTO DETECTADO: Tiempo propuesto dentro de zona crítica
      if (proposedTime >= zoneStart && proposedTime <= zoneEnd) {
        console.warn(
          `⚠️ "${trackId}": Transición propuesta (${proposedTime.toFixed(1)}s) ` +
          `cae en zona crítica [${zoneStart}-${zoneEnd}s]`
        );
        
        // ─────────────────────────────────────────────────────
        // 3. ESTRATEGIA DE AJUSTE: Mover ANTES de la zona
        // ─────────────────────────────────────────────────────
        const adjustedTime = zoneStart - this.NO_CUT_BUFFER;
        
        // Validar que el tiempo ajustado sea positivo
        if (adjustedTime < 0) {
          console.error(
            `❌ "${trackId}": No se puede evitar zona crítica (ajuste resultaría negativo)\n` +
            `   Zona: [${zoneStart}-${zoneEnd}s], Buffer: ${this.NO_CUT_BUFFER}s\n` +
            `   Usando tiempo original (${proposedTime.toFixed(1)}s)`
          );
          return proposedTime;
        }
        
        // Validar que no estemos cortando demasiado pronto
        // (al menos 10s de margen desde el inicio)
        if (adjustedTime < 10) {
          console.warn(
            `⚠️ "${trackId}": Tiempo ajustado muy temprano (${adjustedTime.toFixed(1)}s)\n` +
            `   Esto podría resultar en transición prematura\n` +
            `   Considera revisar mix_out o no_cut_zones manualmente`
          );
        }
        
        // ✅ AJUSTE EXITOSO
        console.log(
          `✅ "${trackId}": Transición ajustada\n` +
          `   ${proposedTime.toFixed(1)}s → ${adjustedTime.toFixed(1)}s ` +
          `(evita ${zoneEnd - zoneStart}s de zona crítica)`
        );
        
        return adjustedTime;
      }
    }
    
    // ─────────────────────────────────────────────────────────
    // 4. Sin conflictos: Usar tiempo original
    // ─────────────────────────────────────────────────────────
    return proposedTime;
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