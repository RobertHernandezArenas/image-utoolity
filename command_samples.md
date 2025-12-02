# By One
# Convertir JPEG a WebP (mejor relación calidad/tamaño)
node src/index.js convert imagen.jpg imagen.webp --format webp --quality 85

# Convertir PNG a AVIF (formato más moderno)
node src/index.js convert imagen.png imagen.avif --format avif --quality 75

# Convertir a JPEG progresivo (mejor UX web)
node src/index.js convert imagen.png imagen.jpg --format jpeg --quality 90

# Resultado esperado:
# ✓ Conversión completada: imagen.webp
# 📊 ESTADÍSTICAS:
# Formato final: WEBP
# Tamaño original: 1.2 MB
# Tamaño optimizado: 156.3 KB
# Reducción: -87.3%




# Redimensionar manteniendo proporción (cover)
node src/index.js resize foto.jpg foto_cover.jpg --width 1200 --height 800 --fit cover

# Redimensionar para encajar dentro (responsive)
node src/index.js resize foto.jpg foto_inside.jpg --width 800 --height 600 --fit inside

# Crear thumbnail cuadrado
node src/index.js resize foto.jpg foto_thumb.jpg --width 300 --height 300 --fit cover

# Redimensionar con fondo transparente
node src/index.js resize logo.png logo_small.png --width 200 --height 100 --fit contain --background "rgba(255,255,255,0)"

# Resultado esperado:
# ✓ Redimensionado completado: foto_cover.jpg
# Nuevas dimensiones: 1200x800px
# Reducción: -45.2% (además del cambio de tamaño)



# Redimensionar manteniendo proporción (cover)
node src/index.js resize foto.jpg foto_cover.jpg --width 1200 --height 800 --fit cover

# Redimensionar para encajar dentro (responsive)
node src/index.js resize foto.jpg foto_inside.jpg --width 800 --height 600 --fit inside

# Crear thumbnail cuadrado
node src/index.js resize foto.jpg foto_thumb.jpg --width 300 --height 300 --fit cover

# Redimensionar con fondo transparente
node src/index.js resize logo.png logo_small.png --width 200 --height 100 --fit contain --background "rgba(255,255,255,0)"

# Resultado esperado:
# ✓ Redimensionado completado: foto_cover.jpg
# Nuevas dimensiones: 1200x800px
# Reducción: -45.2% (además del cambio de tamaño)



# By Group
## Comprimir un directorio completo
node src/index.js compress ./input ./compressed --quality 85 --format webp

## Convertir todas las imágenes de una carpeta
node src/index.js convert ./imagenes ./convertidas --format webp --quality 90

## Redimensionar todas las imágenes
node src/index.js resize ./fotos ./resized --width 800 --height 600 --fit cover