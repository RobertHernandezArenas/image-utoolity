import { extname, basename, dirname, join } from 'path'

/**
 * Utilidades para manejo de rutas
 */
export class PathUtils {
	/**
	 * Cambia la extensión de un archivo
	 * @param {string} filePath - Ruta del archivo
	 * @param {string} newExtension - Nueva extensión (con o sin punto)
	 * @returns {string}
	 */
	static changeExtension(filePath, newExtension) {
		const extension = newExtension.startsWith('.') ? newExtension : `.${newExtension}`
		const nameWithoutExt = basename(filePath, extname(filePath))
		const dir = dirname(filePath)
		return join(dir, nameWithoutExt + extension)
	}

	/**
	 * Obtiene el nombre base sin extensión
	 * @param {string} filePath - Ruta del archivo
	 * @returns {string}
	 */
	static getBaseName(filePath) {
		return basename(filePath, extname(filePath))
	}

	/**
	 * Obtiene la extensión sin el punto
	 * @param {string} filePath - Ruta del archivo
	 * @returns {string}
	 */
	static getExtension(filePath) {
		return extname(filePath).slice(1).toLowerCase()
	}

	/**
	 * Normaliza la ruta para múltiples sistemas operativos
	 * @param {string} filePath - Ruta a normalizar
	 * @returns {string}
	 */
	static normalizePath(filePath) {
		return join(filePath)
	}

	/**
	 * Genera un nombre de archivo con sufijo
	 * @param {string} filePath - Ruta original
	 * @param {string} suffix - Sufijo a agregar
	 * @param {string} newExt - Nueva extensión (opcional)
	 * @returns {string}
	 */
	static addSuffix(filePath, suffix, newExt = null) {
		const dir = dirname(filePath)
		const baseName = this.getBaseName(filePath)
		const ext = newExt || this.getExtension(filePath)

		return join(dir, `${baseName}${suffix}.${ext}`)
	}
}
