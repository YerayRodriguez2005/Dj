/**
 * IA que selecciona la mejor canción siguiente
 * Toma decisiones basadas en múltiples criterios ponderados
 */
class TrackSelector {
  constructor() {
    // Pesos del algoritmo de decisión (suman ~1.0)
    this.weights = {
      bpmSimilarity: 0.35,      // 35% - Transiciones suaves
      vocalCompatibility: 0.30,  // 30% - Evitar conflictos
      energyFlow: 0.20,          // 20% - Progresión coherente
      recentlyPlayed: 0.15       // 15% - Variedad
    };
    
    // ⭐ Array de últimas canciones reproducidas
    this.recentTracks = [];
    this.RECENT_LIMIT = 3;  // Nunca repetir las últimas 3
    this.MIN_SCORE_THRESHOLD = 0.3;  // Score mínimo aceptable para evitar mezclas malas
  }

  /**
   * ★ FUNCIÓN PRINCIPAL ★
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
    
    // 3. Calcular score para cada candidato
    const scoredTracks = candidates.map(track => {
      const score = this.calculateScore(currentTrack, track, context);
      return { ...track, score };
    });
    
    // 4. Ordenar por score (mejor primero)
    scoredTracks.sort((a, b) => b.score - a.score);
    
    // 5. Verificar si el mejor score es aceptable
    const bestScore = scoredTracks[0].score;
    
    if (bestScore < this.MIN_SCORE_THRESHOLD) {
      console.warn(
        `⚠️ ADVERTENCIA: Mejor score es ${bestScore.toFixed(3)} ` +
        `(mínimo: ${this.MIN_SCORE_THRESHOLD}). ` +
        `La transición puede no ser ideal.`
      );
    }
    
    // 6. Log de decisión (top 3)
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
    
    // 7. Seleccionar ganador
    const winner = scoredTracks[0];
    console.log(`✅ Seleccionada: "${winner.trackId}" (Score: ${winner.score.toFixed(3)}, Energy: ${winner.metadata.energy})`);
    
    // 8. Actualizar array de recientes
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
   */
  calculateScore(currentTrack, candidateTrack, context) {
    const current = currentTrack.metadata;
    const candidate = candidateTrack.metadata;
    
    // Calcular sub-scores
    const scores = {
      bpm: this.scoreBPMSimilarity(current, candidate),
      vocal: this.scoreVocalCompatibility(current, candidate),
      energy: this.scoreEnergyFlow(current, candidate, context),
      recency: this.scoreRecency(candidateTrack.trackId)
    };
    
    // Score final ponderado
    const finalScore = 
      scores.bpm * this.weights.bpmSimilarity +
      scores.vocal * this.weights.vocalCompatibility +
      scores.energy * this.weights.energyFlow +
      scores.recency * this.weights.recentlyPlayed;
    
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