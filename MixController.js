/**
 * Controlador principal del DJ automático
 * Integra todos los módulos y gestiona el flujo de reproducción
 * 
 * 🆕 FASE 3: Salida anticipada conservadora
 */
class MixController {
  constructor() {
    this.metadataLoader = new MetadataLoader();
    this.transitionCalc = new TransitionCalculator();
    this.audioPlayer = new AudioPlayer();
    this.trackSelector = new TrackSelector();
    this.fileScanner = new FileScanner();
    
    this.playlist = [];
    this.currentTrack = null;
    this.currentSource = null;
    this.currentGain = null;
    this.isPlaying = false;
    this.startTime = null;
    
    // ⭐ Tracking de energía
    this.energyStreak = { level: null, count: 0 };
    this.currentEnergyMode = 'keep'; // 'up' | 'keep' | 'down'
    
    // 🆕 FASE 3: Tracking de salidas anticipadas
    this.earlyExitsCount = 0;
    this.songsPlayed = 0;
    
    // 🆕 Constantes de salida anticipada
    this.EARLY_EXIT_CONFIG = {
      MIN_PLAY_TIME: 30,        // segundos mínimos de reproducción
      SAFE_TIME: 40,            // 🆕 tiempo mínimo ABSOLUTO que debe sonar
      MAX_REDUCTION: 20,        // 🆕 reducción máxima permitida (segundos)
      MAX_RATIO: 0.25,          // máximo 25% de canciones con salida anticipada
      STREAK_THRESHOLD: 3,      // cuántas canciones iguales para forzar cambio
      EXTREME_STREAK_THRESHOLD: 2, // umbral para energía extrema (1 o 3)
      REDUCTION_STREAK_BREAK: 15,   // segundos a quitar por streak largo
      REDUCTION_EXTREME: 20         // segundos a quitar por energía extrema
    };
  }

  /**
   * Prepara una canción: carga audio + metadata
   */
  async prepareTrack(trackId, audioPath, metadataPath) {
    const metadata = await this.metadataLoader.loadMetadata(metadataPath);
    await this.audioPlayer.loadTrack(trackId, audioPath);
    
    return { trackId, metadata };
  }

  /**
   * Carga toda la biblioteca de música
   */
  async loadLibrary(tracks) {
    console.log('📚 Cargando biblioteca de música...');
    
    for (const track of tracks) {
      try {
        const prepared = await this.prepareTrack(
          track.id,
          track.audioPath,
          track.metadataPath
        );
        this.playlist.push(prepared);
      } catch (error) {
        console.error(`❌ Error cargando ${track.id}:`, error);
      }
    }
    
    console.log(`✅ ${this.playlist.length} canciones disponibles`);
  }

  /**
   * 🆕 Carga automática escaneando carpetas
   */
  async autoLoadLibrary(songsFolder = 'musica/canciones', jsonFolder = 'musica/json') {
    console.log('🤖 Modo automático: escaneando carpetas...');
    
    const foundTracks = await this.fileScanner.scanMusicFolder(songsFolder, jsonFolder);
    
    if (foundTracks.length === 0) {
      throw new Error('❌ No se encontraron canciones con metadata válida');
    }
    
    await this.loadLibrary(foundTracks);
    
    return foundTracks;
  }

  /**
   * Inicia una canción
   */
  playTrack(trackId, metadata, targetBPM = null) {
    const playbackRate = targetBPM 
      ? this.transitionCalc.calculatePlaybackRate(metadata.bpm, targetBPM)
      : 1.0;

    const { source, gainNode } = this.audioPlayer.createSourceNode(
      trackId,
      metadata.mix_in,
      playbackRate
    );

    if (!this.isPlaying) {
      const ctx = this.audioPlayer.audioContext;
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(1.0, ctx.currentTime + 2);
    } else {
      gainNode.gain.value = 1.0;
    }

    source.start(0, metadata.mix_in);
    this.startTime = this.audioPlayer.audioContext.currentTime;

    this.currentTrack = { trackId, metadata };
    this.currentSource = source;
    this.currentGain = gainNode;
    this.isPlaying = true;

    console.log(
      `▶️ Reproduciendo: "${trackId}" ` +
      `(BPM: ${metadata.bpm}, Rate: ${playbackRate.toFixed(3)})`
    );
  }

  /**
   * ⭐ MODO AUTOMÁTICO
   */
  startAutoMode(context = {}) {
    if (this.playlist.length === 0) {
      throw new Error('❌ La biblioteca está vacía. Usa loadLibrary() primero.');
    }

    const firstTrack = this.playlist[
      Math.floor(Math.random() * this.playlist.length)
    ];
    
    console.log(`🎵 Iniciando con: "${firstTrack.trackId}"`);
    this.playTrack(firstTrack.trackId, firstTrack.metadata);
    
    this.trackSelector.addToRecent(firstTrack.trackId);
    this.updateEnergyStreak(firstTrack.metadata.energy);
    
    // 🆕 Incrementar contador de canciones (la primera también cuenta)
    this.songsPlayed++;
    
    this.scheduleNextAutoSelection(context);
  }

  /**
   * 🆕 FASE 3: Decisión de salida anticipada
   * 
   * @param {Object} currentMeta - metadata de la canción actual
   * @returns {Object} {allowed, reason, reductionSeconds}
   */
  shouldExitEarly(currentMeta) {
    const config = this.EARLY_EXIT_CONFIG;
    
    // ═══════════════════════════════════════════════════════════
    // 🆕 AJUSTE 1: Si energyMode === "keep" → NUNCA salir antes
    // ═══════════════════════════════════════════════════════════
    if (this.currentEnergyMode === 'keep') {
      return { 
        allowed: false, 
        reason: 'energy_mode_keep', 
        reductionSeconds: 0 
      };
    }
    
    // ═══════════════════════════════════════════════════════════
    // BARRERA 1: Tiempo mínimo de reproducción
    // ═══════════════════════════════════════════════════════════
    const totalDuration = currentMeta.mix_out - currentMeta.mix_in;
    
    // Necesitamos al menos MIN_PLAY_TIME + margen para poder cortar
    if (totalDuration < config.MIN_PLAY_TIME + 20) {
      return { 
        allowed: false, 
        reason: 'too_short', 
        reductionSeconds: 0 
      };
    }
    
    // ═══════════════════════════════════════════════════════════
    // BARRERA 2: Frecuencia de salidas anticipadas
    // ═══════════════════════════════════════════════════════════
    if (this.songsPlayed > 0) {
      const currentRatio = this.earlyExitsCount / this.songsPlayed;
      
      if (currentRatio >= config.MAX_RATIO) {
        console.log(
          `🚫 Quota de salidas anticipadas excedida: ` +
          `${this.earlyExitsCount}/${this.songsPlayed} = ${(currentRatio * 100).toFixed(0)}% ` +
          `(máx: ${config.MAX_RATIO * 100}%)`
        );
        return { 
          allowed: false, 
          reason: 'quota_exceeded', 
          reductionSeconds: 0 
        };
      }
    }
    
    // ═══════════════════════════════════════════════════════════
    // MOTIVO 1: Streak largo + cambio forzado
    // ═══════════════════════════════════════════════════════════
    if (this.energyStreak.count >= config.STREAK_THRESHOLD) {
      console.log(
        `⏩ Motivo detectado: STREAK_BREAK ` +
        `(${this.energyStreak.count} canciones en energy ${this.energyStreak.level}, ` +
        `energyMode: "${this.currentEnergyMode}")`
      );
      
      return { 
        allowed: true, 
        reason: 'streak_break', 
        reductionSeconds: config.REDUCTION_STREAK_BREAK 
      };
    }
    
    // ═══════════════════════════════════════════════════════════
    // MOTIVO 2: Energía extrema persistente
    // ═══════════════════════════════════════════════════════════
    const currentEnergy = currentMeta.energy;
    
    if (this.energyStreak.count >= config.EXTREME_STREAK_THRESHOLD) {
      // Caso A: Energía 3 persistente + necesidad de bajar
      if (currentEnergy === 3 && this.currentEnergyMode === 'down') {
        console.log(
          `⏩ Motivo detectado: HIGH_ENERGY_ESCAPE ` +
          `(${this.energyStreak.count} canciones en energy 3, bajando)`
        );
        
        return { 
          allowed: true, 
          reason: 'high_energy_escape', 
          reductionSeconds: config.REDUCTION_EXTREME 
        };
      }
      
      // Caso B: Energía 1 persistente + necesidad de subir
      if (currentEnergy === 1 && this.currentEnergyMode === 'up') {
        console.log(
          `⏩ Motivo detectado: LOW_ENERGY_ESCAPE ` +
          `(${this.energyStreak.count} canciones en energy 1, subiendo)`
        );
        
        return { 
          allowed: true, 
          reason: 'low_energy_escape', 
          reductionSeconds: config.REDUCTION_EXTREME 
        };
      }
    }
    
    // ═══════════════════════════════════════════════════════════
    // DEFAULT: No hay motivo para salir antes
    // ═══════════════════════════════════════════════════════════
    return { 
      allowed: false, 
      reason: 'no_trigger', 
      reductionSeconds: 0 
    };
  }

  /**
   * 🆕 FASE 3: Programa la próxima selección automática de canción
   * (con soporte para salida anticipada)
   */
  scheduleNextAutoSelection(context) {
    if (!this.currentTrack) return;

    const meta = this.currentTrack.metadata;
    const originalMixOut = meta.mix_out;
    
    // ═══════════════════════════════════════════════════════════
    // 🆕 DECISIÓN DE SALIDA ANTICIPADA
    // ═══════════════════════════════════════════════════════════
    const earlyExitDecision = this.shouldExitEarly(meta);
    
    let effectiveMixOut = originalMixOut;
    
    if (earlyExitDecision.allowed) {
      const proposedReduction = earlyExitDecision.reductionSeconds;
      const proposedMixOut = originalMixOut - proposedReduction;
      const proposedPlayTime = proposedMixOut - meta.mix_in;
      
      // ═══════════════════════════════════════════════════════════
      // 🆕 AJUSTE 2: VALIDACIÓN DE LÍMITES DE SEGURIDAD
      // ═══════════════════════════════════════════════════════════
      
      // LÍMITE 1: Nunca cortar si quedaría menos de SAFE_TIME
      if (proposedPlayTime < this.EARLY_EXIT_CONFIG.SAFE_TIME) {
        console.log(
          `🚫 Reducción bloqueada: quedarían ${proposedPlayTime.toFixed(1)}s ` +
          `(mínimo SAFE_TIME: ${this.EARLY_EXIT_CONFIG.SAFE_TIME}s)`
        );
        effectiveMixOut = originalMixOut; // mantener original
      }
      // LÍMITE 2: Nunca reducir más de MAX_REDUCTION segundos
      else if (proposedReduction > this.EARLY_EXIT_CONFIG.MAX_REDUCTION) {
        console.log(
          `🚫 Reducción bloqueada: se proponían ${proposedReduction}s ` +
          `(máximo: ${this.EARLY_EXIT_CONFIG.MAX_REDUCTION}s)`
        );
        effectiveMixOut = originalMixOut; // mantener original
      }
      // ✅ TODO OK: aplicar reducción
      else {
        effectiveMixOut = proposedMixOut;
        this.earlyExitsCount++;
        
        console.log(
          `⏩ SALIDA ANTICIPADA ACTIVADA ⏩\n` +
          `   Canción: "${this.currentTrack.trackId}"\n` +
          `   Motivo: ${earlyExitDecision.reason}\n` +
          `   Mix Out original: ${originalMixOut}s\n` +
          `   Mix Out efectivo: ${effectiveMixOut}s\n` +
          `   Reducción: -${proposedReduction}s\n` +
          `   Tiempo de reproducción: ${proposedPlayTime.toFixed(1)}s\n` +
          `   Ratio actual: ${this.earlyExitsCount}/${this.songsPlayed + 1} = ` +
          `${((this.earlyExitsCount / (this.songsPlayed + 1)) * 100).toFixed(0)}%`
        );
      }
    } else {
      console.log(
        `⏱️ Mix normal hasta ${originalMixOut}s ` +
        `(motivo no-salida: ${earlyExitDecision.reason})`
      );
    }
    
    // ═══════════════════════════════════════════════════════════
    // Calcular timing usando effectiveMixOut
    // ═══════════════════════════════════════════════════════════
    const playDuration = effectiveMixOut - meta.mix_in;
    const crossfadeDuration = this.transitionCalc.CROSSFADE_MIN;
    const timeUntilDecision = playDuration - crossfadeDuration - 2;
    
    console.log(
      `⏱️ Próxima decisión en ${timeUntilDecision.toFixed(1)}s ` +
      `(mix_out efectivo: ${effectiveMixOut}s)`
    );
    
    setTimeout(() => {
      // ⭐ PASO 1: DECIDIR INTENCIÓN
      this.currentEnergyMode = this.decideEnergyMode();
      console.log(`🎚️ Intención decidida: "${this.currentEnergyMode}" (basado en streak actual)`);
      
      const updatedContext = {
        ...context,
        energyDirection: this.currentEnergyMode
      };
      
      // ⭐ PASO 2: ELEGIR canción según la intención
      const available = this.getAvailableTracks();
      
      if (available.length === 0) {
        console.warn('⚠️ No hay más canciones disponibles');
        return;
      }
      
      const nextTrack = this.trackSelector.selectNextTrack(
        this.currentTrack,
        available,
        updatedContext
      );
      
      console.log(`✅ Elegida: "${nextTrack.trackId}" (energía ${nextTrack.metadata.energy})`);
      
      // ⭐ PASO 3: ACTUALIZAR STREAK
      this.updateEnergyStreak(nextTrack.metadata.energy);
      
      // Programar transición
      this.scheduleTransition(nextTrack, effectiveMixOut);
      
      // Después del crossfade, programar la siguiente
      setTimeout(() => {
        this.scheduleNextAutoSelection(context);
      }, crossfadeDuration * 1000 + 1000);
      
    }, timeUntilDecision * 1000);
  }

  /**
   * 🆕 Programa la transición (ahora acepta mixOut personalizado)
   */
  scheduleTransition(nextTrackData, effectiveMixOut) {
    if (!this.currentTrack) {
      throw new Error('❌ No hay canción actual');
    }

    // Usar effectiveMixOut en lugar de metadata.mix_out
    const transition = this.transitionCalc.calculateTransition(
      this.currentTrack,
      nextTrackData
    );

    if (transition.vocalConflict) {
      console.error(
        `⚠️⚠️⚠️ CONFLICTO VOCAL DETECTADO ⚠️⚠️⚠️\n` +
        `Esto NO debería pasar (la IA debería evitarlo)`
      );
    }

    const meta = this.currentTrack.metadata;
    const elapsed = this.audioPlayer.audioContext.currentTime - this.startTime;
    
    // 🆕 Calcular usando effectiveMixOut
    const timeUntilMixOut = (effectiveMixOut - meta.mix_in) - elapsed;
    const startDelay = Math.max(0, timeUntilMixOut - transition.crossfadeDuration);

    console.log(
      `🔄 Transición programada en ${startDelay.toFixed(1)}s ` +
      `(crossfade: ${transition.crossfadeDuration}s, ` +
      `mix_out efectivo: ${effectiveMixOut}s)`
    );

    setTimeout(() => {
      this.startNextTrack(nextTrackData, transition);
    }, startDelay * 1000);
  }

  /**
   * Inicia la siguiente canción con crossfade
   */
  startNextTrack(nextTrackData, transition) {
    const playbackRate = this.transitionCalc.calculatePlaybackRate(
      nextTrackData.metadata.bpm,
      this.currentTrack.metadata.bpm
    );

    const { source, gainNode } = this.audioPlayer.createSourceNode(
      nextTrackData.trackId,
      nextTrackData.metadata.mix_in,
      playbackRate
    );

    // ☆ CROSSFADE ☆
    this.audioPlayer.scheduleCrossfade(
      this.currentGain,
      gainNode,
      transition.crossfadeDuration
    );

    source.start(0, nextTrackData.metadata.mix_in);
    const newStartTime = this.audioPlayer.audioContext.currentTime;

    console.log(`🎵 Transición → "${nextTrackData.trackId}"`);

    const oldSource = this.currentSource;
    setTimeout(() => {
      if (oldSource) {
        oldSource.stop();
      }
    }, transition.crossfadeDuration * 1000 + 500);

    this.currentTrack = nextTrackData;
    this.currentSource = source;
    this.currentGain = gainNode;
    this.startTime = newStartTime;
    
    // 🆕 Incrementar contador de canciones
    this.songsPlayed++;
  }

  /**
   * Obtiene canciones disponibles (excluye la actual)
   */
  getAvailableTracks() {
    return this.playlist.filter(
      track => track.trackId !== this.currentTrack.trackId
    );
  }

  /**
   * ⭐ Actualiza el contador de energía consecutiva
   */
  updateEnergyStreak(newEnergy) {
    if (this.energyStreak.level === newEnergy) {
      this.energyStreak.count++;
    } else {
      this.energyStreak.level = newEnergy;
      this.energyStreak.count = 1;
    }
    
    console.log(`⚡ Streak: ${this.energyStreak.count} canciones en energía ${newEnergy}`);
  }

  /**
   * ⭐ Decide el modo de energía para la siguiente canción
   */
  decideEnergyMode() {
    const currentEnergy = this.currentTrack.metadata.energy;
    const config = this.EARLY_EXIT_CONFIG;
    
    // REGLA 1: Si llevas 3+ canciones en el mismo nivel → FORZAR cambio
    if (this.energyStreak.count >= config.STREAK_THRESHOLD) {
      console.log('🔄 Forzando cambio de energía (3+ canciones consecutivas)');
      
      if (currentEnergy === 3) return 'down';
      if (currentEnergy === 1) return 'up';
      
      return Math.random() < 0.5 ? 'up' : 'down';
    }
    
    // REGLA 2: En energía extrema (1 o 3), tender a volver al centro
    if (currentEnergy === 3) {
      return Math.random() < 0.7 ? 'down' : 'keep';
    }
    
    if (currentEnergy === 1) {
      return Math.random() < 0.7 ? 'up' : 'keep';
    }
    
    // REGLA 3: En energía media (2) → más libertad
    if (currentEnergy === 2) {
      const rand = Math.random();
      if (rand < 0.35) return 'up';
      if (rand < 0.70) return 'keep';
      return 'down';
    }
    
    return 'keep';
  }

  /**
   * Detiene la reproducción
   */
  stop() {
    if (this.currentSource) {
      this.currentSource.stop();
      this.isPlaying = false;
      console.log('⏹️ Reproducción detenida');
    }
  }
  
  /**
   * 🆕 Obtener estadísticas de salida anticipada
   */
  getEarlyExitStats() {
    return {
      earlyExitsCount: this.earlyExitsCount,
      songsPlayed: this.songsPlayed,
      ratio: this.songsPlayed > 0 ? this.earlyExitsCount / this.songsPlayed : 0,
      maxRatio: this.EARLY_EXIT_CONFIG.MAX_RATIO
    };
  }
}