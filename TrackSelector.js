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
    
    // Historial de reproducción
    this.playHistory = [];
    this.MAX_HISTORY = 10;
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
    
    // 1. Filtrar canciones reproducidas recientemente
    let candidates = this.filterRecentlyPlayed(availableTracks);
    
    // Si todas fueron reproducidas, resetear historial
    if (candidates.length === 0) {
      console.warn('⚠️ Todas las canciones fueron reproducidas. Reseteando historial.');
      this.playHistory = [];
      candidates = availableTracks.filter(
        t => t.trackId !== currentTrack.trackId
      );
    }
    
    // 2. Calcular score para cada candidato
    const scoredTracks = candidates.map(track => {
      const score = this.calculateScore(currentTrack, track, context);
      return { ...track, score };
    });
    
    // 3. Ordenar por score (mejor primero)
    scoredTracks.sort((a, b) => b.score - a.score);
    
    // 4. Log de decisión (top 3)
    console.log('📊 Top candidatos:');
    scoredTracks.slice(0, 3).forEach((track, i) => {
      console.log(
        `  ${i + 1}. "${track.trackId}" ` +
        `(Score: ${track.score.toFixed(3)}, ` +
        `BPM: ${track.metadata.bpm}, ` +
        `Vocals: ${track.metadata.vocals})`
      );
    });
    
    // 5. Seleccionar ganador
    const winner = scoredTracks[0];
    console.log(`✅ Seleccionada: "${winner.trackId}"`);
    
    // 6. Agregar al historial
    this.playHistory.push(winner.trackId);
    if (this.playHistory.length > this.MAX_HISTORY) {
      this.playHistory.shift(); // Eliminar la más antigua
    }
    
    return winner;
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
   * Basado en cambio de BPM
   */
  scoreEnergyFlow(currentMeta, candidateMeta, context) {
    const energyChange = candidateMeta.bpm - currentMeta.bpm;
    const direction = context.energyDirection || 'neutral';
    
    if (direction === 'up') {
      // Queremos subir energía → preferir BPMs más altos
      return energyChange > 0 ? 1.0 : 0.5;
    } else if (direction === 'down') {
      // Queremos bajar energía → preferir BPMs más bajos
      return energyChange < 0 ? 1.0 : 0.5;
    } else {
      // Neutral → preferir cambios moderados
      const absChange = Math.abs(energyChange);
      if (absChange <= 5) return 1.0;
      if (absChange <= 10) return 0.7;
      return 0.4;
    }
  }

  /**
   * CRITERIO 4: Penalizar canciones recientes
   */
  scoreRecency(trackId) {
    const index = this.playHistory.indexOf(trackId);
    
    if (index === -1) {
      return 1.0; // Nunca reproducida
    }
    
    // Cuanto más reciente, menor score
    const recency = (this.MAX_HISTORY - index) / this.MAX_HISTORY;
    return 1.0 - recency;
  }

  /**
   * Filtra canciones reproducidas hace poco
   */
  filterRecentlyPlayed(tracks) {
    const MIN_GAP = 5; // No repetir hasta 5 canciones después
    
    return tracks.filter(track => {
      const lastIndex = this.playHistory.indexOf(track.trackId);
      
      if (lastIndex === -1) return true; // Nunca reproducida
      
      const gap = this.playHistory.length - lastIndex;
      return gap >= MIN_GAP;
    });
  }
}