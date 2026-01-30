/**
 * Gestiona la reproducción de audio usando Web Audio API
 */
class AudioPlayer {
  constructor() {
    // Crear contexto de audio
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Almacén de buffers de audio en memoria
    this.tracks = new Map();
    
    console.log('🔊 AudioPlayer inicializado');
  }

  /**
   * Carga un archivo de audio en memoria
   * 
   * @param {string} trackId - Identificador único de la canción
   * @param {string} audioPath - Ruta al archivo MP3
   */
  async loadTrack(trackId, audioPath) {
    try {
      console.log(`⏳ Cargando: ${trackId}...`);
      
      // Descargar el archivo
      const response = await fetch(audioPath);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${audioPath}`);
      }
      
      // Convertir a ArrayBuffer
      const arrayBuffer = await response.arrayBuffer();
      
      // Decodificar audio
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      
      // Almacenar en memoria
      this.tracks.set(trackId, audioBuffer);
      
      console.log(
        `✅ ${trackId} cargado (${audioBuffer.duration.toFixed(1)}s, ` +
        `${audioBuffer.numberOfChannels} canales)`
      );
      
    } catch (error) {
      console.error(`❌ Error cargando ${trackId}:`, error);
      throw error;
    }
  }

  /**
   * Crea un nodo de reproducción para una canción
   * IMPORTANTE: No inicia la reproducción, solo prepara el nodo
   * 
   * @param {string} trackId - ID de la canción
   * @param {number} startTime - Desde dónde empezar (segundos)
   * @param {number} playbackRate - Velocidad de reproducción (1.0 = normal)
   * @returns {Object} {source, gainNode}
   */
  createSourceNode(trackId, startTime = 0, playbackRate = 1.0) {
    const buffer = this.tracks.get(trackId);
    
    if (!buffer) {
      throw new Error(`❌ Track "${trackId}" no está cargado en memoria`);
    }

    // 1. Crear nodo de fuente de audio
    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = playbackRate;

    // 2. Crear nodo de ganancia (volumen)
    const gainNode = this.audioContext.createGain();
    gainNode.gain.value = 0; // Empezar en silencio
    
    // 3. Conectar: source → gainNode → destino (parlantes)
    source.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    return { source, gainNode };
  }

  /**
   * Programa un crossfade suave entre dos canciones
   * TÉCNICA: Usa linearRampToValueAtTime para transiciones sin clics
   * 
   * @param {GainNode} fadeOutNode - Canción que se apaga
   * @param {GainNode} fadeInNode - Canción que entra
   * @param {number} duration - Duración del crossfade (segundos)
   */
  scheduleCrossfade(fadeOutNode, fadeInNode, duration) {
    const now = this.audioContext.currentTime;
    
    // Configurar valores iniciales
    fadeOutNode.gain.setValueAtTime(1.0, now);
    fadeInNode.gain.setValueAtTime(0.0, now);
    
    // Programar rampas lineales simultáneas
    fadeOutNode.gain.linearRampToValueAtTime(0.0, now + duration);
    fadeInNode.gain.linearRampToValueAtTime(1.0, now + duration);
    
    console.log(`🔀 Crossfade programado: ${duration}s`);
  }

  /**
   * Limpia recursos de una canción específica
   */
  unloadTrack(trackId) {
    this.tracks.delete(trackId);
    console.log(`🗑️ ${trackId} eliminado de memoria`);
  }

  /**
   * Limpia todos los recursos
   */
  cleanup() {
    this.tracks.clear();
    console.log('🗑️ Todos los tracks eliminados');
  }
}