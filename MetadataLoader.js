/**
 * Carga y valida archivos JSON de metadata
 * 🆕 FASE 3.5: Defaults inteligentes para metadata incompleta
 */
class MetadataLoader {
  constructor() {
    // 🆕 Defaults conservadores para campos opcionales
    this.DEFAULTS = {
      energy: 2,           // Energía media (segura, compatible con todo)
      vocals: 'media',     // Nivel medio (evita conflictos alta+alta)
      mix_in: 0.5,         // 500ms de fade-in (entrada suave, evita cortes secos)
      mix_out: 60          // 1:00 min (conservador, permite ajustar hacia arriba)
    };
    
    // 🆕 Tracking de canciones que usan defaults
    this.tracksWithDefaults = new Set();
  }

  /**
   * Carga metadata desde un archivo JSON
   * 🆕 Aplica defaults si faltan campos opcionales
   * 
   * @param {string} jsonPath - Ruta al archivo JSON
   * @returns {Promise<Object>} Metadata completa (original + defaults)
   */
  async loadMetadata(jsonPath) {
    try {
      const response = await fetch(jsonPath);
      
      if (!response.ok) {
        throw new Error(`No se pudo cargar ${jsonPath}: ${response.status}`);
      }
      
      const rawData = await response.json();
      
      // 🆕 Aplicar defaults antes de validar
      const data = this.applyDefaults(rawData, jsonPath);
      
      // Validar (ahora con datos completos)
      this.validateMetadata(data, jsonPath);
      
      return data;
      
    } catch (error) {
      console.error(`❌ Error cargando metadata: ${jsonPath}`, error);
      throw error;
    }
  }

  /**
   * 🆕 Aplica defaults a campos faltantes
   * IMPORTANTE: Solo campos OPCIONALES. BPM es OBLIGATORIO.
   * 
   * @param {Object} rawData - Datos del JSON original
   * @param {string} source - Ruta del archivo (para logs)
   * @returns {Object} Datos completos
   */
  applyDefaults(rawData, source = '') {
    const data = { ...rawData };
    let appliedDefaults = [];
    
    // ═══════════════════════════════════════════════════════════
    // CAMPO OBLIGATORIO: BPM
    // ═══════════════════════════════════════════════════════════
    if (!('bpm' in rawData)) {
      throw new Error(
        `${source}: Campo OBLIGATORIO faltante: "bpm"\n` +
        `El BPM debe ser proporcionado manualmente (no hay default seguro)`
      );
    }
    
    // ═══════════════════════════════════════════════════════════
    // CAMPOS OPCIONALES: Aplicar defaults si faltan
    // ═══════════════════════════════════════════════════════════
    
    // Energy
    if (!('energy' in rawData)) {
      data.energy = this.DEFAULTS.energy;
      appliedDefaults.push('energy');
    }
    
    // Vocals
    if (!('vocals' in rawData)) {
      data.vocals = this.DEFAULTS.vocals;
      appliedDefaults.push('vocals');
    }
    
    // Mix In
    if (!('mix_in' in rawData)) {
      data.mix_in = this.DEFAULTS.mix_in;
      appliedDefaults.push('mix_in');
    }
    
    // Mix Out
    if (!('mix_out' in rawData)) {
      data.mix_out = this.DEFAULTS.mix_out;
      appliedDefaults.push('mix_out');
    }
    
    // ═══════════════════════════════════════════════════════════
    // Logging
    // ═══════════════════════════════════════════════════════════
    if (appliedDefaults.length > 0) {
      // Extraer nombre de archivo del path
      const filename = source.split('/').pop();
      
      console.warn(
        `⚠️ ${filename}: Metadata incompleta\n` +
        `   Campos aplicados por default: [${appliedDefaults.join(', ')}]\n` +
        `   Valores: energy=${data.energy}, vocals="${data.vocals}", ` +
        `mix_in=${data.mix_in}s, mix_out=${data.mix_out}s`
      );
      
      // Registrar para estadísticas
      this.tracksWithDefaults.add(filename);
    }
    
    return data;
  }

  /**
   * Valida que la metadata tenga todos los campos requeridos
   * (Ahora todos los campos están presentes gracias a applyDefaults)
   * 
   * @param {Object} data - Metadata a validar
   * @param {string} source - Nombre del archivo (para logs)
   */
  validateMetadata(data, source = '') {
    const required = ['bpm', 'mix_in', 'mix_out', 'vocals', 'energy'];
    const vocalsValid = ['alta', 'media', 'baja'];
    const energyValid = [1, 2, 3];
    
    // Verificar campos requeridos
    required.forEach(field => {
      if (!(field in data)) {
        throw new Error(`${source}: Campo requerido faltante: ${field}`);
      }
    });
    
    // Validar nivel de vocals
    if (!vocalsValid.includes(data.vocals)) {
      throw new Error(
        `${source}: Nivel de vocals inválido: "${data.vocals}". ` +
        `Debe ser: alta, media o baja`
      );
    }
    
    // Validar nivel de energy
    if (!energyValid.includes(data.energy)) {
      throw new Error(
        `${source}: Nivel de energy inválido: "${data.energy}". ` +
        `Debe ser: 1, 2 o 3`
      );
    }
    
    // Validar que mix_in sea menor que mix_out
    if (data.mix_in >= data.mix_out) {
      throw new Error(
        `${source}: mix_in (${data.mix_in}) debe ser menor que mix_out (${data.mix_out})`
      );
    }
    
    // Validar que sean números positivos
    if (data.bpm <= 0 || data.mix_in < 0 || data.mix_out <= 0) {
      throw new Error(`${source}: Los valores deben ser números positivos`);
    }
    
    // 🆕 Validación extra: mix_out razonable
    if (data.mix_out < 20) {
      console.warn(
        `⚠️ ${source}: mix_out muy corto (${data.mix_out}s). ` +
        `Podría causar problemas en transiciones.`
      );
    }
  }

  /**
   * 🆕 Obtener estadísticas de defaults aplicados
   * @returns {Object} Estadísticas
   */
  getDefaultsStats() {
    return {
      tracksWithDefaults: Array.from(this.tracksWithDefaults),
      count: this.tracksWithDefaults.size,
      defaults: this.DEFAULTS
    };
  }

  /**
   * 🆕 Resetear estadísticas
   */
  resetStats() {
    this.tracksWithDefaults.clear();
  }
}