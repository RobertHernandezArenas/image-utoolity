import sharp from 'sharp';
import { Logger } from '../utils/Logger.js';

/**
 * Convertidor de imágenes con soporte para formatos modernos
 * Open/Closed Principle: Fácil de extender con nuevos formatos
 */
export class ImageConverter {
  static FORMAT_CONFIGS = {
    'webp': { quality: 80, lossless: false },
    'avif': { quality: 70, lossless: false },
    'jpeg': { quality: 85, mozjpeg: true },
    'png': { compressionLevel: 8, palette: true },
    'jpg': { quality: 85, mozjpeg: true }
  };

  /**
   * Convierte una imagen a otro formato
   * @param {string} inputPath - Ruta de entrada
   * @param {string} outputPath - Ruta de salida
   * @param {string} format - Formato destino
   * @param {Object} options - Opciones adicionales
   * @returns {Promise<Object>} Resultado de la conversión
   */
  static async convert(inputPath, outputPath, format = 'webp', options = {}) {
    try {
      Logger.progress(`Convirtiendo a ${format.toUpperCase()}...`);

      const outputFormat = format.toLowerCase();
      const config = { ...this.FORMAT_CONFIGS[outputFormat], ...options };
      
      let pipeline = sharp(inputPath);
      
      // Configuración específica por formato
      switch(outputFormat) {
        case 'webp':
          pipeline = pipeline.webp(config);
          break;
        case 'avif':
          pipeline = pipeline.avif(config);
          break;
        case 'jpeg':
        case 'jpg':
          pipeline = pipeline.jpeg(config);
          break;
        case 'png':
          pipeline = pipeline.png(config);
          break;
        default:
          throw new Error(`Formato no soportado: ${format}`);
      }

      await pipeline.toFile(outputPath);
      
      // Metadata para estadísticas
      const metadata = await sharp(outputPath).metadata();
      const stats = await sharp(outputPath).stats();
      
      return {
        success: true,
        format: outputFormat,
        metadata,
        stats
      };
      
    } catch (error) {
      Logger.error(`Error en conversión: ${error.message}`);
      throw error;
    }
  }

  /**
   * Convierte múltiples imágenes
   * @param {Array} images - Array de objetos {input, output, format}
   * @returns {Promise<Array>} Resultados
   */
  static async batchConvert(images) {
    const results = [];
    for (const image of images) {
      try {
        const result = await this.convert(
          image.input, 
          image.output, 
          image.format, 
          image.options
        );
        results.push({ ...image, success: true, result });
      } catch (error) {
        results.push({ ...image, success: false, error: error.message });
      }
    }
    return results;
  }
}