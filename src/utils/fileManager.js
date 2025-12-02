import { readdir, stat, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join, extname, basename } from 'path'
import { ImageValidator } from '../core/imageValidator.js'
import { Logger } from './Logger.js'

/**
 * Gestor de archivos y directorios con ESM
 * Singleton Pattern: Una única instancia para manejar archivos
 */
export class FileManager {
	static instance = null

	constructor() {
		if (FileManager.instance) {
			return FileManager.instance
		}
		FileManager.instance = this
	}

	/**
	 * Obtiene todas las imágenes de un directorio
	 * @param {string} directoryPath - Ruta del directorio
	 * @returns {Promise<Array<{path: string, name: string}>>}
	 */
	async getImagesFromDirectory(directoryPath) {
		try {
			if (!existsSync(directoryPath)) {
				throw new Error(`Directorio no encontrado: ${directoryPath}`)
			}

			const stats = await stat(directoryPath)
			if (!stats.isDirectory()) {
				throw new Error(`La ruta no es un directorio: ${directoryPath}`)
			}

			const files = await readdir(directoryPath)
			const images = []

			for (const file of files) {
				const filePath = join(directoryPath, file)

				try {
					const fileStats = await stat(filePath)
					if (fileStats.isFile()) {
						const validation = ImageValidator.validate(filePath)
						if (validation.isValid) {
							images.push({
								path: filePath,
								name: file,
								size: fileStats.size,
							})
						}
					}
				} catch (error) {
					Logger.warn(`No se pudo leer ${file}: ${error.message}`)
				}
			}

			return images
		} catch (error) {
			Logger.error(`Error leyendo directorio: ${error.message}`)
			throw error
		}
	}

	/**
	 * Determina si la ruta es un directorio
	 * @param {string} path - Ruta a verificar
	 * @returns {Promise<boolean>}
	 */
	async isDirectory(path) {
		try {
			if (!existsSync(path)) {
				return false
			}
			const stats = await stat(path)
			return stats.isDirectory()
		} catch (error) {
			return false
		}
	}

	/**
	 * Crea un directorio si no existe
	 * @param {string} directoryPath - Ruta del directorio
	 * @param {boolean} recursive - Crear recursivamente
	 * @returns {Promise<void>}
	 */
	async ensureDirectoryExists(directoryPath, recursive = true) {
		if (!existsSync(directoryPath)) {
			await mkdir(directoryPath, { recursive })
			Logger.info(`Directorio creado: ${directoryPath}`)
		}
	}

	/**
	 * Genera ruta de salida para procesamiento
	 * @param {string} inputPath - Ruta de entrada
	 * @param {string} outputPath - Ruta de salida base
	 * @param {string} operation - Operación (convert/resize/compress)
	 * @param {Object} options - Opciones específicas
	 * @returns {Promise<string>}
	 */
	async generateOutputPath(inputPath, outputPath, operation, options = {}) {
		try {
			const isInputDir = await this.isDirectory(inputPath)
			const isOutputDir = await this.isDirectory(outputPath)
			const inputIsDir = isInputDir
			const outputIsDir = isOutputDir

			// Si la salida no existe, determinar si es directorio basado en extensión
			if (!existsSync(outputPath)) {
				const ext = extname(outputPath).toLowerCase()
				const isImageExt = ImageValidator.SUPPORTED_FORMATS.has(ext)
				outputIsDir = !isImageExt
			}

			// Caso 1: Directorio de entrada → Directorio de salida
			if (inputIsDir && outputIsDir) {
				await this.ensureDirectoryExists(outputPath)
				const fileName = basename(inputPath)
				const suffix = this.getOperationSuffix(operation, options)
				const newFileName = this.addSuffixToFilename(fileName, suffix, options.format)
				return join(outputPath, newFileName)
			}

			// Caso 2: Directorio de entrada → Archivo de salida (no permitido)
			if (inputIsDir && !outputIsDir) {
				throw new Error('Si la entrada es un directorio, la salida debe ser un directorio')
			}

			// Caso 3: Archivo de entrada → Directorio de salida
			if (!inputIsDir && outputIsDir) {
				await this.ensureDirectoryExists(outputPath)
				const fileName = basename(inputPath)
				const suffix = this.getOperationSuffix(operation, options)
				const newFileName = this.addSuffixToFilename(fileName, suffix, options.format)
				return join(outputPath, newFileName)
			}

			// Caso 4: Archivo de entrada → Archivo de salida
			return outputPath
		} catch (error) {
			Logger.error(`Error generando ruta de salida: ${error.message}`)
			throw error
		}
	}

	/**
	 * Obtiene sufijo para operación
	 * @private
	 */
	getOperationSuffix(operation, options) {
		const suffixes = {
			convert: '_converted',
			resize: `_${options.width}x${options.height}`,
			compress: '_compressed',
			optimize: '_optimized',
		}

		return suffixes[operation] || '_processed'
	}

	/**
	 * Agrega sufijo al nombre del archivo
	 * @private
	 */
	addSuffixToFilename(filename, suffix, newFormat = null) {
		const nameWithoutExt = filename.replace(/\.[^/.]+$/, '')
		const currentExt = extname(filename).toLowerCase()

		if (newFormat) {
			return `${nameWithoutExt}${suffix}.${newFormat}`
		}

		return `${nameWithoutExt}${suffix}${currentExt}`
	}

	/**
	 * Procesa múltiples imágenes
	 * @param {Array} images - Array de imágenes
	 * @param {Function} processor - Función de procesamiento
	 * @param {Object} options - Opciones
	 * @returns {Promise<Array>}
	 */
	async processMultipleImages(images, processor, options = {}) {
		const results = []
		const total = images.length

		Logger.header(`PROCESANDO ${total} IMÁGENES`)

		for (let i = 0; i < total; i++) {
			const image = images[i]
			Logger.info(`[${i + 1}/${total}] Procesando: ${image.name}`)

			try {
				const result = await processor(image.path, options)
				results.push({
					...image,
					success: true,
					result,
				})
				Logger.success(`✓ ${image.name} procesado`)
			} catch (error) {
				results.push({
					...image,
					success: false,
					error: error.message,
				})
				Logger.error(`✗ ${image.name}: ${error.message}`)
			}
		}

		return results
	}
}
