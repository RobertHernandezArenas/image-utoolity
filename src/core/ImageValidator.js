import { existsSync, statSync } from 'fs';
import { extname } from 'path';

/**
 * Validador de imágenes con principios SOLID
 * Single Responsibility: Solo valida archivos de imagen
 */
export class ImageValidator {
  static SUPPORTED_FORMATS = new Set([
    '.jpg', '.jpeg', '.png', '.webp', '.avif', 
    '.tiff', '.gif', '.svg', '.bmp'
  ]);

  static MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

  /**
   * Valida si el archivo es una imagen válida
   * @param {string} filePath - Ruta del archivo
   * @returns {Object} { isValid: boolean, error: string }
   */
  static validate(filePath) {
    // Verificar existencia
    if (!existsSync(filePath)) {
      return { isValid: false, error: `Archivo no encontrado: ${filePath}` };
    }

    // Verificar tamaño
    try {
      const stats = statSync(filePath);
      if (stats.size === 0) {
        return { isValid: false, error: 'El archivo está vacío' };
      }
      if (stats.size > this.MAX_FILE_SIZE) {
        return { 
          isValid: false, 
          error: `Archivo demasiado grande (${Math.round(stats.size / 1024 / 1024)}MB). Máximo: 100MB` 
        };
      }
    } catch (error) {
      return { isValid: false, error: `Error accediendo al archivo: ${error.message}` };
    }

    // Verificar extensión
    const extension = extname(filePath).toLowerCase();
    if (!this.SUPPORTED_FORMATS.has(extension)) {
      return { 
        isValid: false, 
        error: `Formato no soportado: ${extension}. Formatos válidos: ${Array.from(this.SUPPORTED_FORMATS).join(', ')}` 
      };
    }

    return { isValid: true, error: null };
  }

  /**
   * Valida parámetros de redimensionado
   * @param {number} width - Ancho
   * @param {number} height - Alto
   * @returns {Object} { isValid: boolean, error: string }
   */
  static validateDimensions(width, height) {
    if (width <= 0 || height <= 0) {
      return { isValid: false, error: 'Dimensiones deben ser mayores a 0' };
    }
    if (width > 10000 || height > 10000) {
      return { isValid: false, error: 'Dimensiones no pueden exceder 10000px' };
    }
    return { isValid: true, error: null };
  }

  /**
   * Valida parámetros de calidad/compresión
   * @param {number} quality - Calidad (0-100)
   * @returns {Object} { isValid: boolean, error: string }
   */
  static validateQuality(quality) {
    if (quality < 1 || quality > 100) {
      return { isValid: false, error: 'Calidad debe estar entre 1 y 100' };
    }
    return { isValid: true, error: null };
  }
}