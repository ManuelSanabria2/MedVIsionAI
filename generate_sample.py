import numpy as np
from PIL import Image

print("Generando imagen sintética de radiografía de tórax...")

# Dimensiones estándar
width, height = 512, 512
img_arr = np.zeros((height, width), dtype=np.uint8)

# Crear un mapa de degradados que simula la cavidad torácica
for y in range(height):
    for x in range(width):
        # Coordenadas normalizadas de -1 a 1
        dx = (x - width / 2) / (width / 2)
        dy = (y - height / 2) / (height / 2)
        
        # Estructura base de atenuación radiológica (cuerpo humano grisáceo)
        val = 150 - int(40 * (dx**2 + dy**2))
        
        # Silueta de los pulmones (zonas más oscuras/transparentes a los rayos X)
        lung_left = np.exp(-((dx + 0.3)**2 / 0.08 + dy**2 / 0.35))
        lung_right = np.exp(-((dx - 0.3)**2 / 0.08 + dy**2 / 0.35))
        val -= int(70 * (lung_left + lung_right))
        
        # Estructura del mediastino / corazón (zona central más blanca)
        heart = np.exp(-((dx - 0.05)**2 / 0.03 + (dy - 0.1)**2 / 0.12))
        val += int(60 * heart)
        
        # Patrón de costillas (líneas horizontales arqueadas más claras)
        ribs = 0.07 * np.sin(y / 12) * (1 - abs(dx))
        val += int(150 * max(0, ribs))
        
        # Delimitar rango de píxeles
        img_arr[y, x] = max(10, min(245, val))

# Guardar la imagen en disco
output_path = "C:\\Users\\manue\\OneDrive\\Documentos\\MedVisionAI\\radiografia_de_prueba.png"
img = Image.fromarray(img_arr, mode='L')
img.save(output_path)

print(f"¡Éxito! Imagen de prueba generada en: {output_path}")
