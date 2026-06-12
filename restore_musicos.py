#!/usr/bin/env python
import os
import django
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from gestion_banda.models import Musico

# Cargar backup
with open('backup_musicos.json', 'r') as f:
    musicos_data = json.load(f)

# Deduplicar por documento_identidad
seen_docs = set()
musicos_unicos = []
duplicados = 0

for data in musicos_data:
    doc = data.get('documento_identidad')
    if doc:
        if doc not in seen_docs:
            seen_docs.add(doc)
            musicos_unicos.append(data)
        else:
            duplicados += 1
    else:
        # Sin documento, incluir igualmente
        musicos_unicos.append(data)

print(f"Duplicados encontrados: {duplicados}")
print(f"Musicos unicos a restaurar: {len(musicos_unicos)}")

# Restaurar cada músico
count = 0
errors = 0
for data in musicos_unicos:
    try:
        # Extraer usuario_id si existe
        user_id = data.pop('usuario_id', None)
        id_original = data.pop('id', None)
        
        # Crear músico sin ID
        m = Musico.objects.create(**data)
        count += 1
        if count % 20 == 0:
            print(f"  {count} restaurados...")
    except Exception as e:
        print(f"[ERROR] {data.get('nombres', 'UNKNOWN')}: {str(e)}")
        errors += 1

print(f"\n[OK] {count} musicos restaurados de {len(musicos_unicos)} unicos")
if errors > 0:
    print(f"[WARN] {errors} errores durante la restauracion")
