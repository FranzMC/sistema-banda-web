from django.core.management.base import BaseCommand
from gestion_banda.models import Modulo, RolModulo, Usuario


class Command(BaseCommand):
    help = 'Crea módulos y asignaciones por rol'

    def handle(self, *args, **options):
        # Crear módulos
        modulos_info = [
            ('DASHBOARD', 'Dashboard Principal'),
            ('MUSICOS', 'Gestión de Músicos'),
            ('EVENTOS', 'Gestión de Eventos'),
            ('DESCUENTOS', 'Registrar Descuentos'),
            ('ADELANTOS', 'Registrar Adelantos'),
            ('LIQUIDACIONES', 'Generar Liquidaciones'),
            ('CANASTON', 'Canastón - Rendimiento'),
            ('FINANCIAMIENTO', 'Financiamiento'),
            ('HISTORIAL_DESCUENTOS', 'Ver Historial de Descuentos'),
            ('HISTORIAL_CONTRATOS', 'Ver Historial de Contratos'),
            ('ADMIN_USUARIOS', 'Administración de Usuarios'),
        ]

        modulos_por_rol = {
            'PRESIDENTE': ['DASHBOARD', 'MUSICOS', 'EVENTOS', 'DESCUENTOS', 'ADELANTOS',
                          'LIQUIDACIONES', 'CANASTON', 'FINANCIAMIENTO', 'HISTORIAL_DESCUENTOS',
                          'HISTORIAL_CONTRATOS', 'ADMIN_USUARIOS'],
            'DIRECTOR': ['DASHBOARD', 'MUSICOS', 'EVENTOS', 'ADELANTOS', 'LIQUIDACIONES',
                        'CANASTON', 'FINANCIAMIENTO'],
            'SUBDIRECTOR': ['DASHBOARD', 'MUSICOS', 'EVENTOS', 'ADELANTOS', 'LIQUIDACIONES',
                           'CANASTON', 'FINANCIAMIENTO'],
            'JEFE_SECCION': ['MUSICOS', 'DESCUENTOS', 'HISTORIAL_DESCUENTOS'],
            'MUSICO': ['CANASTON', 'HISTORIAL_CONTRATOS', 'HISTORIAL_DESCUENTOS'],
        }

        # Crear módulos
        for clave, nombre in modulos_info:
            obj, created = Modulo.objects.get_or_create(
                clave=clave,
                defaults={'nombre': nombre}
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f'  [+] Creado modulo: {nombre}'))
            else:
                self.stdout.write(f'  [*] Modulo existente: {nombre}')

        # Asignar por rol
        for rol, claves in modulos_por_rol.items():
            self.stdout.write(f'\nAsignando modulos a {rol}:')
            for clave in claves:
                modulo = Modulo.objects.get(clave=clave)
                obj, created = RolModulo.objects.get_or_create(rol=rol, modulo=modulo)
                if created:
                    self.stdout.write(self.style.SUCCESS(f'  [+] {rol} -> {clave}'))
                else:
                    self.stdout.write(f'  [*] {rol} -> {clave} (existente)')

        self.stdout.write(self.style.SUCCESS('\n[OK] Modulos inicializados exitosamente'))
