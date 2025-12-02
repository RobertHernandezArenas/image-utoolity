import { ImageConverter } from '../operations/ImageConverter.js'
import { ImageResizer } from '../operations/ImageResizer.js'
import { ImageCompressor } from '../operations/ImageCompressor.js'
import { ImageValidator } from './ImageValidator.js'
import { Logger } from '../utils/Logger.js'
import { FileManager } from '../utils/fileManager.js'
import { PathUtils } from '../utils/PathUtils.js'
import { statSync, existsSync } from 'fs'

/**
 * Procesador principal de imágenes - Facade Pattern
 * Ahora maneja directorios y archivos individuales
 */
export class ImageProcessor {
	constructor() {
		this.converter = ImageConverter
		this.resizer = ImageResizer
		this.compressor = ImageCompressor
		this.fileManager = new FileManager()
	}

	/**
	 * Procesa una imagen o directorio con múltiples operaciones
	 * @param {string} inputPath - Ruta de entrada (archivo o directorio)
	 * @param {string} outputPath - Ruta de salida (archivo o directorio)
	 * @param {Object} operations - Operaciones a aplicar
	 * @returns {Promise<Object>} Resultado
	 */
	async process(inputPath, outputPath, operations = {}) {
		try {
			// Verificar si es directorio o archivo
			const isDirectory = await this.fileManager.isDirectory(inputPath)

			if (isDirectory) {
				return await this.processDirectory(inputPath, outputPath, operations)
			} else {
				return await this.processSingleFile(inputPath, outputPath, operations)
			}
		} catch (error) {
			Logger.error(`Error en procesamiento: ${error.message}`)
			throw error
		}
	}

	/**
	 * Procesa un archivo individual
	 * @private
	 */
	async processSingleFile(inputPath, outputPath, operations) {
		Logger.header(`PROCESANDO: ${PathUtils.getBaseName(inputPath)}`)

		// Validar archivo de entrada
		const validation = ImageValidator.validate(inputPath)
		if (!validation.isValid) {
			throw new Error(validation.error)
		}

		const originalStats = statSync(inputPath)
		Logger.info(`Tamaño original: ${Logger.formatBytes(originalStats.size)}`)
		Logger.info(`Formato: ${PathUtils.getExtension(inputPath).toUpperCase()}`)

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
			const fs = await import('fs')
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
		const finalFormat = PathUtils.getExtension(outputPath)

		Logger.stats(originalStats.size, finalStats.size, finalFormat)

		return {
			success: true,
			output: outputPath,
			operations: results,
			finalSize: finalStats.size,
			reduction:
				originalStats.size > 0
					? (((originalStats.size - finalStats.size) / originalStats.size) * 100).toFixed(1)
					: 0,
		}
	}

	/**
	 * Procesa un directorio completo
	 * @private
	 */
	async processDirectory(inputDir, outputDir, operations) {
		// Obtener todas las imágenes del directorio
		const images = await this.fileManager.getImagesFromDirectory(inputDir)

		if (images.length === 0) {
			throw new Error(`No se encontraron imágenes válidas en: ${inputDir}`)
		}

		Logger.header(`PROCESANDO DIRECTORIO: ${inputDir}`)
		Logger.info(`Encontradas ${images.length} imágenes`)

		// Crear directorio de salida si no existe
		await this.fileManager.ensureDirectoryExists(outputDir)

		const results = []
		const total = images.length

		// Procesar cada imagen
		for (let i = 0; i < total; i++) {
			const image = images[i]
			Logger.info(`[${i + 1}/${total}] ${image.name}`)

			try {
				// Generar ruta de salida para esta imagen
				const outputPath = await this.fileManager.generateOutputPath(
					image.path,
					outputDir,
					this.getOperationType(operations),
					operations,
				)

				const result = await this.processSingleFile(image.path, outputPath, operations)

				results.push({
					input: image.path,
					output: outputPath,
					success: true,
					result,
				})

				Logger.success(`✓ ${image.name} → ${basename(outputPath)}`)
			} catch (error) {
				results.push({
					input: image.path,
					success: false,
					error: error.message,
				})
				Logger.error(`✗ ${image.name}: ${error.message}`)
			}
		}

		// Mostrar resumen del directorio
		this.showDirectorySummary(results)

		return results
	}

	/**
	 * Determina el tipo de operación principal
	 * @private
	 */
	getOperationType(operations) {
		if (operations.convert) return 'convert'
		if (operations.resize) return 'resize'
		if (operations.compress) return 'compress'
		return 'optimize'
	}

	/**
	 * Muestra resumen del procesamiento del directorio
	 * @private
	 */
	showDirectorySummary(results) {
		Logger.divider()
		Logger.header('RESUMEN DEL DIRECTORIO')

		const total = results.length
		const success = results.filter(r => r.success).length
		const failed = total - success

		let totalOriginalSize = 0
		let totalOptimizedSize = 0

		results.forEach(r => {
			if (r.success && r.result) {
				totalOriginalSize += r.result.originalSize || 0
				totalOptimizedSize += r.result.finalSize || r.result.optimizedSize || 0
			}
		})

		const totalReduction =
			totalOriginalSize > 0
				? (((totalOriginalSize - totalOptimizedSize) / totalOriginalSize) * 100).toFixed(1)
				: 0

		console.log(`📁 Total de imágenes: ${total}`)
		console.log(`✅ Procesadas exitosamente: ${success}`)
		console.log(`❌ Fallidas: ${failed}`)
		console.log(`🗜️  Reducción total: ${totalReduction > 0 ? '-' : ''}${totalReduction}%`)
		console.log(`💾 Espacio ahorrado: ${Logger.formatBytes(totalOriginalSize - totalOptimizedSize)}`)

		if (success === total) {
			Logger.success('¡Todas las imágenes procesadas exitosamente!')
		} else if (success > 0) {
			Logger.warn(`${failed} imágenes no pudieron procesarse`)
		} else {
			Logger.error('No se pudo procesar ninguna imagen')
		}
	}

	/**
	 * Limpia archivos temporales
	 * @private
	 */
	async cleanupTempFiles(files) {
		const fs = await import('fs')
		const { unlink } = fs.promises

		for (const file of files) {
			try {
				if (existsSync(file)) {
					await unlink(file)
				}
			} catch (error) {
				// Silencioso, no es crítico
			}
		}
	}

	/**
	 * Procesa un lote de imágenes con configuración individual
	 * @param {Array} images - Array de configuraciones
	 * @returns {Promise<Array>} Resultados
	 */
	async batchProcess(images) {
		const results = []
		const total = images.length

		Logger.header(`PROCESANDO LOTE DE ${total} IMÁGENES`)

		for (let i = 0; i < total; i++) {
			const config = images[i]
			Logger.info(`Procesando ${i + 1}/${total}: ${config.input}`)

			try {
				const result = await this.process(config.input, config.output, config.operations)
				results.push({ ...config, success: true, result })
				Logger.success(`✓ ${config.input} → ${config.output}`)
			} catch (error) {
				results.push({ ...config, success: false, error: error.message })
				Logger.error(`✗ ${config.input}: ${error.message}`)
			}
		}

		return results
	}
}
