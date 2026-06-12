#!/usr/bin/env python
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from gestion_banda.models import Descuento, Adelanto, Musico
from datetime import datetime

print("[*] Creando descuentos de prueba...")

# Obtener músicos de TROMPETA y otras secciones
trompetas = Musico.objects.filter(instrumento='TROMPETA')[:2]
otros = Musico.objects.exclude(instrumento='TROMPETA')[:2]

musicos_prueba = list(trompetas) + list(otros)

if len(musicos_prueba) < 2:
    print("[ERROR] No hay suficientes músicos en BD")
    exit(1)

# Crear descuentos
for i, musico in enumerate(musicos_prueba):
    desc = Descuento.objects.create(
        musico=musico,
        monto=100.00 + (i * 50),
        motivo=f"Prueba {musico.instrumento}",
        fecha_aplicacion=datetime.now().date(),
        procesado_desde_pdf=False,
        liquidado=False,
        origen='MANUAL',
        referencia_origen=f'PRUEBA_{i}'
    )
    print(f"[OK] Descuento creado: {musico.nombre_completo} ({musico.instrumento}) - ${desc.monto}")

print("\n[OK] Descuentos de prueba creados!")
print("\nPrueba con curl:")
print('  curl -H "Authorization: Bearer <token>" http://192.168.3.179:8000/api/descuentos/')
