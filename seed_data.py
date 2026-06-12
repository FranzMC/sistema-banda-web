#!/usr/bin/env python
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from gestion_banda.models import Usuario, Modulo, RolModulo, JefeSeccion, Musico
import uuid

print("[*] Iniciando seeding de datos...")

# 1. Crear PRESIDENTE si no existe
usuario_pres, created = Usuario.objects.get_or_create(
    username='presidente',
    defaults={
        'first_name': 'Presidente',
        'last_name': 'Fundador',
        'email': 'presidente@banda.local',
        'rol': 'PRESIDENTE',
        'is_staff': False,
        'is_active': True
    }
)
if created:
    usuario_pres.set_password('123456')
    usuario_pres.save()
    print("[OK] Usuario PRESIDENTE creado")
else:
    print("[SKIP] Usuario PRESIDENTE ya existe")

# 2. Crear módulos
modulos = [
    {'clave': 'descuentos', 'nombre': 'Descuentos', 'descripcion': 'Gestión de descuentos a músicos'},
    {'clave': 'adelantos', 'nombre': 'Adelantos', 'descripcion': 'Gestión de adelantos a músicos'},
    {'clave': 'liquidaciones', 'nombre': 'Liquidaciones', 'descripcion': 'Liquidación de pagos'},
    {'clave': 'eventos', 'nombre': 'Eventos', 'descripcion': 'Gestión de eventos'},
    {'clave': 'usuarios', 'nombre': 'Usuarios', 'descripcion': 'Gestión de usuarios y permisos'},
]

modulos_objs = {}
for mod_data in modulos:
    mod, created = Modulo.objects.get_or_create(clave=mod_data['clave'], defaults=mod_data)
    modulos_objs[mod_data['clave']] = mod
    if created:
        print(f"[OK] Modulo '{mod_data['nombre']}' creado")
    else:
        print(f"[SKIP] Modulo '{mod_data['nombre']}' ya existe")

# 3. Asignar módulos a roles
roles = ['PRESIDENTE', 'DIRECTOR', 'SUBDIRECTOR', 'JEFE_SECCION']
modulos_por_rol = {
    'PRESIDENTE': ['descuentos', 'adelantos', 'liquidaciones', 'eventos', 'usuarios'],
    'DIRECTOR': ['descuentos', 'adelantos', 'liquidaciones', 'eventos', 'usuarios'],
    'SUBDIRECTOR': ['descuentos', 'adelantos', 'liquidaciones', 'eventos'],
    'JEFE_SECCION': ['descuentos', 'adelantos'],
}

for rol, mod_slugs in modulos_por_rol.items():
    for slug in mod_slugs:
        rm, created = RolModulo.objects.get_or_create(
            rol=rol,
            modulo=modulos_objs[slug]
        )
        if created:
            print(f"[OK] {rol} -> Modulo '{slug}'")

# 4. Crear JEFE DE SECCIÓN para TROMPETA
usuario_jefe, created = Usuario.objects.get_or_create(
    username='jefe_trompeta',
    defaults={
        'first_name': 'Carlos',
        'last_name': 'Trompetero',
        'email': 'jefe.trompeta@banda.local',
        'rol': 'JEFE_SECCION',
        'is_staff': False,
        'is_active': True
    }
)
if created:
    usuario_jefe.set_password('123456')
    usuario_jefe.save()
    print("[OK] Usuario JEFE DE SECCIÓN (TROMPETA) creado")
else:
    print("[SKIP] Usuario JEFE DE SECCIÓN (TROMPETA) ya existe")

# Buscar un músico de TROMPETA para asignarle como jefe
trompeta_musico = Musico.objects.filter(instrumento='TROMPETA').first()
if trompeta_musico and not JefeSeccion.objects.filter(musico=trompeta_musico).exists():
    jefe_sec = JefeSeccion.objects.create(
        musico=trompeta_musico,
        seccion='TROMPETA'
    )
    print(f"[OK] JefeSeccion de TROMPETA asignado a {trompeta_musico.nombre_completo}")
elif trompeta_musico:
    print(f"[SKIP] Ya existe JefeSeccion para {trompeta_musico.nombre_completo}")
else:
    print("[WARN] No hay músicos de TROMPETA para asignar como jefe")

print("\n[OK] Seeding completado!")
print("\nCredenciales de prueba:")
print("  - PRESIDENTE: presidente / 123456")
print("  - JEFE TROMPETA: jefe_trompeta / 123456")
