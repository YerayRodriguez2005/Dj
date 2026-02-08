/**
 * Carga y valida archivos JSON de metadata
 * 🆕 FASE 4.0: Soporte para análisis offline opcional
 * FASE 3.5: Defaults inteligentes para metadata incompleta
 */
class MetadataLoader {
  constructor() {
    // Defaults conservadores para campos opcionales
    this.DEFAULTS = {
      energy: 2,           // Energía media (segura, compatible con todo)
      vocals: 'media',     // Nivel medio (evita conflictos alta+alta)
      mix_in: 0.5,         // 500ms de fade-in (entrada suave, evita cortes secos)
      mix_out: 60,         // 1:00 min (conservador, permite ajustar hacia arriba)
      analysis: null       // 🆕 Análisis offline es OPCIONAL
    };
    
    // Tracking de canciones que usan defaults
    this.tracksWithDefaults = new Set();
    this.tracksWithAnalysis = new Set();  // 🆕 Tracking de canciones con análisis
  }

  /**
   * Carga metadata desde un archivo JSON
   * Aplica defaults si faltan campos opcionales
   * 🆕 Valida análisis si existe
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
      
      // Aplicar defaults antes de validar
      const data = this.applyDefaults(rawData, jsonPath);
      
      // Validar (ahora con datos completos)
      this.validateMetadata(data, jsonPath);
      
      // 🆕 Validar análisis si existe
      if (data.analysis) {
        this.validateAnalysis(data.analysis, data, jsonPath);
        this.tracksWithAnalysis.add(jsonPath);
      }
      
      return data;
      
    } catch (error) {
      console.error(`❌ Error cargando metadata: ${jsonPath}`, error);
      throw error;
    }
  }

  /**
   * Aplica defaults a campos faltantes
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
    
    // 🆕 Analysis (opcional, default: null)
    // NO se agrega a appliedDefaults porque es ESPERADO que falte
    if (!('analysis' in rawData)) {
      data.analysis = this.DEFAULTS.analysis;
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
    
    // Validación extra: mix_out razonable
    if (data.mix_out < 20) {
      console.warn(
        `⚠️ ${source}: mix_out muy corto (${data.mix_out}s). ` +
        `Podría causar problemas en transiciones.`
      );
    }
  }

  // 🆕 ═══════════════════════════════════════════════════════════
  // 🆕 NUEVAS FUNCIONES PARA ANÁLISIS OFFLINE
  // 🆕 ═══════════════════════════════════════════════════════════

  /**
   * 🆕 Valida el bloque de análisis offline
   * IMPORTANTE: Esta validación es PERMISIVA (warnings, no errores)
   * 
   * @param {Object} analysis - Bloque de análisis
   * @param {Object} metadata - Metadata completa (para cross-validation)
   * @param {string} source - Nombre del archivo (para logs)
   */
  validateAnalysis(analysis, metadata, source = '') {
    const filename = source.split('/').pop();
    
    // ─────────────────────────────────────────────────────────
    // 1. Validar que sea un objeto
    // ─────────────────────────────────────────────────────────
    if (typeof analysis !== 'object' || analysis === null) {
      console.warn(
        `⚠️ ${filename}: analysis debe ser un objeto, ignorando análisis`
      );
      return;
    }
    
    // ─────────────────────────────────────────────────────────
    // 2. Verificar campos esperados (no obligatorios)
    // ─────────────────────────────────────────────────────────
    const expectedFields = [
      'version',
      'energy_curve',
      'events',
      'structure',
      'no_cut_zones',
      'safe_exit_points',
      'dynamic_range'
    ];
    
    const missingFields = expectedFields.filter(
      field => !(field in analysis)
    );
    
    if (missingFields.length > 0) {
      console.warn(
        `⚠️ ${filename}: analysis incompleto\n` +
        `   Campos faltantes: [${missingFields.join(', ')}]\n` +
        `   El análisis seguirá funcionando con campos disponibles`
      );
    }
    
    // ─────────────────────────────────────────────────────────
    // 3. Validar energy_curve (campo crítico)
    // ─────────────────────────────────────────────────────────
    if ('energy_curve' in analysis) {
      if (!Array.isArray(analysis.energy_curve)) {
        console.warn(
          `⚠️ ${filename}: energy_curve debe ser un array, ignorando`
        );
      } else if (analysis.energy_curve.length === 0) {
        console.warn(
          `⚠️ ${filename}: energy_curve está vacío`
        );
      } else {
        // Validar rango [0-1]
        const outOfRange = analysis.energy_curve.filter(
          v => typeof v !== 'number' || v < 0 || v > 1
        );
        
        if (outOfRange.length > 0) {
          console.warn(
            `⚠️ ${filename}: energy_curve contiene ${outOfRange.length} ` +
            `valores fuera del rango [0-1]`
          );
        }
      }
    }
    
    // ─────────────────────────────────────────────────────────
    // 4. Validar no_cut_zones (array de pares [start, end])
    // ─────────────────────────────────────────────────────────
    if ('no_cut_zones' in analysis) {
      if (!Array.isArray(analysis.no_cut_zones)) {
        console.warn(
          `⚠️ ${filename}: no_cut_zones debe ser un array`
        );
      } else {
        // Validar formato de cada zona
        const invalidZones = analysis.no_cut_zones.filter(
          zone => !Array.isArray(zone) || 
                  zone.length !== 2 || 
                  typeof zone[0] !== 'number' || 
                  typeof zone[1] !== 'number' ||
                  zone[0] >= zone[1]
        );
        
        if (invalidZones.length > 0) {
          console.warn(
            `⚠️ ${filename}: ${invalidZones.length} no_cut_zones inválidas ` +
            `(deben ser [start, end] con start < end)`
          );
        }
        
        // 🆕 CROSS-VALIDATION: Advertir si mix_out cae en zona crítica
        const mixOut = metadata.mix_out;
        for (const [start, end] of analysis.no_cut_zones) {
          if (mixOut >= start && mixOut <= end) {
            console.warn(
              `⚠️ ${filename}: mix_out (${mixOut}s) está en no_cut_zone ` +
              `[${start}-${end}s]\n` +
              `   El sistema intentará ajustar automáticamente el timing\n` +
              `   Considera actualizar mix_out manualmente a ${start - 2}s`
            );
          }
        }
      }
    }
    
    // ─────────────────────────────────────────────────────────
    // 5. Validar events (array de objetos)
    // ─────────────────────────────────────────────────────────
    if ('events' in analysis && Array.isArray(analysis.events)) {
      const validTypes = ['drop', 'peak', 'buildup'];
      const invalidEvents = analysis.events.filter(
        event => !event.type || !validTypes.includes(event.type)
      );
      
      if (invalidEvents.length > 0) {
        console.warn(
          `⚠️ ${filename}: ${invalidEvents.length} eventos con tipo inválido ` +
          `(válidos: drop, peak, buildup)`
        );
      }
    }
    
    // ─────────────────────────────────────────────────────────
    // 6. Validar structure (array de secciones)
    // ─────────────────────────────────────────────────────────
    if ('structure' in analysis && Array.isArray(analysis.structure)) {
      const validSections = ['intro', 'groove', 'peak', 'outro'];
      const invalidSections = analysis.structure.filter(
        section => !section.section || 
                   !validSections.includes(section.section) ||
                   typeof section.start !== 'number' ||
                   typeof section.end !== 'number' ||
                   section.start >= section.end
      );
      
      if (invalidSections.length > 0) {
        console.warn(
          `⚠️ ${filename}: ${invalidSections.length} secciones inválidas`
        );
      }
    }
    
    // ─────────────────────────────────────────────────────────
    // 7. Log de éxito
    // ─────────────────────────────────────────────────────────
    const curveLength = analysis.energy_curve?.length || 0;
    const eventsCount = analysis.events?.length || 0;
    const sectionsCount = analysis.structure?.length || 0;
    
    console.log(
      `✅ ${filename}: Análisis cargado correctamente\n` +
      `   • ${curveLength} segmentos de energía\n` +
      `   • ${eventsCount} eventos detectados\n` +
      `   • ${sectionsCount} secciones identificadas`
    );
  }

  /**
   * 🆕 Obtiene una sección específica del análisis
   * Helper para otros módulos (TrackSelector, TransitionCalculator)
   * 
   * @param {Object} metadata - Metadata completa de una canción
   * @param {string} sectionName - Nombre de la sección ('intro', 'outro', etc.)
   * @returns {Object|null} Sección encontrada o null
   */
  getSection(metadata, sectionName) {
    // Validación defensiva
    if (!metadata || !metadata.analysis || !metadata.analysis.structure) {
      return null;
    }
    
    const structure = metadata.analysis.structure;
    
    if (!Array.isArray(structure)) {
      return null;
    }
    
    return structure.find(s => s.section === sectionName) || null;
  }

  /**
   * 🆕 Verifica si una canción tiene análisis válido
   * 
   * @param {Object} metadata - Metadata completa
   * @returns {boolean}
   */
  hasAnalysis(metadata) {
    return metadata && 
           metadata.analysis !== null && 
           typeof metadata.analysis === 'object';
  }

  // ═══════════════════════════════════════════════════════════
  // FUNCIONES DE ESTADÍSTICAS (existentes + nuevas)
  // ═══════════════════════════════════════════════════════════

  /**
   * Obtener estadísticas de defaults aplicados
   * 🆕 Incluye estadísticas de análisis
   * @returns {Object} Estadísticas
   */
  getDefaultsStats() {
    return {
      tracksWithDefaults: Array.from(this.tracksWithDefaults),
      tracksWithAnalysis: Array.from(this.tracksWithAnalysis),  // 🆕
      countDefaults: this.tracksWithDefaults.size,
      countAnalysis: this.tracksWithAnalysis.size,  // 🆕
      defaults: this.DEFAULTS
    };
  }

  /**
   * Resetear estadísticas
   * 🆕 Incluye reset de análisis
   */
  resetStats() {
    this.tracksWithDefaults.clear();
    this.tracksWithAnalysis.clear();  // 🆕
  }
}