/**
 * Controlador principal del DJ automático
 * Integra todos los módulos y gestiona el flujo de reproducción
 */
class MixController {
  constructor() {
    this.metadataLoader = new MetadataLoader();
    this.transitionCalc = new TransitionCalculator();
    this.audioPlayer = new AudioPlayer();
    this.trackSelector = new TrackSelector();
    this.fileScanner = new FileScanner(); // ← NUEVO
    
    this.playlist = [];
    this.currentTrack = null;
    this.currentSource = null;
    this.currentGain = null;
    this.isPlaying = false;
    this.startTime = null;
  }

  /**
   * Prepara una canción: carga audio + metadata
   * 
   * @param {string} trackId - Nombre de la canción
   * @param {string} audioPath - Ruta al MP3
   * @param {string} metadataPath - Ruta al JSON
   * @returns {Promise<Object>} {trackId, metadata}
   */
  async prepareTrack(trackId, audioPath, metadataPath) {
    const metadata = await this.metadataLoader.loadMetadata(metadataPath);
    await this.audioPlayer.loadTrack(trackId, audioPath);
    
    return { trackId, metadata };
  }

  /**
   * Carga toda la biblioteca de música
   * 
   * @param {Array} tracks - [{id, audioPath, metadataPath}, ...]
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
  async autoLoadLibrary(songsFolder = 'musica/canciones', jsonFolder = 'musica/json') {
    console.log('🤖 Modo automático: escaneando carpetas...');
    
    // Escanear y obtener lista
    const foundTracks = await this.fileScanner.scanMusicFolder(songsFolder, jsonFolder);
    
    if (foundTracks.length === 0) {
      throw new Error('❌ No se encontraron canciones con metadata válida');
    }
    
    // Cargar todo
    await this.loadLibrary(foundTracks);
    
    return foundTracks;
  }

  /**
   * Inicia una canción
   * 
   * @param {string} trackId - ID de la canción
   * @param {Object} metadata - Metadata de la canción
   * @param {number|null} targetBPM - BPM objetivo (opcional)
   */
  playTrack(trackId, metadata, targetBPM = null) {
    // Calcular playbackRate si hay BPM objetivo
    const playbackRate = targetBPM 
      ? this.transitionCalc.calculatePlaybackRate(metadata.bpm, targetBPM)
      : 1.0;

    // Crear nodo de reproducción
    const { source, gainNode } = this.audioPlayer.createSourceNode(
      trackId,
      metadata.mix_in,
      playbackRate
    );

    // Fade in suave si es la primera canción
    if (!this.isPlaying) {
      const ctx = this.audioPlayer.audioContext;
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(1.0, ctx.currentTime + 2);
    } else {
      gainNode.gain.value = 1.0;
    }

    // Reproducir desde mix_in
    source.start(0, metadata.mix_in);
    this.startTime = this.audioPlayer.audioContext.currentTime;

    // Guardar estado
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
   * ★ MODO AUTOMÁTICO ★
   * La IA selecciona y mezcla canciones continuamente
   * 
   * @param {Object} context - {energyDirection, etc.}
   */
  startAutoMode(context = {}) {
    if (this.playlist.length === 0) {
      throw new Error('❌ La biblioteca está vacía. Usa loadLibrary() primero.');
    }

    // Seleccionar primera canción (aleatoria por ahora)
    const firstTrack = this.playlist[
      Math.floor(Math.random() * this.playlist.length)
    ];
    
    console.log(`🎵 Iniciando con: "${firstTrack.trackId}"`);
    this.playTrack(firstTrack.trackId, firstTrack.metadata);
    
    // Activar selección automática
    this.scheduleNextAutoSelection(context);
  }

  /**
   * Programa la próxima selección automática de canción
   */
  scheduleNextAutoSelection(context) {
    if (!this.currentTrack) return;

    const meta = this.currentTrack.metadata;
    const playDuration = meta.mix_out - meta.mix_in;
    const crossfadeDuration = this.transitionCalc.CROSSFADE_MIN;
    
    // Tiempo hasta que debe empezar la decisión
    const timeUntilDecision = playDuration - crossfadeDuration - 2; // 2s de margen
    
    console.log(
      `⏱️ Próxima decisión en ${timeUntilDecision.toFixed(1)}s ` +
      `(mix_out: ${meta.mix_out}s)`
    );
    
    setTimeout(() => {
      // ★ LA IA DECIDE AQUÍ ★
      const available = this.getAvailableTracks();
      
      if (available.length === 0) {
        console.warn('⚠️ No hay más canciones disponibles');
        return;
      }
      
      const nextTrack = this.trackSelector.selectNextTrack(
        this.currentTrack,
        available,
        context
      );
      
      // Programar transición
      this.scheduleTransition(nextTrack);
      
      // Después del crossfade, programar la siguiente
      setTimeout(() => {
        this.scheduleNextAutoSelection(context);
      }, crossfadeDuration * 1000 + 1000); // Esperar crossfade + 1s
      
    }, timeUntilDecision * 1000);
  }

  /**
   * Programa la transición a la siguiente canción
   */
  scheduleTransition(nextTrackData) {
    if (!this.currentTrack) {
      throw new Error('❌ No hay canción actual');
    }

    // Calcular detalles de la transición
    const transition = this.transitionCalc.calculateTransition(
      this.currentTrack,
      nextTrackData
    );

    // Advertir si hay conflicto vocal
    if (transition.vocalConflict) {
      console.error(
        `⚠️⚠️⚠️ CONFLICTO VOCAL DETECTADO ⚠️⚠️⚠️\n` +
        `Esto NO debería pasar (la IA debería evitarlo)`
      );
    }

    // Calcular cuándo empezar la siguiente
    const meta = this.currentTrack.metadata;
    const elapsed = this.audioPlayer.audioContext.currentTime - this.startTime;
    const timeUntilMixOut = (meta.mix_out - meta.mix_in) - elapsed;
    const startDelay = Math.max(0, timeUntilMixOut - transition.crossfadeDuration);

    console.log(
      `🔄 Transición programada en ${startDelay.toFixed(1)}s ` +
      `(crossfade: ${transition.crossfadeDuration}s)`
    );

    // Programar inicio de la siguiente
    setTimeout(() => {
      this.startNextTrack(nextTrackData, transition);
    }, startDelay * 1000);
  }

  /**
   * Inicia la siguiente canción con crossfade
   */
  startNextTrack(nextTrackData, transition) {
    // Calcular playbackRate para igualar BPMs
    const playbackRate = this.transitionCalc.calculatePlaybackRate(
      nextTrackData.metadata.bpm,
      this.currentTrack.metadata.bpm
    );

    // Crear nodo para la siguiente
    const { source, gainNode } = this.audioPlayer.createSourceNode(
      nextTrackData.trackId,
      nextTrackData.metadata.mix_in,
      playbackRate
    );

    // ★ CROSSFADE ★
    this.audioPlayer.scheduleCrossfade(
      this.currentGain,     // Fade out actual
      gainNode,             // Fade in siguiente
      transition.crossfadeDuration
    );

    // Iniciar reproducción
    source.start(0, nextTrackData.metadata.mix_in);
    const newStartTime = this.audioPlayer.audioContext.currentTime;

    console.log(`🎵 Transición → "${nextTrackData.trackId}"`);

    // Detener la anterior después del crossfade
    const oldSource = this.currentSource;
    setTimeout(() => {
      if (oldSource) {
        oldSource.stop();
      }
    }, transition.crossfadeDuration * 1000 + 500);

    // Actualizar estado
    this.currentTrack = nextTrackData;
    this.currentSource = source;
    this.currentGain = gainNode;
    this.startTime = newStartTime;
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
   * Detiene la reproducción
   */
  stop() {
    if (this.currentSource) {
      this.currentSource.stop();
      this.isPlaying = false;
      console.log('⏹️ Reproducción detenida');
    }
  }
}