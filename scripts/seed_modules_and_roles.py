import os
import sys

# Añade la carpeta principal del proyecto a las rutas de Python
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
import django
django.setup()
from django.contrib.auth import get_user_model
from gestion_banda.models import Modulo, RolModulo
User = get_user_model()

modules = [
    ('dashboard', 'Dashboard', 'Acceso al dashboard general'),
    ('musicos', 'Músicos', 'Gestión de músicos'),
    ('contratos', 'Contratos', 'Gestión de contratos'),
    ('eventos', 'Eventos', 'Gestión de eventos'),
    ('liquidaciones', 'Liquidaciones', 'Módulo de liquidaciones y planillas'),
    ('descuentos_seccion', 'Descuentos por Sección', 'Registrar y procesar descuentos por sección'),
    ('adelantos_seccion', 'Adelantos por Sección', 'Registrar y procesar adelantos por sección'),
    ('financiamiento', 'Financiamiento', 'Módulo de finanzas / pagos'),
    ('usuarios', 'Usuarios', 'Gestión de usuarios y roles'),
    ('dashboard_seccion', 'Dashboard Sección', 'Dashboard específico de la sección'),
    ('musicos_seccion', 'Músicos Sección', 'Listado y gestión de músicos de la sección'),
    ('historial_descuentos', 'Historial Descuentos', 'Historial de descuentos por jefe de sección'),
    ('historial_contratos', 'Historial Contratos', 'Historial de contratos por músico'),
    ('mis_contratos', 'Mis Contratos', 'Historial de contratos del músico'),
    ('mis_descuentos', 'Mis Descuentos', 'Descuentos aplicados al músico'),
]

created = []
for clave, nombre, desc in modules:
    mod, created_flag = Modulo.objects.update_or_create(clave=clave, defaults={'nombre': nombre, 'descripcion': desc, 'activo': True})
    created.append((clave, created_flag))

assignments = {
    'PRESIDENTE': [m[0] for m in modules],
    'DIRECTOR': ['dashboard','musicos','contratos','eventos','liquidaciones','descuentos_seccion','adelantos_seccion','financiamiento','usuarios'],
    'SUBDIRECTOR': ['dashboard_seccion','musicos_seccion','descuentos_seccion','historial_descuentos'],
    'MUSICO': ['mis_contratos','mis_descuentos','historial_contratos']
}

for rol, claves in assignments.items():
    for clave in claves:
        try:
            mod = Modulo.objects.get(clave=clave)
            RolModulo.objects.get_or_create(rol=rol, modulo=mod)
        except Modulo.DoesNotExist:
            print('Modulo no existe:', clave)

# Create default presidente user if not exists
if not User.objects.filter(username='franz').exists():
    user = User.objects.create_user(
        username='franz',
        password='franz123',
        first_name='Franz Monasterios',
        last_name='Condori',
        rol='PRESIDENTE',
        is_staff=True,
        is_superuser=True
    )
    print('Superusuario Presidente creado: usuario=franz, password=franz123, nombre=Franz Monasterios Condori')
else:
    print('Usuario franz ya existe')

print('Seeding complete')
