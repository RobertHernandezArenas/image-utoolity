import sharp from 'sharp';
import { Logger } from '../utils/Logger.js';

/**
 * Redimensionador de imágenes con diferentes estrategias
 * Strategy Pattern: Diferentes modos de redimensionado
 */
export class ImageResizer {
  static RESIZE_STRATEGIES = {
    'cover': 'cover',      // Cubrir área manteniendo proporción
    'contain': 'contain',  // Contener dentro manteniendo proporción
    'fill': 'fill',       // Rellenar sin mantener proporción
    'inside': 'inside',   // Encajar dentro manteniendo proporción
    'outside': 'outside'  // Encajar fuera manteniendo proporción
  };

  /**
   * Redimensiona una imagen
   * @param {string} inputPath - Ruta de entrada
   * @param {string} outputPath - Ruta de salida
   * @param {number} width - Ancho destino
   * @param {number} height - Alto destino
   * @param {Object} options - Opciones adicionales
   * @returns {Promise<Object>} Resultado
   */
  static async resize(inputPath, outputPath, width, height, options = {}) {
    try {
      Logger.progress(`Redimensionando a ${width}x${height}px...`);

      const {
        strategy = 'cover',
        fit = 'cover',
        position = 'center',
        background = { r: 255, g: 255, b: 255, alpha: 0 },
        withoutEnlargement = true,
        kernel = 'lanczos3'
      } = options;

      const pipeline = sharp(inputPath)
        .resize({
          width: Math.round(width),
          height: Math.round(height),
          fit: this.RESIZE_STRATEGIES[fit] || fit,
          position,
          background,
          withoutEnlargement,
          kernel
        });

      // Mantener formato original o convertir si se especifica
      if (options.format) {
        const formatMethod = options.format.toLowerCase();
        if (pipeline[formatMethod]) {
          pipeline.toFormat(formatMethod, options.formatOptions || {});
        }
      }

      await pipeline.toFile(outputPath);

      const metadata = await sharp(outputPath).metadata();
      
      return {
        success: true,
        dimensions: { width: metadata.width, height: metadata.height },
        originalSize: (await sharp(inputPath).metadata()).size,
        optimizedSize: metadata.size,
        format: metadata.format
      };

    } catch (error) {
      Logger.error(`Error en redimensionado: ${error.message}`);
      throw error;
    }
  }

  /**
   * Crea thumbnails en diferentes tamaños
   * @param {string} inputPath - Ruta de entrada
   * @param {string} outputDir - Directorio de salida
   * @param {Array} sizes - Array de objetos {width, height, suffix}
   * @returns {Promise<Array>} Resultados
   */
  static async createThumbnails(inputPath, outputDir, sizes = []) {
    const defaultSizes = [
      { width: 150, height: 150, suffix: '_thumb' },
      { width: 300, height: 300, suffix: '_small' },
      { width: 600, height: 600, suffix: '_medium' },
      { width: 1200, height: 1200, suffix: '_large' }
    ];

    const targetSizes = sizes.length > 0 ? sizes : defaultSizes;
    const results = [];

    for (const size of targetSizes) {
      const outputPath = `${outputDir}/${this.getFilename(inputPath)}${size.suffix}.webp`;
      
      try {
        const result = await this.resize(
          inputPath,
          outputPath,
          size.width,
          size.height,
          { fit: 'cover', format: 'webp' }
        );
        
        results.push({
          ...size,
          success: true,
          output: outputPath,
          result
        });
        
        Logger.success(`Thumbnail ${size.width}x${size.height} creado: ${outputPath}`);
      } catch (error) {
        results.push({
          ...size,
          success: false,
          error: error.message
        });
      }
    }

    return results;
  }

  static getFilename(path) {
    return path.split('/').pop().split('.').slice(0, -1).join('.');
  }
}