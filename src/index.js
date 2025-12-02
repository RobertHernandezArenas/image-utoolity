#!/usr/bin/env node

import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { ImageProcessor } from './core/ImageProcessor.js'
import { OptimizerFactory } from './core/OptimizerFactory.js'
import { ImageValidator } from './core/ImageValidator.js'
import { Logger } from './utils/Logger.js'
import { ImageConverter } from './operations/ImageConverter.js'
import { ImageResizer } from './operations/ImageResizer.js'
import { ImageCompressor } from './operations/ImageCompressor.js'
import { FileManager } from './utils/fileManager.js'
import { PathUtils } from './utils/PathUtils.js'
import { basename } from 'path'

const processor = new ImageProcessor()
const fileManager = new FileManager()

// Handler común para operaciones
async function handleOperation(operation, argv) {
	const isDirectory = await fileManager.isDirectory(argv.input)

	if (isDirectory) {
		await handleDirectoryOperation(operation, argv)
	} else {
		await handleFileOperation(operation, argv)
	}
}

async function handleFileOperation(operation, argv) {
	Logger.header(`${operation.toUpperCase()} DE IMAGEN`)

	const validation = ImageValidator.validate(argv.input)
	if (!validation.isValid) {
		throw new Error(validation.error)
	}

	let result

	switch (operation) {
		case 'convert':
			result = await ImageConverter.convert(argv.input, argv.output, argv.format, {
				quality: argv.quality,
			})
			break

		case 'resize':
			const dimValidation = ImageValidator.validateDimensions(argv.width, argv.height)
			if (!dimValidation.isValid) {
				throw new Error(dimValidation.error)
			}

			result = await ImageResizer.resize(argv.input, argv.output, argv.width, argv.height, {
				fit: argv.fit,
			})
			break

		case 'compress':
			const qualityValidation = ImageValidator.validateQuality(argv.quality)
			if (!qualityValidation.isValid) {
				throw new Error(qualityValidation.error)
			}

			result = await ImageCompressor.compress(argv.input, argv.output, {
				quality: argv.quality,
				format: argv.format,
			})
			break
	}

	Logger.success(`Operación ${operation} completada: ${argv.output}`)

	const fs = await import('fs')
	const stats = fs.statSync(argv.output)
	const format = PathUtils.getExtension(argv.output)
	const inputStats = fs.statSync(argv.input)

	Logger.stats(inputStats.size, stats.size, format)
}

async function handleDirectoryOperation(operation, argv) {
	Logger.header(`${operation.toUpperCase()} DE DIRECTORIO`)

	const images = await fileManager.getImagesFromDirectory(argv.input)

	if (images.length === 0) {
		throw new Error(`No se encontraron imágenes en: ${argv.input}`)
	}

	Logger.info(`Encontradas ${images.length} imágenes`)

	// Crear directorio de salida si no existe
	await fileManager.ensureDirectoryExists(argv.output)

	for (const image of images) {
		try {
			const outputPath = await fileManager.generateOutputPath(image.path, argv.output, operation, argv)

			switch (operation) {
				case 'convert':
					await ImageConverter.convert(image.path, outputPath, argv.format, { quality: argv.quality })
					break

				case 'resize':
					await ImageResizer.resize(image.path, outputPath, argv.width, argv.height, { fit: argv.fit })
					break

				case 'compress':
					await ImageCompressor.compress(image.path, outputPath, {
						quality: argv.quality,
						format: argv.format,
					})
					break
			}

			Logger.success(`${image.name} → ${PathUtils.getBaseName(outputPath)}`)
		} catch (error) {
			Logger.error(`${image.name}: ${error.message}`)
		}
	}

	Logger.success(`Procesadas ${images.length} imágenes en ${argv.output}`)
}

// Configuración de CLI
yargs(hideBin(process.argv))
	.scriptName('img-opt')
	.usage('$0 <comando> [opciones]')
	.version('1.0.0')
	.alias('v', 'version')
	.help('h')
	.alias('h', 'help')

	// Comando: Convertir
	.command({
		command: 'convert <input> <output>',
		describe: 'Convertir imagen(es) a otro formato',
		builder: yargs =>
			yargs
				.positional('input', {
					describe: 'Ruta de la imagen de entrada (archivo o directorio)',
					type: 'string',
				})
				.positional('output', {
					describe: 'Ruta de la imagen de salida (archivo o directorio)',
					type: 'string',
				})
				.option('format', {
					alias: 'f',
					describe: 'Formato de salida',
					choices: ['webp', 'avif', 'jpeg', 'png', 'jpg'],
					default: 'webp',
				})
				.option('quality', {
					alias: 'q',
					describe: 'Calidad (1-100)',
					type: 'number',
					default: 80,
				})
				.option('recursive', {
					alias: 'r',
					describe: 'Buscar imágenes recursivamente en subdirectorios',
					type: 'boolean',
					default: false,
				}),

		handler: async argv => {
			try {
				await handleOperation('convert', argv)
			} catch (error) {
				Logger.error(`Error: ${error.message}`)
				process.exit(1)
			}
		},
	})

	// Comando: Redimensionar
	.command({
		command: 'resize <input> <output>',
		describe: 'Redimensionar imagen(es)',
		builder: yargs =>
			yargs
				.positional('input', {
					describe: 'Ruta de la imagen de entrada (archivo o directorio)',
					type: 'string',
				})
				.positional('output', {
					describe: 'Ruta de la imagen de salida (archivo o directorio)',
					type: 'string',
				})
				.option('width', {
					alias: 'w',
					describe: 'Ancho en píxeles',
					type: 'number',
					demandOption: true,
				})
				.option('height', {
					alias: 'h',
					describe: 'Alto en píxeles',
					type: 'number',
					demandOption: true,
				})
				.option('fit', {
					describe: 'Modo de ajuste',
					choices: ['cover', 'contain', 'fill', 'inside', 'outside'],
					default: 'cover',
				})
				.option('recursive', {
					alias: 'r',
					describe: 'Buscar imágenes recursivamente en subdirectorios',
					type: 'boolean',
					default: false,
				}),

		handler: async argv => {
			try {
				await handleOperation('resize', argv)
			} catch (error) {
				Logger.error(`Error: ${error.message}`)
				process.exit(1)
			}
		},
	})

	// Comando: Comprimir
	.command({
		command: 'compress <input> <output>',
		describe: 'Comprimir imagen(es) para web',
		builder: yargs =>
			yargs
				.positional('input', {
					describe: 'Ruta de la imagen de entrada (archivo o directorio)',
					type: 'string',
				})
				.positional('output', {
					describe: 'Ruta de la imagen de salida (archivo o directorio)',
					type: 'string',
				})
				.option('quality', {
					alias: 'q',
					describe: 'Calidad (1-100)',
					type: 'number',
					default: 80,
				})
				.option('format', {
					alias: 'f',
					describe: 'Formato de salida',
					choices: ['webp', 'avif', 'jpeg', 'png'],
					default: 'webp',
				})
				.option('recursive', {
					alias: 'r',
					describe: 'Buscar imágenes recursivamente en subdirectorios',
					type: 'boolean',
					default: false,
				}),

		handler: async argv => {
			try {
				await handleOperation('compress', argv)
			} catch (error) {
				Logger.error(`Error: ${error.message}`)
				process.exit(1)
			}
		},
	})

	// Comando: Optimizar (todo en uno)
	.command({
		command: 'optimize <input> <output>',
		describe: 'Optimización completa (convert + resize + compress)',
		builder: yargs =>
			yargs
				.positional('input', {
					describe: 'Ruta de la imagen de entrada (archivo o directorio)',
					type: 'string',
				})
				.positional('output', {
					describe: 'Ruta de la imagen de salida (archivo o directorio)',
					type: 'string',
				})
				.option('preset', {
					alias: 'p',
					describe: 'Preset de optimización',
					choices: ['web', 'mobile', 'thumbnail', 'social', 'avif'],
					default: 'web',
				})
				.option('width', {
					alias: 'w',
					describe: 'Ancho máximo',
					type: 'number',
				})
				.option('height', {
					alias: 'h',
					describe: 'Alto máximo',
					type: 'number',
				})
				.option('recursive', {
					alias: 'r',
					describe: 'Buscar imágenes recursivamente en subdirectorios',
					type: 'boolean',
					default: false,
				}),

		handler: async argv => {
			try {
				const optimizer = OptimizerFactory.createOptimizer(argv.preset)

				const operations = {}

				if (argv.width || argv.height) {
					operations.resize = {
						width: argv.width || null,
						height: argv.height || null,
						options: { fit: 'inside' },
					}
				}

				// Verificar si es directorio
				const isDirectory = await fileManager.isDirectory(argv.input)

				if (isDirectory) {
					const images = await fileManager.getImagesFromDirectory(argv.input)

					for (const image of images) {
						const outputPath = await fileManager.generateOutputPath(
							image.path,
							argv.output,
							'optimize',
							{ format: 'webp' },
						)

						await optimizer.optimize(image.path, outputPath, operations)
					}
				} else {
					await optimizer.optimize(argv.input, argv.output, operations)
				}
			} catch (error) {
				Logger.error(`Error: ${error.message}`)
				process.exit(1)
			}
		},
	})

	// Comando: Batch
	.command({
		command: 'batch <config>',
		describe: 'Procesar múltiples imágenes desde archivo de configuración',
		builder: yargs =>
			yargs.positional('config', {
				describe: 'Archivo JSON de configuración',
				type: 'string',
			}),

		handler: async argv => {
			try {
				const fs = await import('fs')
				const config = JSON.parse(fs.readFileSync(argv.config, 'utf8'))

				const results = await processor.batchProcess(config.images)

				const successCount = results.filter(r => r.success).length
				const totalSizeReduction = results.reduce((sum, r) => {
					return sum + (r.success ? r.result.reduction || 0 : 0)
				}, 0)

				Logger.header('RESUMEN DEL LOTE')
				Logger.info(`Procesadas: ${successCount}/${results.length} imágenes`)
				Logger.info(`Reducción promedio: ${(totalSizeReduction / (successCount || 1)).toFixed(1)}%`)
			} catch (error) {
				Logger.error(`Error: ${error.message}`)
				process.exit(1)
			}
		},
	})

	.example('$0 convert foto.jpg foto.webp', 'Convertir archivo individual')
	.example('$0 convert ./imagenes ./output --format webp', 'Convertir todas las imágenes del directorio')
	.example('$0 resize ./fotos ./resized --width 800 --height 600', 'Redimensionar todas las imágenes')
	.example('$0 compress ./input ./compressed --quality 85', 'Comprimir todas las imágenes')
	.example('$0 optimize ./photos ./optimized --preset web', 'Optimizar directorio completo')

	.demandCommand(1, 'Debe especificar un comando')
	.strict().argv
