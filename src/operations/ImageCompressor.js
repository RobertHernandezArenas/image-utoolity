import sharp from 'sharp'
import { Logger } from '../utils/Logger.js'
import fs from 'fs'

/**
 * Compresor de imágenes con algoritmos optimizados
 * Template Method Pattern: Proceso de compresión estructurado
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

			// Obtener tamaño original usando fs.stat
			const originalStats = fs.statSync(inputPath)
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

			// Obtener tamaño optimizado usando fs.stat
			const optimizedStats = fs.statSync(outputPath)
			const optimizedSize = optimizedStats.size
			const optimizedMetadata = await sharp(outputPath).metadata()
			const optimizedImageStats = await sharp(outputPath).stats()

			return {
				success: true,
				originalSize: originalSize,
				optimizedSize: optimizedSize,
				reduction: (((originalSize - optimizedSize) / originalSize) * 100).toFixed(1),
				format: format,
				metadata: {
					original: await sharp(inputPath).metadata(),
					optimized: optimizedMetadata,
				},
				stats: {
					original: await sharp(inputPath).stats(),
					optimized: optimizedImageStats,
				},
			}
		} catch (error) {
      Logger.error(`Error en compresión: ${error.message}`)
      console.log(error)
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
					effort: options.effort || 6, // 0-6, más alto = mejor compresión pero más lento
				}

			case 'avif':
				return {
					...baseConfig,
					lossless: options.lossless || false,
					effort: options.effort || 4, // 0-9
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
					compressionLevel: options.compressionLevel || 9, // 0-9
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
	 * Encuentra la mejor calidad sin pérdida visible
	 * @param {string} inputPath - Ruta de entrada
	 * @returns {Promise<number>} Calidad óptima
	 */
	static async findOptimalQuality(inputPath) {
		Logger.info('Buscando calidad óptima...')

		const qualities = [100, 90, 80, 70, 60, 50]
		let optimalQuality = 80 // Default

		try {
			for (const quality of qualities) {
				const tempPath = `${inputPath}.temp.webp`
				await sharp(inputPath).webp({ quality }).toFile(tempPath)

				const originalSize = (await sharp(inputPath).metadata()).size
				const tempSize = (await sharp(tempPath).metadata()).size
				const reduction = ((originalSize - tempSize) / originalSize) * 100

				// Si la reducción es significativa y calidad aceptable
				if (reduction > 30 && quality >= 70) {
					optimalQuality = quality
					break
				}
			}
		} catch (error) {
			console.warn('No se pudo determinar calidad óptima, usando 80 por defecto')
		}

		return optimalQuality
	}
}
