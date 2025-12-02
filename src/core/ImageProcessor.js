import { ImageConverter } from '../operations/ImageConverter.js'
import { ImageResizer } from '../operations/ImageResizer.js'
import { ImageCompressor } from '../operations/ImageCompressor.js'
import { Logger } from '../utils/Logger.js'
import { statSync } from 'fs'
import { ImageValidator } from './imageValidator.js'
import fs from 'fs'

/**
 * Procesador principal de imágenes - Facade Pattern
 * Coordina todas las operaciones de imagen
 */
export class ImageProcessor {
	constructor() {
		this.converter = ImageConverter
		this.resizer = ImageResizer
		this.compressor = ImageCompressor
	}

	/**
	 * Procesa una imagen con múltiples operaciones
	 * @param {string} inputPath - Ruta de entrada
	 * @param {string} outputPath - Ruta de salida
	 * @param {Object} operations - Operaciones a aplicar
	 * @returns {Promise<Object>} Resultado
	 */
	async process(inputPath, outputPath, operations = {}) {
		try {
			// Validar archivo de entrada
			const validation = ImageValidator.validate(inputPath)
			if (!validation.isValid) {
				throw new Error(validation.error)
			}

			Logger.header('INICIANDO OPTIMIZACIÓN DE IMAGEN')
			Logger.info(`Archivo: ${inputPath}`)
			Logger.info(`Destino: ${outputPath}`)

			const originalStats = statSync(inputPath)
			Logger.info(`Tamaño original: ${Logger.formatBytes(originalStats.size)}`)

			let currentPath = inputPath
			const results = {}
			const tempFiles = []

			// Aplicar operaciones en orden
			if (operations.convert) {
				Logger.divider()
				Logger.header('CONVERSIÓN DE FORMATO')

				const tempOutput = `${outputPath}.temp.${operations.convert.format}`
				const result = await this.converter.convert(
					currentPath,
					tempOutput,
					operations.convert.format,
					operations.convert.options,
				)

				results.convert = result
				tempFiles.push(tempOutput)
				currentPath = tempOutput
			}

			if (operations.resize) {
				Logger.divider()
				Logger.header('REDIMENSIONADO')

				const tempOutput = `${outputPath}.temp.resized`
				const result = await this.resizer.resize(
					currentPath,
					tempOutput,
					operations.resize.width,
					operations.resize.height,
					operations.resize.options,
				)

				results.resize = result
				tempFiles.push(tempOutput)
				currentPath = tempOutput
			}

			if (operations.compress) {
				Logger.divider()
				Logger.header('COMPRESIÓN')

				const result = await this.compressor.compress(currentPath, outputPath, operations.compress)

				results.compress = result
			} else {
				// Si no hay compresión, copiar el último archivo temporal

				const { pipeline } = await import('stream/promises')
				const readStream = fs.createReadStream(currentPath)
				const writeStream = fs.createWriteStream(outputPath)
				await pipeline(readStream, writeStream)
			}

			// Limpiar archivos temporales
			await this.cleanupTempFiles(tempFiles)

			// Mostrar resultados finales
			Logger.divider()
			Logger.header('PROCESO COMPLETADO')

			const finalStats = statSync(outputPath)
			Logger.stats(originalStats.size, finalStats.size, outputPath.split('.').pop())

			return {
				success: true,
				output: outputPath,
				operations: results,
				finalSize: finalStats.size,
				reduction: (((originalStats.size - finalStats.size) / originalStats.size) * 100).toFixed(1),
			}
		} catch (error) {
			Logger.error(`Error en procesamiento: ${error.message}`)
			await this.cleanupTempFiles([])
			throw error
		}
	}

	/**
	 * Limpia archivos temporales
	 * @private
	 */
	async cleanupTempFiles(files) {
		const { unlink } = fs.promises

		for (const file of files) {
			try {
				if (fs.existsSync(file)) {
					await unlink(file)
				}
			} catch (error) {
				// Silencioso, no es crítico
			}
		}
	}

	/**
	 * Procesa un lote de imágenes
	 * @param {Array} images - Array de configuraciones
	 * @returns {Promise<Array>} Resultados
	 */
	async batchProcess(images) {
		const results = []
		const total = images.length

		Logger.header(`PROCESANDO LOTE DE ${total} IMÁGENES`)

		for (let i = 0; i < total; i++) {
			const image = images[i]
			Logger.info(`Procesando ${i + 1}/${total}: ${image.input}`)

			try {
				const result = await this.process(image.input, image.output, image.operations)
				results.push({ ...image, success: true, result })
				Logger.success(`✓ ${image.input} → ${image.output}`)
			} catch (error) {
				results.push({ ...image, success: false, error: error.message })
				Logger.error(`✗ ${image.input}: ${error.message}`)
			}
		}

		return results
	}
}
