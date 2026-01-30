/**
 * Carga y valida archivos JSON de metadata
 */
class MetadataLoader {
  /**
   * Carga metadata desde un archivo JSON
   * @param {string} jsonPath - Ruta al archivo JSON
   * @returns {Promise<Object>} Metadata validada
   */
  async loadMetadata(jsonPath) {
    try {
      const response = await fetch(jsonPath);
      
      if (!response.ok) {
        throw new Error(`No se pudo cargar ${jsonPath}: ${response.status}`);
      }
      
      const data = await response.json();
      this.validateMetadata(data, jsonPath);
      
      return data;
      
    } catch (error) {
      console.error(`❌ Error cargando metadata: ${jsonPath}`, error);
      throw error;
    }
  }

  /**
   * Valida que la metadata tenga todos los campos requeridos
   * @param {Object} data - Metadata a validar
   * @param {string} source - Nombre del archivo (para logs)
   */
  validateMetadata(data, source = '') {
    const required = ['bpm', 'mix_in', 'mix_out', 'vocals'];
    const vocalsValid = ['alta', 'media', 'baja'];
    
    // Verificar campos requeridos
    required.forEach(field => {
      if (!(field in data)) {
        throw new Error(`${source}: Campo requerido faltante: ${field}`);
      }
    });
    
    // Validar nivel de vocals
    if (!vocalsValid.includes(data.vocals)) {
      throw new Error(`${source}: Nivel de vocals inválido: "${data.vocals}". Debe ser: alta, media o baja`);
    }
    
    // Validar que mix_in sea menor que mix_out
    if (data.mix_in >= data.mix_out) {
      throw new Error(`${source}: mix_in (${data.mix_in}) debe ser menor que mix_out (${data.mix_out})`);
    }
    
    // Validar que sean números positivos
    if (data.bpm <= 0 || data.mix_in < 0 || data.mix_out <= 0) {
      throw new Error(`${source}: Los valores deben ser números positivos`);
    }
  }
}