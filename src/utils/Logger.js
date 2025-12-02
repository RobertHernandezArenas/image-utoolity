import chalk from 'chalk'

/**
 * Logger con colores para mejor UX
 * Strategy Pattern: Diferentes niveles de log
 */
export class Logger {
	static success(message) {
		console.log(chalk.green(`✓ ${message}`))
	}

	static info(message) {
		console.log(chalk.blue(`ℹ ${message}`))
	}

	static warn(message) {
		console.log(chalk.yellow(`⚠ ${message}`))
	}

	static error(message) {
		console.log(chalk.red(`✗ ${message}`))
	}

	static progress(message) {
		console.log(chalk.cyan(`➤ ${message}`))
	}

	static divider() {
		console.log(chalk.gray('─'.repeat(50)))
	}

	static header(message) {
		console.log('\n' + chalk.bold.cyan('='.repeat(60)))
		console.log(chalk.bold.cyan(` ${message}`))
		console.log(chalk.bold.cyan('='.repeat(60)) + '\n')
	}

	static stats(originalSize, optimizedSize, format) {
		// Verificar que los tamaños sean números válidos
		const isValidSize = size => typeof size === 'number' && !isNaN(size) && isFinite(size) && size >= 0

		const original = isValidSize(originalSize) ? originalSize : 0
		const optimized = isValidSize(optimizedSize) ? optimizedSize : 0

		const reduction = original > 0 ? (((original - optimized) / original) * 100).toFixed(1) : 0
		const saved = original - optimized

		console.log(chalk.bold('\n📊 ESTADÍSTICAS DE OPTIMIZACIÓN:'))
		console.log(chalk.gray('─'.repeat(40)))
		console.log(
			`Formato final: ${chalk.bold(format ? format.toUpperCase() : PathUtils.getExtension(format).toUpperCase())}`,
		)
		console.log(`Tamaño original: ${chalk.yellow(this.formatBytes(original))}`)
		console.log(`Tamaño optimizado: ${chalk.green(this.formatBytes(optimized))}`)
		console.log(
			`Reducción: ${chalk.bold(parseFloat(reduction) > 0 ? chalk.green(`-${reduction}%`) : chalk.red('0%'))}`,
		)
		console.log(`Espacio ahorrado: ${chalk.bold.green(this.formatBytes(Math.max(saved, 0)))}`)

		if (reduction > 70) {
			console.log(chalk.bold.green('🎉 ¡Excelente optimización!'))
		} else if (reduction > 30) {
			console.log(chalk.bold.yellow('👍 Buena optimización'))
		}
	}

	static formatBytes(bytes) {
		// Manejar casos de NaN o valores inválidos
		if (typeof bytes !== 'number' || isNaN(bytes) || !isFinite(bytes) || bytes < 0) {
			return '0 Bytes'
		}

		if (bytes === 0) return '0 Bytes'
		const k = 1024
		const sizes = ['Bytes', 'KB', 'MB', 'GB']
		const i = Math.floor(Math.log(bytes) / Math.log(k))
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
	}
}
