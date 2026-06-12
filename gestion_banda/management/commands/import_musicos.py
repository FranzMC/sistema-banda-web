import csv
import re

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils.text import slugify

from gestion_banda.models import Musico, Usuario


def _clean_username(name, last_name):
    # Username: solo primer nombre, en minúsculas
    first = name.strip().split()[0] if name else ''
    return first.lower().replace(' ', '_')[:150]


def _password_from_ci(name, ci):
    # Password: la CI completa
    return ci


class Command(BaseCommand):
    help = (
        "Importa músicos desde un CSV con columnas: nombres,apellidos,ci,celular,especialidad," \
        "fecha_nacimiento,seccion. Genera usuario con username=primernombre_apellido y " \
        "password=primernombre_tresultimosCI, nivel=INTERMEDIO, sin fecha de ingreso ni dirección."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "csv_file",
            help="Ruta al archivo CSV que contiene los datos de los músicos.",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="No guarda cambios, solo muestra el resumen de lo que se crearía.",
        )

    def handle(self, *args, **options):
        path = options['csv_file']
        dry_run = options['dry_run']

        try:
            fp = open(path, newline='', encoding='utf-8')
        except FileNotFoundError:
            raise CommandError(f"No se encontró el archivo: {path}")

        reader = csv.DictReader(fp)
        required_columns = {'nombres', 'apellidos', 'ci'}
        if not required_columns.issubset(set(reader.fieldnames or [])):
            raise CommandError(
                "El archivo CSV debe contener al menos las columnas: nombres, apellidos, ci. "
                f"Columnas detectadas: {reader.fieldnames}"
            )

        created = 0
        skipped = 0
        errors = []

        with transaction.atomic():
            for row in reader:
                nombres = (row.get('nombres') or '').strip().upper()
                apellidos = (row.get('apellidos') or '').strip().upper()
                ci = (row.get('ci') or '').strip()

                if not nombres or not apellidos or not ci:
                    errors.append(f"Fila incompleta: {row}")
                    continue

                username = _clean_username(nombres, apellidos)
                password = _password_from_ci(nombres, ci)

                if Usuario.objects.filter(username=username).exists():
                    skipped += 1
                    continue

                usuario = Usuario(username=username, first_name=nombres, last_name=apellidos, rol='MUSICO')
                usuario.set_password(password)
                if not dry_run:
                    usuario.save()

                musico = Musico(
                    usuario=usuario,
                    ci=ci,
                    nombres=nombres,
                    apellidos=apellidos,
                    celular=(row.get('celular') or '').strip(),
                    direccion='',
                    instrumento=(row.get('especialidad') or '').strip().upper() or 'OTRO',
                    nivel='INTERMEDIO',
                    fecha_ingreso=None,
                )

                # Fecha de nacimiento se puede incluir como dd/mm/YYYY o YYYY-mm-dd
                raw_fecha = (row.get('fecha_nacimiento') or '').strip()
                if raw_fecha:
                    try:
                        if '/' in raw_fecha:
                            day, month, year = raw_fecha.split('/')
                            musico.fecha_nacimiento = f"{year}-{int(month):02d}-{int(day):02d}"
                        else:
                            musico.fecha_nacimiento = raw_fecha
                    except Exception:
                        # Dejarlo en blanco si falla el parseo
                        pass

                if not dry_run:
                    try:
                        musico.save()
                        created += 1
                    except Exception as e:
                        errors.append(f"Error guardando {nombres} {apellidos}: {e}")
                else:
                    created += 1

        fp.close()

        self.stdout.write(self.style.SUCCESS(f"Creados: {created}, saltados: {skipped}, errores: {len(errors)}"))
        for e in errors:
            self.stderr.write(f"- {e}")
        if dry_run:
            self.stdout.write(self.style.WARNING("Modo dry-run: no se guardaron cambios."))
