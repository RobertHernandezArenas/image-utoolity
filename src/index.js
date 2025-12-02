#!/usr/bin/env node

import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { ImageProcessor } from './core/ImageProcessor.js'
import { OptimizerFactory } from './core/OptimizerFactory.js'
import { Logger } from './utils/Logger.js'
import { ImageConverter } from './operations/ImageConverter.js'
import { ImageResizer } from './operations/ImageResizer.js'
import { ImageCompressor } from './operations/ImageCompressor.js'
import { ImageValidator } from './core/imageValidator.js'
import fs from 'fs'

const processor = new ImageProcessor()

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
		describe: 'Convertir imagen a otro formato',
		builder: yargs =>
			yargs
				.positional('input', {
					describe: 'Ruta de la imagen de entrada',
					type: 'string',
				})
				.positional('output', {
					describe: 'Ruta de la imagen de salida',
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
				}),

		handler: async argv => {
			try {
				Logger.header('CONVERSIÓN DE IMAGEN')

				const validation = ImageValidator.validate(argv.input)
				if (!validation.isValid) {
					Logger.error(validation.error)
					process.exit(1)
				}

				const result = await ImageConverter.convert(argv.input, argv.output, argv.format, {
					quality: argv.quality,
				})

				Logger.success(`Conversión completada: ${argv.output}`)

				const stats = fs.statSync(argv.output)
				Logger.stats(fs.statSync(argv.input).size, stats.size, argv.format)
			} catch (error) {
				Logger.error(`Error: ${error.message}`)
				process.exit(1)
			}
		},
	})

	// Comando: Redimensionar
	.command({
		command: 'resize <input> <output>',
		describe: 'Redimensionar imagen',
		builder: yargs =>
			yargs
				.positional('input', {
					describe: 'Ruta de la imagen de entrada',
					type: 'string',
				})
				.positional('output', {
					describe: 'Ruta de la imagen de salida',
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
				}),

		handler: async argv => {
			try {
				Logger.header('REDIMENSIONADO DE IMAGEN')

				const validation = ImageValidator.validate(argv.input)
				if (!validation.isValid) {
					Logger.error(validation.error)
					process.exit(1)
				}

				const dimValidation = ImageValidator.validateDimensions(argv.width, argv.height)
				if (!dimValidation.isValid) {
					Logger.error(dimValidation.error)
					process.exit(1)
				}

				const result = await ImageResizer.resize(argv.input, argv.output, argv.width, argv.height, {
					fit: argv.fit,
				})

				Logger.success(`Redimensionado completado: ${argv.output}`)
				Logger.info(`Nuevas dimensiones: ${result.dimensions.width}x${result.dimensions.height}px`)

				const stats = fs.statSync(argv.output)
				Logger.stats(fs.statSync(argv.input).size, stats.size, argv.output.split('.').pop())
			} catch (error) {
				Logger.error(`Error: ${error.message}`)
				process.exit(1)
			}
		},
	})

	// Comando: Comprimir
	.command({
		command: 'compress <input> <output>',
		describe: 'Comprimir imagen para web',
		builder: yargs =>
			yargs
				.positional('input', {
					describe: 'Ruta de la imagen de entrada',
					type: 'string',
				})
				.positional('output', {
					describe: 'Ruta de la imagen de salida',
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
				}),

		handler: async argv => {
			try {
				Logger.header('COMPRESIÓN DE IMAGEN')

				const validation = ImageValidator.validate(argv.input)
				if (!validation.isValid) {
					Logger.error(validation.error)
					process.exit(1)
				}

				const qualityValidation = ImageValidator.validateQuality(argv.quality)
				if (!qualityValidation.isValid) {
					Logger.error(qualityValidation.error)
					process.exit(1)
				}

				const result = await ImageCompressor.compress(argv.input, argv.output, {
					quality: argv.quality,
					format: argv.format,
				})

				Logger.success(`Compresión completada: ${argv.output}`)
				Logger.info(`Reducción: ${result.reduction}%`)

				// Obtener el formato del archivo de salida
				const outputFormat = argv.output.split('.').pop().toLowerCase()

				Logger.stats(result.originalSize, result.optimizedSize, outputFormat)
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
					describe: 'Ruta de la imagen de entrada',
					type: 'string',
				})
				.positional('output', {
					describe: 'Ruta de la imagen de salida',
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

				await optimizer.optimize(argv.input, argv.output, operations)
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
				const config = JSON.parse(fs.readFileSync(argv.config, 'utf8'))

				const results = await processor.batchProcess(config.images)

				const successCount = results.filter(r => r.success).length
				const totalSizeReduction = results.reduce((sum, r) => {
					return sum + (r.success ? r.result.reduction || 0 : 0)
				}, 0)

				Logger.header('RESUMEN DEL LOTE')
				Logger.info(`Procesadas: ${successCount}/${results.length} imágenes`)
				Logger.info(`Reducción promedio: ${(totalSizeReduction / successCount || 0).toFixed(1)}%`)
			} catch (error) {
				Logger.error(`Error: ${error.message}`)
				process.exit(1)
			}
		},
	})

	// Ejemplos de uso
	.example(
		'$0 convert foto.jpg foto.webp --format webp --quality 80',
		'Convertir JPEG a WebP con 80% calidad',
	)
	.example('$0 resize foto.jpg foto_small.jpg --width 800 --height 600', 'Redimensionar a 800x600px')
	.example('$0 compress foto.png foto_opt.webp --quality 85', 'Comprimir PNG a WebP')
	.example('$0 optimize foto.jpg foto_web.jpg --preset web', 'Optimización completa para web')
	.example('$0 batch config.json', 'Procesar múltiples imágenes')

	.demandCommand(1, 'Debe especificar un comando')
	.strict().argv
