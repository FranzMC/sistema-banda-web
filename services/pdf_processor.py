import os
import pdfplumber
import re
import unicodedata
import difflib
from decimal import Decimal, InvalidOperation
from typing import List, Dict, Tuple
import logging

logger = logging.getLogger(__name__)

class PDFProcessor:
    """Servicio para procesar PDFs de descuentos usando OCR y extracción de datos"""
    
    def extraer_texto_pdf(self, pdf_path: str) -> str:
        """Extrae todo el texto del PDF con manejo de errores FontBBox"""
        texto_completo = ""
        try:
            with pdfplumber.open(pdf_path) as pdf:
                for pagina in pdf.pages:
                    texto = pagina.extract_text()
                    if texto:
                        texto_completo += texto + "\n"
        except Exception as e:
            logger.error(f"Error al leer PDF: {e}")
            raise Exception(f"No se pudo procesar el PDF: {e}")
        return texto_completo

    def extraer_tablas_pdf(self, pdf_path: str) -> List[List[List[str]]]:
        tablas = []
        try:
            with pdfplumber.open(pdf_path) as pdf:
                for pagina in pdf.pages:
                    page_tables = []
                    try:
                        page_tables = pagina.extract_tables()
                    except Exception:
                        page_tables = []

                    if not page_tables:
                        try:
                            page_tables = pagina.extract_tables(table_settings={
                                'vertical_strategy': 'lines',
                                'horizontal_strategy': 'lines',
                                'intersection_tolerance': 5,
                                'snap_tolerance': 3
                            })
                        except Exception:
                            page_tables = []

                    if not page_tables:
                        try:
                            tablas_fallback = [t.extract() for t in pagina.find_tables()]
                            page_tables = [t for t in tablas_fallback if t and len(t) > 1]
                        except Exception:
                            page_tables = []

                    for tabla in page_tables:
                        if tabla and len(tabla) > 1:
                            tablas.append(tabla)
        except Exception as e:
            logger.warning(f"No se pudieron extraer tablas del PDF: {e}")
        return tablas

    def _leer_primera_linea(self, texto: str) -> str:
        for linea in texto.splitlines():
            if linea and linea.strip():
                return linea.strip()
        return ''

    def _es_pdf_adelantos(self, texto: str) -> bool:
        if not texto:
            return False
        texto_upper = texto.upper()
        if 'ADELANTOS' in texto_upper:
            return True
        return False

    def _es_tabla_adelantos(self, tablas: List[List[List[str]]]) -> bool:
        for tabla in tablas:
            for fila in tabla:
                fila_limpia = [self._normalizar_texto_celda(c).upper() for c in fila if c is not None]
                if not fila_limpia:
                    continue
                if 'ADELANTOS' in ' '.join(fila_limpia):
                    return True
        return False

    def _es_fecha_hora_encabezado(self, texto: str) -> bool:
        if not texto:
            return False
        texto = texto.strip()
        if re.search(r'\d{1,2}[\/\-]\d{1,2}', texto):
            return True
        if re.search(r'\d{1,2}:\d{2}', texto):
            return True
        return False

    def _encabezado_adelantos(self, tabla: List[List[str]]):
        for idx, fila in enumerate(tabla):
            fila_limpia = [self._normalizar_texto_celda(c) for c in fila]
            fila_upper = [c.upper() for c in fila_limpia]
            if not fila_limpia:
                continue
            tiene_total = any('TOTAL' in c for c in fila_upper)
            tiene_nombre = any('NOMBRES' in c or 'APELLID' in c or 'N°' in c or 'NRO' in c for c in fila_upper)
            tiene_fecha = any(self._es_fecha_hora_encabezado(c) for c in fila_limpia)
            if tiene_total and tiene_nombre and tiene_fecha:
                return fila_limpia, idx
        return None, -1

    def _sugerencias_nombres(self, nombre: str, musicos_bd) -> List[str]:
        nombre_norm = self._normalizar_nombre(nombre)
        candidatas = []
        for m in musicos_bd:
            nombre_bd = self._normalizar_nombre(m.nombre_completo)
            if nombre_norm and nombre_norm in nombre_bd:
                candidatas.append(m.nombre_completo)
        if len(candidatas) >= 3:
            return candidatas[:3]
        for m in musicos_bd:
            nombre_bd = self._normalizar_nombre(m.nombre_completo)
            puntaje = self._calcular_similitud_nombres(nombre_norm, nombre_bd)
            if puntaje >= 0.55:
                candidatas.append(m.nombre_completo)
        return list(dict.fromkeys(candidatas))[:3]

    def _extraer_adelantos_desde_tabla(self, tablas: List[List[List[str]]]) -> List[Dict]:
        from gestion_banda.models import Musico
        musicos_bd = list(Musico.objects.filter(activo=True))
        registros = []
        current_section = ''

        for tabla in tablas:
            encabezado, encabezado_index = self._encabezado_adelantos(tabla)
            if not encabezado:
                continue

            encabezado_upper = [c.upper() for c in encabezado]
            total_index = max((i for i, c in enumerate(encabezado_upper) if 'TOTAL' in c), default=len(encabezado) - 1)
            nombre_index = next((i for i, c in enumerate(encabezado_upper) if 'NOMB' in c or 'APELLID' in c or 'N°' in c or 'NRO' in c), 1)
            fecha_indices = [i for i in range(len(encabezado)) if i not in (0, nombre_index, total_index)]
            if not fecha_indices and total_index > nombre_index + 1:
                fecha_indices = list(range(nombre_index + 1, total_index))

            # Procesar filas después del encabezado
            for fila in tabla[encabezado_index + 1:]:
                fila_limpia = [self._normalizar_texto_celda(c) for c in fila]
                if not any(fila_limpia):
                    continue

                if self._es_fila_seccion(fila_limpia):
                    current_section = ' '.join(fila_limpia).strip()
                    continue

                if not fila_limpia[0] or not re.match(r'^(\d+)', fila_limpia[0]):
                    continue

                row_num = int(re.match(r'^(\d+)', fila_limpia[0]).group(1))
                nombre_pdf = fila_limpia[nombre_index] if nombre_index < len(fila_limpia) else ''
                if not nombre_pdf:
                    nombre_pdf = next((c for idx, c in enumerate(fila_limpia)
                                       if idx not in (0, total_index)
                                       and c
                                       and not self._es_fecha_hora_encabezado(c)
                                       and 'TOTAL' not in c.upper()), '')
                if not nombre_pdf or 'TOTAL GENERAL' in nombre_pdf.upper() or nombre_pdf.upper() == 'TOTAL':
                    continue

                montos = [self._extraer_decimal(fila_limpia[idx] if idx < len(fila_limpia) else None) or Decimal('0') for idx in fecha_indices]
                total_pdf = self._extraer_decimal(fila_limpia[total_index] if total_index < len(fila_limpia) else None)
                total_calculado = sum(montos)
                if total_pdf is None:
                    total_pdf = total_calculado
                coincide_total = total_pdf == total_calculado

                musico_encontrado = self._encontrar_musico(nombre_pdf, musicos_bd)
                match_method = 'nombre'
                if not musico_encontrado and 1 <= row_num <= len(musicos_bd):
                    musico_encontrado = musicos_bd[row_num - 1]
                    match_method = 'orden'

                detalle = []
                for idx in fecha_indices:
                    fecha_text = encabezado[idx] if idx < len(encabezado) else f'Columna {idx}'
                    valor = self._extraer_decimal(fila_limpia[idx] if idx < len(fila_limpia) else None) or Decimal('0')
                    detalle.append({
                        'fecha': fecha_text,
                        'monto': float(valor)
                    })

                if not musico_encontrado:
                    registros.append({
                        'musico_id': None,
                        'nombre_pdf': nombre_pdf,
                        'monto': float(total_calculado),
                        'detalle': detalle,
                        'seccion': current_section,
                        'row_num': row_num,
                        'coincide_total': coincide_total,
                        'valido': False,
                        'sugerencias': self._sugerencias_nombres(nombre_pdf, musicos_bd)
                    })
                    continue

                registros.append({
                    'musico_id': musico_encontrado.id,
                    'nombre': musico_encontrado.nombre_completo,
                    'monto': float(total_calculado),
                    'detalle': detalle,
                    'seccion': current_section,
                    'row_num': row_num,
                    'coincide_total': coincide_total,
                    'match_method': match_method,
                    'valido': True
                })

        return registros

    def _extraer_adelantos_desde_texto(self, texto: str) -> List[Dict]:
        from gestion_banda.models import Musico
        musicos_bd = list(Musico.objects.filter(activo=True))
        lineas = [self._normalizar_texto_celda(l) for l in texto.splitlines() if l.strip()]
        registros = []
        encabezado = None
        indices_fecha = []
        total_index = None
        row_num_index = 0
        nombre_index = 1

        for i, linea in enumerate(lineas):
            if 'TOTAL' in linea.upper() and any(self._es_fecha_hora_encabezado(p) for p in re.split(r'\s{2,}|\t', linea)):
                partes = [p.strip() for p in re.split(r'\s{2,}|\t', linea) if p.strip()]
                encabezado = partes
                total_index = max((j for j, parte in enumerate(partes) if 'TOTAL' in parte.upper()), default=len(partes) - 1)
                nombre_index = next((j for j, parte in enumerate(partes) if 'NOMB' in parte.upper() or 'APELLID' in parte.upper() or 'N°' in parte or 'NRO' in parte), 1)
                indices_fecha = [j for j in range(len(partes)) if j not in (0, nombre_index, total_index)]
                if not indices_fecha and total_index > nombre_index + 1:
                    indices_fecha = list(range(nombre_index + 1, total_index))
                break

        if not encabezado:
            return registros

        for linea in lineas[lineas.index(linea) + 1:]:
            partes = [p.strip() for p in re.split(r'\s{2,}|\t', linea) if p.strip()]
            if not partes or not re.match(r'^(\d+)', partes[0]):
                continue

            row_num = int(re.match(r'^(\d+)', partes[0]).group(1))
            nombre_pdf = partes[nombre_index] if nombre_index < len(partes) else ''
            if not nombre_pdf:
                nombre_pdf = next((c for idx, c in enumerate(partes)
                                   if idx not in (0, total_index)
                                   and c
                                   and not self._es_fecha_hora_encabezado(c)
                                   and 'TOTAL' not in c.upper()), '')
            if not nombre_pdf or 'TOTAL GENERAL' in nombre_pdf.upper() or nombre_pdf.upper() == 'TOTAL':
                continue

            montos = [self._extraer_decimal(partes[idx] if idx < len(partes) else None) or Decimal('0') for idx in indices_fecha]
            total_pdf = self._extraer_decimal(partes[total_index] if total_index < len(partes) else None)
            total_calculado = sum(montos)
            if total_pdf is None:
                total_pdf = total_calculado
            coincide_total = total_pdf == total_calculado

            musico_encontrado = self._encontrar_musico(nombre_pdf, musicos_bd)
            match_method = 'nombre'
            if not musico_encontrado and 1 <= row_num <= len(musicos_bd):
                musico_encontrado = musicos_bd[row_num - 1]
                match_method = 'orden'

            detalle = []
            for idx in indices_fecha:
                fecha_text = encabezado[idx] if idx < len(encabezado) else f'Columna {idx}'
                valor = self._extraer_decimal(partes[idx] if idx < len(partes) else None) or Decimal('0')
                detalle.append({
                    'fecha': fecha_text,
                    'monto': float(valor)
                })

            if not musico_encontrado:
                registros.append({
                    'musico_id': None,
                    'nombre_pdf': nombre_pdf,
                    'monto': float(total_calculado),
                    'detalle': detalle,
                    'seccion': '',
                    'row_num': row_num,
                    'coincide_total': coincide_total,
                    'valido': False,
                    'sugerencias': self._sugerencias_nombres(nombre_pdf, musicos_bd)
                })
                continue

            registros.append({
                'musico_id': musico_encontrado.id,
                'nombre': musico_encontrado.nombre_completo,
                'monto': float(total_calculado),
                'detalle': detalle,
                'seccion': '',
                'row_num': row_num,
                'coincide_total': coincide_total,
                'match_method': match_method,
                'valido': True
            })

        return registros

    def extraer_descuentos_desde_tabla(self, tablas: List[List[List[str]]]) -> List[Dict]:
        from gestion_banda.models import Musico
        musicos_bd = list(Musico.objects.filter(activo=True))
        descuentos_por_musico = {}
        current_section = ''

        for tabla in tablas:
            for fila in tabla:
                fila_limpia = [self._normalizar_texto_celda(c) for c in fila if c is not None]
                if not fila_limpia:
                    continue

                fila_texto = " ".join(fila_limpia).strip()
                if not fila_texto:
                    continue

                if self._es_fila_encabezado(fila_texto):
                    continue

                if self._es_fila_seccion(fila_limpia):
                    current_section = fila_texto.strip()
                    continue

                nombre_extraido = self._extraer_nombre_de_fila(fila_limpia)
                if not nombre_extraido:
                    continue

                montos = [self._extraer_decimal(c) for c in fila_limpia if self._extraer_decimal(c) is not None]
                montos = [m for m in montos if m > 0]
                if not montos:
                    continue

                monto_extraido = int(montos[-1]) if montos else 0
                if monto_extraido <= 0:
                    continue

                musico_encontrado = self._encontrar_musico(nombre_extraido, musicos_bd)
                if not musico_encontrado:
                    continue

                if musico_encontrado.id not in descuentos_por_musico:
                    descuentos_por_musico[musico_encontrado.id] = {
                        'nombre': musico_encontrado.nombre_completo,
                        'monto': 0,
                        'musico_id': musico_encontrado.id,
                        'seccion': current_section
                    }
                descuentos_por_musico[musico_encontrado.id]['monto'] += monto_extraido

        return list(descuentos_por_musico.values())

    def extraer_descuentos(self, texto: str) -> List[Dict]:
        """Extrae nombres y montos de descuento adaptándose a tablas de PDF con columnas y guiones. Retorna montos en enteros."""
        from gestion_banda.models import Musico
        musicos_bd = list(Musico.objects.filter(activo=True))

        lineas = texto.split('\n')
        descuentos_por_musico = {}
        tiene_columna_total = any('TOTAL' in linea.upper() for linea in lineas[:15])
        current_section = ''

        for linea in lineas:
            linea = linea.strip()
            if not linea:
                continue

            if self._es_fila_seccion(linea):
                current_section = linea.upper().strip()
                continue

            if linea.upper().startswith('TOTAL'):
                continue

            linea_sin_fechas = re.sub(r'\d{1,2}[/-]\d{1,2}[/-]\d{2,4}', '', linea)
            match_id = re.match(r'^(\d+)[\.\-\s]*', linea_sin_fechas)
            if match_id:
                linea_sin_fechas = linea_sin_fechas[len(match_id.group(0)):]

            partes_texto = re.split(r'\s+-\s+|\d+', linea_sin_fechas)
            posible_nombre = partes_texto[0].strip() if partes_texto else ""
            if len(posible_nombre) < 4:
                continue

            numeros_str = re.findall(r'\b\d+(?:[\.,]\d{1,2})?\b', linea_sin_fechas)
            numeros = []
            for n in numeros_str:
                try:
                    numeros.append(Decimal(n.replace(',', '.')))
                except InvalidOperation:
                    continue
            numeros = [n for n in numeros if n > 0]
            if not numeros:
                continue

            musico_encontrado = self._encontrar_musico(posible_nombre, musicos_bd)
            if not musico_encontrado:
                continue

            monto_final = 0
            if len(numeros) == 1:
                monto_final = int(numeros[0])
            elif len(numeros) > 1:
                suma_anteriores = sum(numeros[:-1])
                if suma_anteriores == numeros[-1] or tiene_columna_total:
                    monto_final = int(numeros[-1])
                else:
                    monto_final = int(sum(numeros))

            if monto_final > 0:
                if musico_encontrado.id not in descuentos_por_musico:
                    descuentos_por_musico[musico_encontrado.id] = {
                        'nombre': musico_encontrado.nombre_completo,
                        'monto': 0,
                        'musico_id': musico_encontrado.id,
                        'seccion': current_section
                    }
                descuentos_por_musico[musico_encontrado.id]['monto'] += monto_final

        return list(descuentos_por_musico.values())

    def extraer_descuentos_excel(self, excel_path: str) -> List[Dict]:
        import openpyxl
        from gestion_banda.models import Musico
        musicos_bd = list(Musico.objects.filter(activo=True))

        wb = openpyxl.load_workbook(excel_path, data_only=True)
        ws = wb.active
        descuentos_por_musico = {}

        for row in ws.iter_rows(min_row=2, values_only=True):
            if not row or len(row) < 2 or row[1] is None:
                continue

            nombre_celda = str(row[1]).strip()
            if nombre_celda.upper() in ['TROMPETA', 'CLARINETE', 'SAXOFON', 'BARITONO', 'TROMBON', 'TUBA', 'BOMBO', 'TAMBOR', 'PLATILLOS', 'PERCUSION', 'OTRO']:
                continue

            mejor_puntaje = 0
            musico_encontrado = None
            if len(nombre_celda) >= 4:
                for m in musicos_bd:
                    nombre_bd = self._normalizar_nombre(m.nombre_completo)
                    nombre_lin = self._normalizar_nombre(nombre_celda)
                    puntaje = self._calcular_similitud_nombres(nombre_lin, nombre_bd)
                    if puntaje > 0.85 and puntaje > mejor_puntaje:
                        mejor_puntaje = puntaje
                        musico_encontrado = m

            if not musico_encontrado:
                continue

            monto_total = 0
            try:
                if len(row) > 7 and row[7] is not None:
                    val = str(row[7]).replace(',', '.')
                    if re.match(r'^\d+(\.\d+)?$', val):
                        monto_total = int(Decimal(val))
                if monto_total == 0 and len(row) >= 4:
                    for val in row[3:7]:
                        if val is not None and str(val).strip() != '':
                            v_str = str(val).replace(',', '.')
                            if re.match(r'^\d+(\.\d+)?$', v_str):
                                monto_total += int(Decimal(v_str))
            except Exception:
                pass

            if monto_total > 0:
                if musico_encontrado.id not in descuentos_por_musico:
                    descuentos_por_musico[musico_encontrado.id] = {
                        'nombre': musico_encontrado.nombre_completo,
                        'monto': 0,
                        'musico_id': musico_encontrado.id,
                        'seccion': ''
                    }
                descuentos_por_musico[musico_encontrado.id]['monto'] += monto_total

        return list(descuentos_por_musico.values())

    def procesar_pdf(self, pdf_path: str) -> Dict:
        """Procesa un PDF completo o archivo Excel y devuelve los resultados"""
        try:
            if pdf_path.lower().endswith('.xlsx') or pdf_path.lower().endswith('.xls'):
                descuentos = self.extraer_descuentos_excel(pdf_path)
                texto = "Archivo Excel procesado correctamente."
                tipo = 'excel'
            else:
                tablas = self.extraer_tablas_pdf(pdf_path)
                texto = self.extraer_texto_pdf(pdf_path)
                es_adelantos = (
                    self._es_pdf_adelantos(texto)
                    or self._es_tabla_adelantos(tablas)
                    or os.path.basename(pdf_path).upper().startswith('ADELANTOS')
                )
                if es_adelantos:
                    descuentos = self.extraer_descuentos_desde_tabla(tablas) if tablas else []
                    if not descuentos:
                        descuentos = self.extraer_descuentos(texto)
                    tipo = 'adelantos'
                else:
                    descuentos = self.extraer_descuentos_desde_tabla(tablas) if tablas else []
                    if not descuentos:
                        descuentos = self.extraer_descuentos(texto)
                    tipo = 'descuento'

            total_descuentos = sum(d['monto'] for d in descuentos if d.get('monto') is not None)
            return {
                'exitoso': True,
                'descuentos': descuentos,
                'total_descuentos': total_descuentos,
                'cantidad_descuentos': len(descuentos),
                'texto_extraido': texto[:1000] + "..." if len(texto) > 1000 else texto,
                'tipo': tipo
            }
        except Exception as e:
            return {'exitoso': False, 'error': str(e), 'descuentos': [], 'tipo': 'descuento'}

    def validar_descuentos(self, descuentos: List[Dict], musicos_disponibles: List[str]) -> Dict:
        validados = []
        no_encontrados = []
        for descuento in descuentos:
            valido = descuento.get('valido', True)
            if not valido:
                nombre_pdf = descuento.get('nombre_pdf') or descuento.get('nombre', '')
                if nombre_pdf:
                    no_encontrados.append(nombre_pdf)

            validados.append({
                'musico_id': descuento.get('musico_id'),
                'nombre_bd': descuento.get('nombre') or descuento.get('nombre_pdf', ''),
                'monto': descuento.get('monto', 0),
                'seccion': descuento.get('seccion', ''),
                'valido': valido,
                'coincide_total': descuento.get('coincide_total', True),
                'row_num': descuento.get('row_num')
            })
        return {
            'validados': validados,
            'no_encontrados': no_encontrados,
            'tasa_coincidencia': 1.0
        }

    def _normalizar_texto_celda(self, texto) -> str:
        if texto is None:
            return ''
        return re.sub(r'\s+', ' ', str(texto)).strip()

    def _extraer_decimal(self, texto):
        if texto is None:
            return None
        cadena = str(texto).strip().replace(',', '.')
        match = re.search(r'(\d+(?:\.\d+)?)', cadena)
        if not match:
            return None
        try:
            valor_decimal = Decimal(match.group(1))
            return int(valor_decimal)
        except (InvalidOperation, ValueError):
            return None

    def _es_fila_encabezado(self, texto: str) -> bool:
        texto = texto.upper()
        encabezados = [
            'N°', 'NRO', 'NOMBRE', 'APELLIDO', 'APELLIDOS', 'TOTAL', 'INSTRUMENTO',
            'ATRASO', 'FALTA', 'CUADERNILLO', 'EXCESO', 'BEBID', 'DESCUENTO',
            'MONTO', 'SECCIÓN', 'BARITONOS', 'TROMPETA', 'CLARINETE', 'SAXOFON',
            'TROMBON', 'TUBA', 'BOMBO', 'TAMBOR', 'PLATILLOS', 'PERCUSION', 'OTRO'
        ]
        return any(enc in texto for enc in encabezados)

    def _es_fila_seccion(self, fila: List[str]) -> bool:
        texto = " ".join([self._normalizar_texto_celda(c) for c in fila]).strip()
        if not texto:
            return False
        if any(char.isdigit() for char in texto):
            return False
        palabras = texto.split()
        if len(palabras) == 1 and len(texto) < 40 and texto.isupper():
            return True
        secciones = {
            'TROMPETAS', 'TROMPETA', 'CLARINETES', 'CLARINETE', 'SAXOS', 'SAXOFON',
            'BARITONOS', 'BARITONO', 'TROMBONES', 'TUBA', 'BOMBOS', 'TAMBOR',
            'PLATILLOS', 'PERCUSION', 'PERCUSIÓN', 'BAJOS', 'VIOLINES', 'OTROS'
        }
        return any(sec in texto.upper() for sec in secciones)

    def _es_fila_datos(self, fila: List[str]) -> bool:
        if not fila:
            return False
        fila_limpia = [self._normalizar_texto_celda(c) for c in fila if c is not None]
        if not fila_limpia:
            return False

        tiene_nombre = any(re.search(r'[A-Za-zÁÉÍÓÚÑáéíóúñ]', celda) for celda in fila_limpia)
        tiene_monto = any(self._extraer_decimal(c) is not None for c in fila_limpia)
        if not (tiene_nombre and tiene_monto):
            return False

        if any(self._es_fila_encabezado(c) for c in fila_limpia):
            return False

        fila_texto = ' '.join(fila_limpia).upper()
        if 'TOTAL GENERAL' in fila_texto or fila_texto.startswith('TOTAL'):
            return False

        return True

    def _obtener_monto_total(self, fila: List[str]) -> Decimal:
        montos = []
        for celda in fila[2:]:
            valor = self._extraer_decimal(celda)
            if valor is not None and valor >= 0:
                montos.append(valor)
        if not montos:
            return Decimal('0')
        return montos[-1]

    def _encontrar_musico(self, nombre: str, musicos_bd):
        nombre_lin = self._normalizar_nombre(nombre)
        mejor_puntaje = 0
        mejor_musico = None
        for m in musicos_bd:
            nombre_bd = self._normalizar_nombre(m.nombre_completo)
            puntaje = self._calcular_similitud_nombres(nombre_lin, nombre_bd)
            if puntaje > mejor_puntaje:
                mejor_puntaje = puntaje
                mejor_musico = m
        if mejor_puntaje >= 0.58:
            return mejor_musico
        # Fallback basado en coincidencia parcial de nombre y apellido
        for m in musicos_bd:
            nombre_bd = self._normalizar_nombre(f"{m.nombres} {m.apellidos}")
            if nombre_lin in nombre_bd or nombre_bd in nombre_lin:
                return m
        return None

    def _extraer_nombre_de_fila(self, fila: List[str]) -> str:
        if not fila:
            return ''
        fila_limpia = [self._normalizar_texto_celda(c) for c in fila]
        if fila_limpia and re.match(r'^\d+$', fila_limpia[0]) and len(fila_limpia) > 1:
            posible = fila_limpia[1]
            if posible and re.search(r'[A-Za-zÁÉÍÓÚÑáéíóúñ]', posible):
                return posible
        for celda in fila_limpia:
            if not celda or re.search(r'\d', celda):
                continue
            upper = celda.upper()
            if self._es_fila_encabezado(upper):
                continue
            return celda
        return ''

    def _extraer_monto_de_fila(self, fila: List[str]) -> Decimal:
        montos = []
        for celda in fila:
            valor = self._extraer_decimal(celda)
            if valor is not None and valor > 0:
                montos.append(valor)
        if not montos:
            return Decimal('0')
        return montos[-1]

    def _normalizar_nombre(self, nombre: str) -> str:
        if not nombre:
            return ''
        nombre = unicodedata.normalize('NFKD', nombre).encode('ASCII', 'ignore').decode('ASCII')
        nombre = nombre.lower().strip()
        if ',' in nombre:
            partes = [p.strip() for p in nombre.split(',')]
            if len(partes) == 2:
                nombre = f"{partes[1]} {partes[0]}"
        nombre = re.sub(r'[^\w\s]', '', nombre)
        nombre = re.sub(r'\s+', ' ', nombre)
        return nombre

    def _calcular_similitud_nombres(self, s1: str, s2: str) -> float:
        if not s1 or not s2:
            return 0
        if s1 == s2:
            return 1.0
        if s1 in s2 or s2 in s1:
            return 0.9

        ratio = difflib.SequenceMatcher(None, s1, s2).ratio()
        palabras1 = set(s1.split())
        palabras2 = set(s2.split())
        if palabras1 and palabras2:
            interseccion = palabras1 & palabras2
            union = palabras1 | palabras2
            jaccard = len(interseccion) / len(union)
        else:
            jaccard = 0.0

        return min(1.0, max(ratio, jaccard))
