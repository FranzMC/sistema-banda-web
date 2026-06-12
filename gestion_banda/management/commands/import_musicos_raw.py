import re
import csv
import random
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError

from gestion_banda.management.commands.import_musicos import _clean_username, _password_from_ci
from gestion_banda.models import Musico, Usuario


def _assign_chammara(talla_camisa, numero_calzado):
    """Asigna una talla de chamarra aleatoria basada en tallas de camisa y calzado."""
    chamarras = ['S', 'M', 'L', 'XL', 'XXL', 'XXXL']

    # Lógica simple: si camisa grande o calzado grande, tallas más grandes
    if talla_camisa and numero_calzado:
        try:
            camisa_num = float(talla_camisa.replace(' 1/2', '.5'))
            calzado_num = float(numero_calzado)

            if camisa_num >= 16 or calzado_num >= 40:
                return random.choice(['L', 'XL', 'XXL', 'XXXL'])
            elif camisa_num >= 15 or calzado_num >= 39:
                return random.choice(['M', 'L', 'XL'])
            else:
                return random.choice(['S', 'M', 'L'])
        except ValueError:
            pass

    # Si no hay tallas o error, asignar aleatoriamente
    return random.choice(chamarras)


def _normalize_text(s: str) -> str:
    return ' '.join(s.split()).strip()


def _parse_fecha(fecha_str: str):
    """Convierte una fecha en formato dd/mm/YYYY o YYYY-mm-dd a YYYY-mm-dd."""
    if not fecha_str:
        return None
    fecha_str = fecha_str.strip()
    if '/' in fecha_str:
        parts = fecha_str.split('/')
        if len(parts) == 3:
            day, month, year = parts
            return f"{year}-{int(month):02d}-{int(day):02d}"
    # Si ya está en iso, devolver tal cual (permitirlo)
    if re.match(r"\d{4}-\d{2}-\d{2}$", fecha_str):
        return fecha_str
    return None


def _extract_sizes_table(text: str):
    """Extrae tallas de camisa/calzado de la sección correspondiente."""

    sizes = {}
    lines = text.splitlines()
    in_section = False

    for line in lines:
        line = line.strip()
        if not line:
            continue

        # Detectar inicio de la sección de tallas
        if 'TABLA DE TALLAS:' in line.upper():
            in_section = True
            continue

        if not in_section:
            continue

        # Parsear línea: "Fernando Garnica - Camisa: 15, Calzado: 39"
        if '-' in line:
            parts = line.split('-')
            if len(parts) >= 2:
                nombre = parts[0].strip().title()

                camisa_match = re.search(r'Camisa:\s*([^,]+)', line)
                calzado_match = re.search(r'Calzado:\s*([^\s]+)', line)

                camisa = camisa_match.group(1).strip() if camisa_match else ''
                calzado = calzado_match.group(1).strip() if calzado_match else ''

                if nombre:
                    sizes[nombre] = {'talla_camisa': camisa, 'talla_calzado': calzado}

    return sizes


def _extract_records_from_text(text: str):
    """Extrae registros de músicos desde un bloque de texto organizado por secciones."""

    records = []
    lines = text.splitlines()
    current_section = None

    for line in lines:
        line = line.strip()
        if not line:
            continue

        # Detectar secciones
        upper = line.upper()
        if 'TROMPETAS:' in upper:
            current_section = 'TROMPETA'
            continue
        elif 'CLARINETES Y SAXOFONES:' in upper:
            current_section = 'CLARINETES_SAXOFONES'
            continue
        elif 'BARITONOS:' in upper:
            current_section = 'BARITONO'
            continue
        elif 'TROMBONES:' in upper:
            current_section = 'TROMBON'
            continue
        elif 'TUBAS Y CONTRABAJOS:' in upper:
            current_section = 'TUBAS_CONTRABAJOS'
            continue
        elif 'PERCUSION' in upper and ('BOMBO' in upper or 'TAMBOR' in upper or 'PLATILLO' in upper):
            current_section = 'PERCUSION'
            continue
        elif 'TABLA DE TALLAS:' in upper:
            break  # Fin de la sección de músicos

        # Parsear línea de músico: "Nombre Apellido - CI: 12345678 - Cel: 71234567 - Fecha: 15/05/1990 [- Instrumento: XXX]"
        if '-' in line and current_section:
            parts = line.split('-')
            if len(parts) >= 3:
                nombre_completo = parts[0].strip()
                nombre_parts = nombre_completo.split()
                nombres = nombre_parts[0] if nombre_parts else ''
                apellidos = ' '.join(nombre_parts[1:]) if len(nombre_parts) > 1 else ''

                ci_match = re.search(r'CI:\s*(\d+)', line)
                ci = ci_match.group(1) if ci_match else ''

                cel_match = re.search(r'Cel:\s*(\d+)', line)
                celular = cel_match.group(1) if cel_match else ''

                fecha_match = re.search(r'Fecha:\s*([\d/]+)', line)
                fecha_nac = fecha_match.group(1) if fecha_match else ''

                # Determinar instrumento específico
                especialidad = current_section
                if current_section == 'CLARINETES_SAXOFONES':
                    inst_match = re.search(r'Instrumento:\s*(\w+)', line)
                    if inst_match:
                        especialidad = inst_match.group(1).upper()
                    else:
                        especialidad = 'CLARINETE'  # default
                elif current_section == 'TUBAS_CONTRABAJOS':
                    inst_match = re.search(r'Instrumento:\s*(\w+)', line)
                    if inst_match:
                        especialidad = inst_match.group(1).upper()
                    else:
                        especialidad = 'TUBA'  # default
                elif current_section == 'PERCUSION':
                    especialidad = 'PERCUSION'

                records.append({
                    'nombres': nombres,
                    'apellidos': apellidos,
                    'ci': ci,
                    'celular': celular,
                    'especialidad': especialidad,
                    'fecha_nacimiento': fecha_nac,
                    'talla_camisa': '',
                    'talla_calzado': '',
                })

    return records


class Command(BaseCommand):
    help = (
        "Importa músicos desde un texto tipo 'relación nominal' y crea un CSV intermedio. "
        "El archivo debe ser el texto plano de la lista con líneas como las de tu ejemplo."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            'raw_file',
            help='Archivo de texto con la relación nominal (puede tener encabezados y líneas en blanco).',
        )
        parser.add_argument(
            '--output',
            help='Archivo CSV de salida (por defecto: data/musicos_from_raw.csv).',
            default='data/musicos_from_raw.csv',
        )
        parser.add_argument(
            '--import',
            action='store_true',
            dest='do_import',
            help='Además de generar el CSV, importa los músicos directamente a la base de datos.',
        )
        parser.add_argument(
            '--update',
            action='store_true',
            help='Actualiza instrumentos y tallas de músicos existentes en lugar de crear nuevos.',
        )

    def handle(self, *args, **options):
        raw_path = Path(options['raw_file'])
        if not raw_path.exists():
            raise CommandError(f"No se encontró el archivo: {raw_path}")

        out_path = Path(options['output'])
        out_path.parent.mkdir(parents=True, exist_ok=True)

        raw_text = raw_path.read_text(encoding='utf-8')
        parsed = _extract_records_from_text(raw_text)
        skipped = []

        # Extraer tallas de camisa/calzado y agregarlo a los registros por coincidencia de nombre
        sizes = _extract_sizes_table(raw_text)
        if sizes:
            # Normalizar nombres para mejorar la coincidencia (ignorando algunas diferencias de apellidos)
            def _norm(s: str) -> str:
                return re.sub(r"\s+", " ", s.strip().lower())

            norm_sizes = { _norm(k): v for k, v in sizes.items() }

            for rec in parsed:
                nombre_completo = f"{rec['nombres']} {rec['apellidos']}".strip()
                norm_name = _norm(nombre_completo)

                # Intentar coincidencia exacta
                if norm_name in norm_sizes:
                    rec.update(norm_sizes[norm_name])
                    continue

                # Intentar coincidencia por inicio (primer nombre + primer apellido)
                parts = norm_name.split()
                if len(parts) >= 2:
                    key = " ".join(parts[:2])
                    for candidate, sizes_vals in norm_sizes.items():
                        if candidate.startswith(key):
                            rec.update(sizes_vals)
                            break

                # Si aún no encontramos tallas, usar el mejor match por tokens compartidos
                if not rec.get('talla_camisa') and not rec.get('talla_calzado'):
                    best = None
                    best_score = 0
                    for candidate, sizes_vals in norm_sizes.items():
                        tokens_rec = set(norm_name.split())
                        tokens_cand = set(candidate.split())
                        score = len(tokens_rec & tokens_cand)
                        if score > best_score:
                            best_score = score
                            best = (candidate, sizes_vals)
                    if best and best_score >= 2:
                        rec.update(best[1])

        if not parsed:
            raise CommandError('No se pudo extraer ningún registro; revisa el formato del archivo.')

        if not parsed:
            raise CommandError('No se pudo parsear ninguna línea. Revisa el formato del archivo.')

        # Escribir CSV
        with out_path.open('w', encoding='utf-8', newline='') as f:
            writer = csv.DictWriter(
                f,
                fieldnames=[
                    'nombres',
                    'apellidos',
                    'ci',
                    'celular',
                    'especialidad',
                    'fecha_nacimiento',
                    'talla_camisa',
                    'talla_calzado',
                ],
            )
            writer.writeheader()
            for row in parsed:
                writer.writerow(row)

        self.stdout.write(self.style.SUCCESS(f"Se generó CSV en: {out_path} (filas: {len(parsed)})"))
        if skipped:
            self.stdout.write(self.style.WARNING(f"Líneas no parseadas: {len(skipped)}"))
            for line in skipped[:10]:
                self.stdout.write(f"- {line}")
            if len(skipped) > 10:
                self.stdout.write(f"... y {len(skipped)-10} líneas más")

        if options['do_import']:
            self.stdout.write(self.style.NOTICE('Importando músicos a la base de datos...'))
            created = 0
            updated = 0
            skipped_db = 0
            errors = []
            ci_counter = 10000000  # Para asignar CIs faltantes
            used_cis = set(Musico.objects.values_list('ci', flat=True))

            for row in parsed:
                nombres = row['nombres'].upper()
                apellidos = row['apellidos'].upper()
                ci = row['ci']
                celular = row['celular']
                especialidad = row['especialidad']
                fecha_nacimiento = _parse_fecha(row.get('fecha_nacimiento'))

                # Asignar CI único si falta o ya existe
                if not ci or ci in used_cis:
                    while str(ci_counter) in used_cis:
                        ci_counter += 1
                    ci = str(ci_counter)
                    ci_counter += 1
                used_cis.add(ci)

                # Asignar chamarra
                chammara = _assign_chammara(row.get('talla_camisa', ''), row.get('talla_calzado', ''))

                if options['update']:
                    # Actualizar músico existente por CI
                    try:
                        musico = Musico.objects.get(ci=ci)
                        musico.instrumento = especialidad
                        musico.talla_camisa = row.get('talla_camisa', '')
                        musico.talla_chamarra = chammara
                        musico.numero_calzado = row.get('talla_calzado', '')
                        if fecha_nacimiento:
                            musico.fecha_nacimiento = fecha_nacimiento
                        musico.save()
                        updated += 1
                    except Musico.DoesNotExist:
                        errors.append(f"No encontrado músico con CI {ci}")
                    except Exception as e:
                        errors.append(f"Error actualizando {nombres} {apellidos}: {e}")
                else:
                    # Crear nuevo
                    username = nombres.lower()  # Solo primer nombre
                    password = ci

                    if Usuario.objects.filter(username=username).exists():
                        # Si username existe, agregar apellido
                        username = f"{nombres.lower()}_{apellidos.lower().replace(' ', '_')}"
                        if Usuario.objects.filter(username=username).exists():
                            skipped_db += 1
                            continue

                    usuario = Usuario(username=username, first_name=nombres, last_name=apellidos, rol='MUSICO')
                    usuario.set_password(password)
                    usuario.save()

                    musico = Musico(
                        usuario=usuario,
                        ci=ci,
                        nombres=nombres,
                        apellidos=apellidos,
                        celular=celular,
                        direccion='',
                        instrumento=especialidad or 'OTRO',
                        nivel='INTERMEDIO',
                        talla_camisa=row.get('talla_camisa', ''),
                        talla_chamarra=chammara,
                        numero_calzado=row.get('talla_calzado', ''),
                        fecha_ingreso=None,
                    )

                    if fecha_nacimiento:
                        musico.fecha_nacimiento = fecha_nacimiento

                    try:
                        musico.save()
                        created += 1
                    except Exception as e:
                        errors.append(f"Error guardando {nombres} {apellidos}: {e}")

            if options['update']:
                self.stdout.write(self.style.SUCCESS(f"Actualizados: {updated}, errores: {len(errors)}"))
            else:
                self.stdout.write(self.style.SUCCESS(f"Importados: {created}, saltados: {skipped_db}, errores: {len(errors)}"))
            for e in errors:
                self.stderr.write(f"- {e}")
