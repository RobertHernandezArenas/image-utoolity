import sharp from 'sharp'
import { statSync } from 'fs'
import { Logger } from '../utils/Logger.js'
import { PathUtils } from '../utils/PathUtils.js'

/**
 * Compresor de imágenes con algoritmos optimizados
 */
export class ImageCompressor {
	/**
	 * Comprime una imagen optimizando para web
	 * @param {string} inputPath - Ruta de entrada
	 * @param {string} outputPath - Ruta de salida
	 * @param {Object} options - Opciones de compresión
	 * @returns {Promise<Object>} Resultado
	 */
	static async compress(inputPath, outputPath, options = {}) {
		try {
			Logger.progress('Optimizando imagen...')

			const {
				quality = 80,
				format = 'webp',
				progressive = true,
				optimizeSize = true,
				metadata = 'none',
			} = options

			// Obtener tamaño original usando statSync
			const originalStats = statSync(inputPath)
			const originalSize = originalStats.size

			let pipeline = sharp(inputPath)

			// Eliminar metadata innecesaria
			if (metadata === 'none') {
				pipeline = pipeline.withMetadata()
			} else if (metadata !== 'all') {
				pipeline = pipeline.withMetadata({ [metadata]: true })
			}

			// Configurar compresión basada en formato
			const compressionConfig = this.getCompressionConfig(format, quality, options)

			// Aplicar formato y compresión
			pipeline = this.applyFormat(pipeline, format, compressionConfig)

			// Optimizaciones adicionales
			if (optimizeSize) {
				pipeline = pipeline.sharpen(options.sharpen)
			}

			// Guardar imagen
			await pipeline.toFile(outputPath)

			// Obtener tamaño optimizado usando statSync
			const optimizedStats = statSync(outputPath)
			const optimizedSize = optimizedStats.size
			const reduction =
				originalSize > 0 ? (((originalSize - optimizedSize) / originalSize) * 100).toFixed(1) : 0

			Logger.success(`Compresión completada: ${PathUtils.getBaseName(outputPath)}`)

			return {
				success: true,
				originalSize: originalSize,
				optimizedSize: optimizedSize,
				reduction: reduction,
				format: format,
			}
		} catch (error) {
			Logger.error(`Error en compresión: ${error.message}`)
			throw error
		}
	}

	/**
	 * Obtiene configuración de compresión para formato
	 * @private
	 */
	static getCompressionConfig(format, quality, options) {
		const baseConfig = { quality }

		switch (format.toLowerCase()) {
			case 'webp':
				return {
					...baseConfig,
					lossless: options.lossless || false,
					nearLossless: options.nearLossless || false,
					alphaQuality: options.alphaQuality || quality,
					effort: options.effort || 6,
				}

			case 'avif':
				return {
					...baseConfig,
					lossless: options.lossless || false,
					effort: options.effort || 4,
				}

			case 'jpeg':
			case 'jpg':
				return {
					...baseConfig,
					mozjpeg: options.mozjpeg || true,
					chromaSubsampling: options.chromaSubsampling || '4:4:4',
					trellisQuantisation: options.trellisQuantisation || true,
					overshootDeringing: options.overshootDeringing || true,
					optimiseScans: options.optimiseScans || true,
					progressive: options.progressive !== undefined ? options.progressive : true,
				}

			case 'png':
				return {
					compressionLevel: options.compressionLevel || 9,
					palette: options.palette || true,
					colors: options.colors || 256,
					dither: options.dither || 1.0,
				}

			default:
				return baseConfig
		}
	}

	/**
	 * Aplica formato específico a la pipeline
	 * @private
	 */
	static applyFormat(pipeline, format, config) {
		const formatMap = {
			webp: () => pipeline.webp(config),
			avif: () => pipeline.avif(config),
			jpeg: () => pipeline.jpeg(config),
			jpg: () => pipeline.jpeg(config),
			png: () => pipeline.png(config),
		}

		const formatFn = formatMap[format.toLowerCase()]
		if (!formatFn) {
			throw new Error(`Formato no soportado: ${format}`)
		}

		return formatFn()
	}

	/**
	 * Comprime múltiples imágenes
	 * @param {Array} images - Array de objetos {input, output}
	 * @param {Object} options - Opciones de compresión
	 * @returns {Promise<Array>} Resultados
	 */
	static async batchCompress(images, options = {}) {
		const results = []

		for (const image of images) {
			try {
				const result = await this.compress(image.input, image.output, options)
				results.push({ ...image, success: true, result })
			} catch (error) {
				results.push({ ...image, success: false, error: error.message })
			}
		}

		return results
	}
}
