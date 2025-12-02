import { ImageProcessor } from './ImageProcessor.js';

/**
 * Factory Pattern para crear optimizadores específicos
 */
export class OptimizerFactory {
  static createOptimizer(type = 'default') {
    const processor = new ImageProcessor();
    
    const optimizers = {
      'web': () => ({
        convert: { format: 'webp', options: { quality: 80, effort: 6 } },
        compress: { quality: 80, format: 'webp' }
      }),
      
      'avif': () => ({
        convert: { format: 'avif', options: { quality: 70, effort: 5 } }
      }),
      
      'mobile': () => ({
        resize: { width: 800, height: 800, options: { fit: 'inside' } },
        convert: { format: 'webp', options: { quality: 75 } }
      }),
      
      'thumbnail': () => ({
        resize: { width: 300, height: 300, options: { fit: 'cover' } },
        convert: { format: 'webp', options: { quality: 70 } }
      }),
      
      'social': () => ({
        resize: { width: 1200, height: 630, options: { fit: 'cover' } },
        convert: { format: 'jpg', options: { quality: 85, progressive: true } }
      }),
      
      'default': () => ({})
    };

    const config = optimizers[type] ? optimizers[type]() : optimizers.default();
    
    return {
      processor,
      config,
      async optimize(inputPath, outputPath, customConfig = {}) {
        const operations = { ...config, ...customConfig };
        return await processor.process(inputPath, outputPath, operations);
      }
    };
  }
}