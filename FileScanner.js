/**
 * Escanea automáticamente la carpeta de música
 * y construye la biblioteca sin configuración manual
 */
class FileScanner {
  constructor() {
    this.audioExtensions = ['.mp3', '.wav', '.ogg', '.m4a'];
  }

  /**
   * Escanea carpeta y construye biblioteca automáticamente
   * IMPORTANTE: Solo funciona si los archivos siguen la convención:
   * - Audio: musica/canciones/NombreCancion.mp3
   * - JSON:  musica/json/NombreCancion.json
   * 
   * @param {string} songsFolder - Ruta a carpeta de canciones
   * @param {string} jsonFolder - Ruta a carpeta de JSONs
   * @returns {Promise<Array>} Lista de tracks encontrados
   */
  async scanMusicFolder(songsFolder = 'musica/canciones', jsonFolder = 'musica/json') {
    console.log('🔍 Escaneando carpeta de música...');
    
    try {
      // Obtener lista de archivos del servidor
      const files = await this.fetchFileList(songsFolder);
      
      const tracks = [];
      
      for (const file of files) {
        // Verificar que sea un archivo de audio
        if (!this.isAudioFile(file)) continue;
        
        // Extraer nombre base (sin extensión)
        const baseName = this.getBaseName(file);
        
        // Construir rutas
        const audioPath = `${songsFolder}/${file}`;
        const metadataPath = `${jsonFolder}/${baseName}.json`;
        
        // Verificar que exista el JSON
        const hasJson = await this.fileExists(metadataPath);
        
        if (hasJson) {
          tracks.push({
            id: baseName,
            audioPath: audioPath,
            metadataPath: metadataPath
          });
          console.log(`✅ Encontrado: ${baseName}`);
        } else {
          console.warn(`⚠️ Sin metadata: ${baseName} (falta ${baseName}.json)`);
        }
      }
      
      console.log(`📊 Total encontrados: ${tracks.length} canciones`);
      return tracks;
      
    } catch (error) {
      console.error('❌ Error escaneando carpeta:', error);
      throw error;
    }
  }

  /**
   * Obtiene lista de archivos de una carpeta
   * REQUIERE: Un endpoint en el servidor o index.html generado
   */
  async fetchFileList(folder) {
    // OPCIÓN 1: Usando un index.json generado
    try {
      const response = await fetch(`${folder}/index.json`);
      if (response.ok) {
        return await response.json();
      }
    } catch (e) {
      // Si falla, intentar método alternativo
    }

    // OPCIÓN 2: Parsear directorio HTML
    // (funciona con servidor Python simple)
    try {
      const response = await fetch(folder);
      const html = await response.text();
      return this.parseDirectoryListing(html);
    } catch (e) {
      throw new Error('No se pudo leer la carpeta. Verifica el servidor.');
    }
  }

  /**
   * Parsea listado HTML de directorio (servidor Python, Apache, etc.)
   */
  parseDirectoryListing(html) {
    const files = [];
    
    // Buscar enlaces a archivos
    const linkRegex = /<a href="([^"]+)">([^<]+)<\/a>/g;
    let match;
    
    while ((match = linkRegex.exec(html)) !== null) {
      const filename = match[1];
      
      // Ignorar enlaces de navegación
      if (filename === '../' || filename === './') continue;
      if (filename.endsWith('/')) continue; // Carpetas
      
      files.push(filename);
    }
    
    return files;
  }

  /**
   * Verifica si un archivo existe
   */
  async fileExists(path) {
    try {
      const response = await fetch(path, { method: 'HEAD' });
      return response.ok;
    } catch (e) {
      return false;
    }
  }

  /**
   * Verifica si es un archivo de audio
   */
  isAudioFile(filename) {
    const lower = filename.toLowerCase();
    return this.audioExtensions.some(ext => lower.endsWith(ext));
  }

  /**
   * Obtiene nombre base sin extensión
   * "Chulo - Bad Gyal.mp3" → "Chulo - Bad Gyal"
   */
  getBaseName(filename) {
    return filename.replace(/\.[^/.]+$/, '');
  }
}