#!/usr/bin/env python
"""
Script para aplicar migraciones pendientes.
Ejecutar desde la carpeta del proyecto: python apply_migrations.py
"""

import os
import sys
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
sys.path.insert(0, os.path.dirname(__file__))

django.setup()

from django.core.management import call_command

print("=" * 60)
print("Aplicando migraciones pendientes...")
print("=" * 60)

try:
    # Mostrar migraciones pendientes
    print("\n1️⃣ Verificando migraciones pendientes...")
    call_command('showmigrations', '--plan')
    
    # Aplicar migraciones
    print("\n2️⃣ Aplicando migraciones...")
    call_command('migrate')
    
    print("\n✅ ¡Migraciones aplicadas exitosamente!")
    
except Exception as e:
    print(f"\n❌ Error: {e}")
    sys.exit(1)
