/**
 * IA que selecciona la mejor canción siguiente
 * Toma decisiones basadas en múltiples criterios ponderados
 * 🆕 FASE 4.0: Considera compatibilidad estructural (outro → intro)
 */
class TrackSelector {
  constructor() {
    // Pesos del algoritmo de decisión (suman ~1.0)
    this.weights = {
      bpmSimilarity: 0.30,       // 30% - Transiciones suaves (bajado de 35%)
      vocalCompatibility: 0.30,  // 30% - Evitar conflictos
      energyFlow: 0.20,          // 20% - Progresión coherente
      recentlyPlayed: 0.15,      // 15% - Variedad
      structuralFit: 0.05        // 🆕 5% - Compatibilidad outro→intro
    };
    
    // ⭐ Array de últimas canciones reproducidas
    this.recentTracks = [];
    this.RECENT_LIMIT = 3;  // Nunca repetir las últimas 3
    this.MIN_SCORE_THRESHOLD = 0.3;  // Score mínimo aceptable para evitar mezclas malas
  }

  /**
   * ☆ FUNCIÓN PRINCIPAL ☆
   * Selecciona la mejor canción siguiente según contexto
   * 
   * @param {Object} currentTrack - {trackId, metadata}
   * @param {Array} availableTracks - Lista de canciones disponibles
   * @param {Object} context - {energyDirection, timeOfDay, etc.}
   * @returns {Object} Mejor canción con score
   */
  selectNextTrack(currentTrack, availableTracks, context = {}) {
    console.log('🤖 IA analizando opciones...');
    console.log(`📜 Últimas ${this.recentTracks.length} canciones: [${this.recentTracks.join(', ')}]`);
    
    // 1. Filtrar las últimas 3 canciones reproducidas + la actual
    let candidates = availableTracks.filter(
      track => !this.recentTracks.includes(track.trackId) && track.trackId !== currentTrack.trackId
    );
    
    // 2. Verificación de seguridad: si la biblioteca es muy pequeña (<=4 canciones)
    if (candidates.length === 0) {
      console.error('❌ ERROR: Biblioteca demasiado pequeña (≤4 canciones)');
      console.error('   No es posible evitar repetir las últimas 3 canciones');
      console.error('   Necesitas al menos 5 canciones en tu biblioteca');
      
      // Fallback: solo evitar la actual
      candidates = availableTracks.filter(
        track => track.trackId !== currentTrack.trackId
      );
      
      if (candidates.length === 0) {
        throw new Error('Sistema bloqueado: solo hay 1 canción disponible');
      }
    }
    
    // ⭐ 3. FILTRO DE ENERGÍA ESTRICTO basado en energyMode
    const energiaActual = currentTrack.metadata.energy;
    const energyDirection = context.energyDirection || 'keep';
    
    let candidatesFiltered;
    
    if (energyDirection === 'up') {
      // SOLO canciones con energía MAYOR
      candidatesFiltered = candidates.filter(
        track => track.metadata.energy > energiaActual
      );
      console.log(`⚡ Filtro ESTRICTO: subir desde ${energiaActual} → ${candidatesFiltered.length} candidatas`);
      
    } else if (energyDirection === 'down') {
      // SOLO canciones con energía MENOR
      candidatesFiltered = candidates.filter(
        track => track.metadata.energy < energiaActual
      );
      console.log(`⚡ Filtro ESTRICTO: bajar desde ${energiaActual} → ${candidatesFiltered.length} candidatas`);
      
    } else {
      // 'keep' → SOLO canciones con la MISMA energía
      candidatesFiltered = candidates.filter(
        track => track.metadata.energy === energiaActual
      );
      console.log(`⚡ Filtro ESTRICTO: mantener ${energiaActual} → ${candidatesFiltered.length} candidatas`);
    }
    
    // Fallback: si no hay ninguna candidata que cumpla, relajar a ±1
    if (candidatesFiltered.length === 0) {
      console.warn(`⚠️ No hay canciones que cumplan energyMode "${energyDirection}"`);
      console.warn(`   Relajando filtro a energía ${energiaActual} ±1`);
      
      candidatesFiltered = candidates.filter(
        track => Math.abs(track.metadata.energy - energiaActual) <= 1
      );
    }
    
    // Fallback final: si AÚN no hay ninguna, permitir cualquier energía
    if (candidatesFiltered.length === 0) {
      console.error(`❌ No hay canciones con energía cercana a ${energiaActual}`);
      console.error(`   Permitiendo CUALQUIER energía (biblioteca muy limitada)`);
      candidatesFiltered = candidates;
    }
    
    candidates = candidatesFiltered;
    
    // 4. Calcular score para cada candidato
    const scoredTracks = candidates.map(track => {
      const score = this.calculateScore(currentTrack, track, context);
      return { ...track, score };
    });
    
    // 5. Ordenar por score (mejor primero)
    scoredTracks.sort((a, b) => b.score - a.score);
    
    // 6. Verificar si el mejor score es aceptable
    const bestScore = scoredTracks[0].score;
    
    if (bestScore < this.MIN_SCORE_THRESHOLD) {
      console.warn(
        `⚠️ ADVERTENCIA: Mejor score es ${bestScore.toFixed(3)} ` +
        `(mínimo: ${this.MIN_SCORE_THRESHOLD}). ` +
        `La transición puede no ser ideal.`
      );
    }
    
    // 7. Log de decisión (top 3)
    console.log('📊 Top candidatos:');
    scoredTracks.slice(0, 3).forEach((track, i) => {
      const isRecent = this.recentTracks.includes(track.trackId) ? ' [RECIENTE]' : '';
      console.log(
        `  ${i + 1}. "${track.trackId}" ` +
        `(Score: ${track.score.toFixed(3)}, ` +
        `BPM: ${track.metadata.bpm}, ` +
        `Energy: ${track.metadata.energy}, ` +
        `Vocals: ${track.metadata.vocals})${isRecent}`
      );
    });
    
    // 8. Seleccionar ganador
    const winner = scoredTracks[0];
    console.log(`✅ Seleccionada: "${winner.trackId}" (Score: ${winner.score.toFixed(3)}, Energy: ${winner.metadata.energy})`);
    
    // 9. Actualizar array de recientes
    this.addToRecent(winner.trackId);
    
    return winner;
  }

  /**
   * Agrega una canción al array de recientes
   * Mantiene solo las últimas RECENT_LIMIT canciones
   */
  addToRecent(trackId) {
    // Agregar al inicio del array
    this.recentTracks.unshift(trackId);
    
    // Mantener solo las últimas 3
    if (this.recentTracks.length > this.RECENT_LIMIT) {
      this.recentTracks.pop();
    }
    
    console.log(`📝 Array de recientes actualizado: [${this.recentTracks.join(', ')}]`);
  }

  /**
   * Calcula score de compatibilidad (0.0 a 1.0)
   * Combina múltiples factores con pesos configurables
   * 🆕 Incluye nuevo criterio: structuralFit
   */
  calculateScore(currentTrack, candidateTrack, context) {
    const current = currentTrack.metadata;
    const candidate = candidateTrack.metadata;
    
    // Calcular sub-scores
    const scores = {
      bpm: this.scoreBPMSimilarity(current, candidate),
      vocal: this.scoreVocalCompatibility(current, candidate),
      energy: this.scoreEnergyFlow(current, candidate, context),
      recency: this.scoreRecency(candidateTrack.trackId),
      structural: this.scoreStructuralFit(currentTrack, candidateTrack)  // 🆕
    };
    
    // Score final ponderado
    const finalScore = 
      scores.bpm * this.weights.bpmSimilarity +
      scores.vocal * this.weights.vocalCompatibility +
      scores.energy * this.weights.energyFlow +
      scores.recency * this.weights.recentlyPlayed +
      scores.structural * this.weights.structuralFit;  // 🆕
    
    return finalScore;
  }

  /**
   * CRITERIO 1: Similitud de BPM
   * Cuanto más cercano, mejor la transición
   */
  scoreBPMSimilarity(currentMeta, candidateMeta) {
    const diff = Math.abs(currentMeta.bpm - candidateMeta.bpm);
    
    // Tabla de puntuación por diferencia
    if (diff <= 3) return 1.0;   // Perfecto (casi igual)
    if (diff <= 6) return 0.8;   // Muy bueno
    if (diff <= 10) return 0.5;  // Aceptable
    return 0.2;                   // Malo (muy diferente)
  }

  /**
   * CRITERIO 2: Compatibilidad vocal
   * REGLA DURA: NUNCA alta + alta
   */
  scoreVocalCompatibility(currentMeta, candidateMeta) {
    const current = currentMeta.vocals;
    const candidate = candidateMeta.vocals;
    
    // Matriz de compatibilidad
    const matrix = {
      'alta': {
        'alta': 0.0,   // ❌ PROHIBIDO
        'media': 0.8,  // Aceptable
        'baja': 1.0    // ✅ Contraste perfecto
      },
      'media': {
        'alta': 0.9,
        'media': 0.9,
        'baja': 0.9
      },
      'baja': {
        'alta': 1.0,   // ✅ Impacto
        'media': 0.9,
        'baja': 0.7    // Puede ser monótono
      }
    };
    
    return matrix[current][candidate];
  }

  /**
   * CRITERIO 3: Flujo de energía
   * Basado en el nivel de energía de las canciones
   */
  scoreEnergyFlow(currentMeta, candidateMeta, context) {
    const direction = context.energyDirection || 'keep';
    const currentEnergy = currentMeta.energy;
    const candidateEnergy = candidateMeta.energy;
    const energyChange = candidateEnergy - currentEnergy;
    
    if (direction === 'up') {
      // Queremos SUBIR energía
      if (energyChange > 0) return 1.0;  // ✅ Sube energía
      if (energyChange === 0) return 0.6; // Mantiene (no ideal)
      return 0.3; // ❌ Baja (malo)
      
    } else if (direction === 'down') {
      // Queremos BAJAR energía
      if (energyChange < 0) return 1.0;  // ✅ Baja energía
      if (energyChange === 0) return 0.6; // Mantiene (no ideal)
      return 0.3; // ❌ Sube (malo)
      
    } else {
      // Queremos MANTENER ('keep')
      if (energyChange === 0) return 1.0; // ✅ Mantiene perfecto
      if (Math.abs(energyChange) === 1) return 0.7; // Cambio leve
      return 0.4; // Cambio grande
    }
  }

  /**
   * CRITERIO 4: Penalizar canciones en el array de recientes
   */
  scoreRecency(trackId) {
    const index = this.recentTracks.indexOf(trackId);
    
    if (index === -1) {
      // No está en las recientes
      return 1.0;
    }
    
    // Está en las recientes: penalizar proporcionalmente
    // Posición 0 (más reciente) = score 0.0
    // Posición 2 (menos reciente) = score 0.3
    const penalty = 1.0 - ((this.RECENT_LIMIT - index) / this.RECENT_LIMIT);
    return penalty;
  }

  // 🆕 ═══════════════════════════════════════════════════════════
  // 🆕 CRITERIO 5: COMPATIBILIDAD ESTRUCTURAL (NUEVO)
  // 🆕 ═══════════════════════════════════════════════════════════

  /**
   * 🆕 CRITERIO 5: Compatibilidad estructural (outro → intro)
   * 
   * Evalúa qué tan bien encaja el outro de la canción actual
   * con el intro de la canción candidata.
   * 
   * FILOSOFÍA:
   * - Outro tranquilo → Intro tranquilo = PERFECTO (transición suave)
   * - Outro enérgico → Intro enérgico = BUENO (continuidad)
   * - Outro tranquilo → Intro enérgico = MALO (choque)
   * - Outro enérgico → Intro tranquilo = ACEPTABLE (contraste controlado)
   * 
   * @param {Object} currentTrack - Canción actual (con metadata completa)
   * @param {Object} candidateTrack - Canción candidata (con metadata completa)
   * @returns {number} Score 0.0-1.0 (0.5 = neutro si no hay análisis)
   */
  scoreStructuralFit(currentTrack, candidateTrack) {
    const currentMeta = currentTrack.metadata;
    const candidateMeta = candidateTrack.metadata;
    
    // ─────────────────────────────────────────────────────────
    // 1. Validación: Si falta análisis en cualquiera, score neutro
    // ─────────────────────────────────────────────────────────
    if (!currentMeta.analysis || !candidateMeta.analysis) {
      return 0.5;  // Neutro: no penaliza ni premia
    }
    
    // ─────────────────────────────────────────────────────────
    // 2. Extraer secciones outro e intro
    // ─────────────────────────────────────────────────────────
    const currentOutro = this.getSection(currentMeta.analysis, 'outro');
    const candidateIntro = this.getSection(candidateMeta.analysis, 'intro');
    
    // Si no se detectaron estas secciones, score neutro
    if (!currentOutro || !candidateIntro) {
      return 0.5;
    }
    
    // ─────────────────────────────────────────────────────────
    // 3. Calcular energía promedio del outro e intro
    // ─────────────────────────────────────────────────────────
    const outroEnergy = this.getSectionEnergy(
      currentMeta.analysis,
      currentOutro
    );
    
    const introEnergy = this.getSectionEnergy(
      candidateMeta.analysis,
      candidateIntro
    );
    
    // Si no se pudo calcular energía, score neutro
    if (outroEnergy === null || introEnergy === null) {
      return 0.5;
    }
    
    // ─────────────────────────────────────────────────────────
    // 4. REGLAS DE COMPATIBILIDAD ESTRUCTURAL
    // ─────────────────────────────────────────────────────────
    
    // REGLA 1: ✅ Outro tranquilo → Intro tranquilo (IDEAL)
    if (outroEnergy < 0.4 && introEnergy < 0.4) {
      console.log(
        `🎯 Encaje estructural PERFECTO: ` +
        `outro tranquilo (${outroEnergy.toFixed(2)}) → ` +
        `intro tranquilo (${introEnergy.toFixed(2)})`
      );
      return 1.0;
    }
    
    // REGLA 2: ✅ Outro enérgico → Intro enérgico (CONTINUIDAD)
    if (outroEnergy > 0.7 && introEnergy > 0.7) {
      console.log(
        `🎯 Encaje estructural BUENO: ` +
        `outro enérgico (${outroEnergy.toFixed(2)}) → ` +
        `intro enérgico (${introEnergy.toFixed(2)})`
      );
      return 0.9;
    }
    
    // REGLA 3: ⚠️ Outro enérgico → Intro tranquilo (CONTRASTE)
    // Aceptable en algunos contextos (ej: cambio de ambiente)
    if (outroEnergy > 0.6 && introEnergy < 0.4) {
      return 0.6;
    }
    
    // REGLA 4: ❌ Outro tranquilo → Intro enérgico (CHOQUE)
    // Genera un salto abrupto, generalmente no deseable
    if (outroEnergy < 0.4 && introEnergy > 0.7) {
      console.log(
        `⚠️ Encaje estructural MALO: ` +
        `outro tranquilo (${outroEnergy.toFixed(2)}) → ` +
        `intro muy enérgico (${introEnergy.toFixed(2)})`
      );
      return 0.3;
    }
    
    // REGLA 5: Caso general - diferencia mínima es mejor
    const energyDiff = Math.abs(outroEnergy - introEnergy);
    const score = Math.max(0.4, 1.0 - energyDiff);
    
    return score;
  }

  // 🆕 ═══════════════════════════════════════════════════════════
  // 🆕 FUNCIONES HELPER PARA ANÁLISIS
  // 🆕 ═══════════════════════════════════════════════════════════

  /**
   * 🆕 Extrae una sección específica del análisis
   * 
   * @param {Object} analysis - Bloque de análisis
   * @param {string} sectionName - Nombre de la sección ('intro', 'outro', etc.)
   * @returns {Object|null} Sección encontrada o null
   */
  getSection(analysis, sectionName) {
    // Validación defensiva
    if (!analysis || !analysis.structure || !Array.isArray(analysis.structure)) {
      return null;
    }
    
    return analysis.structure.find(s => s.section === sectionName) || null;
  }

  /**
   * 🆕 Calcula la energía promedio de una sección
   * 
   * MÉTODO:
   * - Usa energy_curve para obtener valores de energía por segmento
   * - Identifica qué segmentos caen dentro de la sección
   * - Calcula el promedio de esos segmentos
   * 
   * @param {Object} analysis - Bloque de análisis
   * @param {Object} section - Sección (con start y end)
   * @returns {number|null} Energía promedio [0-1] o null si no se puede calcular
   */
  getSectionEnergy(analysis, section) {
    // Validación defensiva
    if (!analysis || !analysis.energy_curve || !Array.isArray(analysis.energy_curve)) {
      return null;
    }
    
    if (!section || typeof section.start !== 'number' || typeof section.end !== 'number') {
      return null;
    }
    
    const energyCurve = analysis.energy_curve;
    const duration = analysis.duration;
    
    if (!duration || energyCurve.length === 0) {
      return null;
    }
    
    // ─────────────────────────────────────────────────────────
    // Calcular duración de cada segmento en la curva
    // ─────────────────────────────────────────────────────────
    const segmentDuration = duration / energyCurve.length;
    
    // ─────────────────────────────────────────────────────────
    // Encontrar índices de segmentos que caen en la sección
    // ─────────────────────────────────────────────────────────
    const startIdx = Math.floor(section.start / segmentDuration);
    const endIdx = Math.ceil(section.end / segmentDuration);
    
    // Validar índices
    const validStartIdx = Math.max(0, startIdx);
    const validEndIdx = Math.min(energyCurve.length, endIdx);
    
    if (validStartIdx >= validEndIdx) {
      return null;  // Sección vacía o fuera de rango
    }
    
    // ─────────────────────────────────────────────────────────
    // Extraer energías de esos segmentos
    // ─────────────────────────────────────────────────────────
    const sectionEnergies = energyCurve.slice(validStartIdx, validEndIdx);
    
    if (sectionEnergies.length === 0) {
      return null;
    }
    
    // ─────────────────────────────────────────────────────────
    // Calcular promedio
    // ─────────────────────────────────────────────────────────
    const sum = sectionEnergies.reduce((acc, val) => acc + val, 0);
    const avg = sum / sectionEnergies.length;
    
    return avg;
  }

  /**
   * Limpia el historial de canciones recientes
   */
  clearHistory() {
    this.recentTracks = [];
    console.log('🗑️ Historial de canciones recientes limpiado');
  }

  /**
   * Obtiene estadísticas del selector
   */
  getStats() {
    return {
      recentTracks: [...this.recentTracks],
      recentLimit: this.RECENT_LIMIT,
      minScoreThreshold: this.MIN_SCORE_THRESHOLD,
      weights: { ...this.weights }
    };
  }
}