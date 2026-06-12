from django.test import TestCase, Client
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.core.files.uploadedfile import SimpleUploadedFile
from .models import Musico, Evento, Asistencia, Descuento, ConfiguracionSistema
import io

User = get_user_model()

class GestionBandaTests(TestCase):
    def setUp(self):
        """Configurar datos de prueba"""
        # Crear configuración del sistema
        self.config = ConfiguracionSistema.objects.create(
            nombre_banda="Banda de Prueba",
            monto_por_evento=100.00,
            hora_limite_tardanza="19:05:00"
        )

        # Crear usuarios y músicos
        self.director = User.objects.create_user(
            username='director_test',
            password='test123',
            rol='DIRECTOR'
        )
        self.musico_user = User.objects.create_user(
            username='musico_test',
            password='test123',
            rol='MUSICO'
        )
        self.musico = Musico.objects.create(
            usuario=self.musico_user,
            ci='12345678',
            nombres='Juan',
            apellidos='Pérez',
            instrumento='TROMPETA',
            nivel='INTERMEDIO',
            fecha_ingreso='2023-01-01'
        )

        # Crear evento
        self.evento = Evento.objects.create(
            titulo='Concierto de Prueba',
            uniforme='GALA',
            fecha_hora_cita='2026-03-20 19:00:00',
            ubicacion='Teatro Principal',
            responsable='DIRECTOR'
        )

        self.client = Client()

    def test_login_view(self):
        """Probar vista de login"""
        response = self.client.post(reverse('gestion_banda:login'), {
            'username': 'director_test',
            'password': 'test123'
        })
        self.assertEqual(response.status_code, 302)  # Redirección después de login

    def test_dashboard_director(self):
        """Probar dashboard del director"""
        self.client.login(username='director_test', password='test123')
        response = self.client.get(reverse('gestion_banda:dashboard_director'))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Dashboard Director')

    def test_musico_list(self):
        """Probar lista de músicos"""
        self.client.login(username='director_test', password='test123')
        response = self.client.get(reverse('gestion_banda:musico_list'))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Juan Pérez')

    def test_evento_detail(self):
        """Probar detalle de evento"""
        self.client.login(username='director_test', password='test123')
        response = self.client.get(reverse('gestion_banda:evento_detail', args=[self.evento.pk]))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Concierto de Prueba')

    def test_registrar_asistencia(self):
        """Probar registro de asistencia"""
        self.client.login(username='director_test', password='test123')
        response = self.client.post(reverse('gestion_banda:registrar_asistencia', args=[self.evento.pk]), {
            'estado_1': 'PRESENTE',
            'hora_llegada_1': '19:00'
        })
        self.assertEqual(response.status_code, 302)  # Redirección después de guardar

        # Verificar que se creó la asistencia
        asistencia = Asistencia.objects.get(musico=self.musico, evento=self.evento)
        self.assertEqual(asistencia.estado, 'PRESENTE')

    def test_pdf_upload_form(self):
        """Probar formulario de subida de PDF"""
        self.client.login(username='director_test', password='test123')
        response = self.client.get(reverse('gestion_banda:procesar_pdf'))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Subir Archivo PDF')

    def test_descuento_list(self):
        """Probar lista de descuentos"""
        self.client.login(username='director_test', password='test123')
        response = self.client.get(reverse('gestion_banda:descuento_list'))
        self.assertEqual(response.status_code, 200)

    def test_pago_list(self):
        """Probar lista de pagos"""
        self.client.login(username='director_test', password='test123')
        response = self.client.get(reverse('gestion_banda:pago_list'))
        self.assertEqual(response.status_code, 200)

    def test_ranking_canaston(self):
        """Probar ranking del canastón"""
        self.client.login(username='director_test', password='test123')
        response = self.client.get(reverse('gestion_banda:ranking_canaston'))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Ranking Canastón')

    def test_musico_detail(self):
        """Probar detalle de músico"""
        self.client.login(username='director_test', password='test123')
        response = self.client.get(reverse('gestion_banda:musico_detail', args=[self.musico.pk]))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Juan Pérez')

    def test_generar_pagos_evento(self):
        """Probar generación de pagos para evento"""
        # Crear asistencia primero
        Asistencia.objects.create(
            musico=self.musico,
            evento=self.evento,
            estado='PRESENTE'
        )

        self.client.login(username='director_test', password='test123')
        response = self.client.get(reverse('gestion_banda:generar_pagos_evento', args=[self.evento.pk]))
        self.assertEqual(response.status_code, 302)  # Redirección después de generar

    def test_api_musicos_search(self):
        """Probar API de búsqueda de músicos"""
        self.client.login(username='director_test', password='test123')
        response = self.client.get(reverse('gestion_banda:api_musicos_search'), {'term': 'Juan'})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn('results', data)
        self.assertEqual(len(data['results']), 1)

    def test_api_estadisticas(self):
        """Probar API de estadísticas"""
        self.client.login(username='director_test', password='test123')
        response = self.client.get(reverse('gestion_banda:api_estadisticas'))
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn('total_musicos', data)
