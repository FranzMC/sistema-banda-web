# Sistema de Gestión de Banda de Música

Un sistema completo para la administración de bandas de música con gestión de personal, eventos, asistencia, pagos y un sistema de rendimiento (Canastón).

## Características Principales

### Gestión de Personal y Roles
- **Perfiles completos de músicos**: CI, datos personales, tallas de uniforme, instrumento, nivel
- **Sistema de roles diferenciados**:
  - **Director**: Acceso total al sistema
  -  **Subdirector/Jefe de Sección**: Gestión de datos y eventos
  - **Músico**: Vista de perfil y pagos

###  Operaciones y Logística
- **Módulo de Eventos**: Presentaciones, ensayos y reuniones
- **Control de Asistencia**: Registro de puntualidad automático
- **Geolocalización**: Integración con Google Maps (opcional)

###  Procesamiento Inteligente de Descuentos (Feature Estrella)
- **OCR/Parsing de PDF**: Procesamiento automático de PDFs de descuentos
- **Reconocimiento automático**: Identifica nombres y montos
- **Validación inteligente**: Mapeo con base de datos de músicos
- **Interfaz de confirmación**: Revisión antes de procesar

###  Estadígrafos y Gamificación (Sistema del Canastón)
- **Algoritmo de Rendimiento**: Score de Lealtad (0-100)
- **Factores de cálculo**:
  - % de Asistencia (40% peso)
  - Puntualidad acumulada (30% peso)
  - Antigüedad (20% peso)
  - Descuentos (10% peso)
- **Dashboard visual**: Gráficos con Chart.js
- **Top 10 de músicos** para reconocimiento

###  Gestión Financiera
- **Módulo de Pagos**: Cálculo automático de sueldos
- **Reportes PDF**: Recibos individuales y reportes mensuales
- **Control de descuentos**: Integración con sistema de OCR

##  Stack Tecnológico

- **Backend**: Django 4.2.7 + Django REST Framework
- **Frontend**: Bootstrap 5 + Chart.js
- **Base de datos**: SQLite (desarrollo) / PostgreSQL (producción)
- **Procesamiento PDF**: pdfplumber (PyMuPDF es opcional y puede requerir herramientas de compilación adicionales)
- **Análisis de datos**: Pandas + NumPy

##  Requisitos Previos

- Python 3.8+
- pip (gestor de paquetes de Python)
- Git

##  Instalación

### 1. Clonar el repositorio
```bash
git clone <URL_DEL_REPOSITORIO>
cd Sis_Banda
```

### 2. Crear y activar entorno virtual
```bash
# Windows
python -m venv env
env\Scripts\activate

# Linux/Mac
python3 -m venv env
source env/bin/activate
```

### 3. Instalar dependencias
```bash
pip install -r requirements.txt
```

### 4. Configurar variables de entorno (opcional)
Crear archivo `.env`:
```env
DEBUG=True
SECRET_KEY=tu-clave-secreta-aqui
DATABASE_URL=sqlite:///db.sqlite3
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
```

### 5. Ejecutar migraciones
```bash
python manage.py makemigrations
python manage.py migrate
```

### 6. Crear superusuario
```bash
python manage.py createsuperuser
```

### 7. Iniciar servidor de desarrollo
```bash
python manage.py runserver
```

## 🔧 Configuración Inicial

### 1. Acceder al panel de administración
- URL: `http://127.0.0.1:8000/admin/`
- Usuario: superusuario creado en paso anterior

### 2. Configurar el sistema
1. Ir a **Configuración del Sistema** en el admin
2. Establecer:
   - Nombre de la banda
   - Monto por evento (ej: 100 Bs)
   - Hora límite de tardanza (ej: 19:05)

### 3. Crear usuarios y roles
```python
# Ejemplo para crear usuarios desde shell
python manage.py shell

from gestion_banda.models import Usuario, Musico

# Crear Director
director = Usuario.objects.create_user(
    username='director',
    password='tu_contraseña',
    first_name='Juan',
    last_name='Perez',
    email='director@banda.com',
    rol='DIRECTOR'
)

# Crear Subdirector
subdirector = Usuario.objects.create_user(
    username='subdirector',
    password='tu_contraseña',
    first_name='Maria',
    last_name='Garcia',
    email='subdirector@banda.com',
    rol='SUBDIRECTOR'
)

# Crear Músico
musico_user = Usuario.objects.create_user(
    username='musico1',
    password='tu_contraseña',
    first_name='Carlos',
    last_name='Lopez',
    email='carlos@banda.com',
    rol='MUSICO'
)

musico = Musico.objects.create(
    usuario=musico_user,
    ci='1234567',
    nombres='Carlos',
    apellidos='Lopez',
    instrumento='TROMPETA',
    nivel='INTERMEDIO',
    fecha_ingreso='2023-01-01'
)
```

## 📱 Uso del Sistema

### Acceso según rol
- **Director**: Acceso completo a todas las funcionalidades
- **Subdirector**: Gestión de músicos, eventos y procesamiento de PDFs
- **Músico**: Vista de perfil, eventos y pagos personales

### Flujo de trabajo típico

#### 1. Registrar Músicos
```
Dashboard Director → Músicos → Nuevo Músico
```

#### 2. Crear Eventos
```
Dashboard Director → Eventos → Nuevo Evento
```

#### 3. Registrar Asistencia
```
Eventos → Ver Evento → Registrar Asistencia
```

#### 4. Procesar Descuentos (Feature Estrella)
```
Finanzas → Procesar PDF de Descuentos
```
1. Subir PDF enviado por jefes de sección
2. Sistema extrae nombres y montos automáticamente
3. Validar coincidencias con base de datos
4. Confirmar y guardar descuentos

#### 5. Generar Pagos
```
Eventos → Ver Evento → Generar Pagos Automáticos
```

#### 6. Ver Ranking (Canastón)
```
Dashboard → Canastón
```
- Visualizar top 10 músicos por rendimiento
- Ver estadísticas detalladas
- Exportar reportes

##  Personalización

### Cambiar logo y colores
Editar `static/css/style.css`:
```css
:root {
    --primary-color: #0d6efd;  /* Cambiar color primario */
    --secondary-color: #6c757d;
    /* ... */
}
```

### Agregar nuevo instrumento
Editar `gestion_banda/models.py`:
```python
class Musico(models.Model):
    INSTRUMENTOS = [
        # ... instrumentos existentes ...
        ('NUEVO_INSTRUMENTO', 'Nuevo Instrumento'),
    ]
```

Luego ejecutar:
```bash
python manage.py makemigrations
python manage.py migrate
```

##  Reportes y Exportación

### Reportes disponibles
- **Reporte de Asistencia**: Por período y tipo de evento
- **Reporte de Pagos**: Individual y mensual
- **Reporte de Rendimiento**: Sistema del Canastón
- **Reporte de Descuentos**: Detallado por músico

### Exportación
- **PDF**: Para reportes formales
- **Excel**: Para análisis de datos
- **CSV**: Para importación a otros sistemas

## 🔍 Procesamiento de PDF (Guía Detallada)

### Formato de PDF aceptado
El sistema puede procesar PDFs que contengan:
```
Juan Perez 50.00
Maria Garcia 25.50
Carlos Lopez 75.00
```

### Pasos para procesar
1. Ir a `Finanzas → Procesar PDF de Descuentos`
2. Arrastrar o seleccionar archivo PDF
3. Sistema extrae automáticamente:
   - Nombres de músicos
   - Montos de descuento
4. Validación contra base de datos:
   -  Coincidencias exactas (verde)
   -  Coincidencias parciales (amarillo)
   -  Sin coincidencia (rojo)
5. Confirmar descuentos válidos
6. Sistema guarda automáticamente

### Tips para mejor precisión
- Usar nombres completos en PDFs
- Formato claro: Nombre + espacio + monto
- Evitar símbolos especiales

##  Solución de Problemas

### Problemas comunes

#### Error al procesar PDF
```bash
# Verificar dependencias de PDF
pip install --upgrade pdfplumber PyMuPDF
```

#### Problemas con migraciones
```bash
# Resetear migraciones (cuidado: pierde datos)
python manage.py migrate gestion_banda zero
python manage.py makemigrations
python manage.py migrate
```

#### Error de permisos
```bash
# Verificar permisos de archivos media
chmod -R 755 media/
```

### Logs y depuración
Activar modo DEBUG en `settings.py`:
```python
DEBUG = True
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'file': {
            'level': 'DEBUG',
            'class': 'logging.FileHandler',
            'filename': 'debug.log',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['file'],
            'level': 'DEBUG',
            'propagate': True,
        },
    },
}
```

##  Despliegue en Producción

### 1. Configurar variables de entorno
```env
DEBUG=False
SECRET_KEY=clave-segura-produccion
DATABASE_URL=postgresql://usuario:password@host:puerto/database
ALLOWED_HOSTS=dominio.com,www.dominio.com
```

### 2. Instalar dependencias de producción
```bash
pip install gunicorn whitenoise psycopg2-binary
```

### 3. Configurar archivos estáticos
```bash
python manage.py collectstatic --noinput
```

### 4. Ejecutar con Gunicorn
```bash
gunicorn core.wsgi:application --bind 0.0.0.0:8000
```

##  API Endpoints

### Endpoints disponibles
- `GET /api/musicos/search/` - Búsqueda de músicos
- `GET /api/estadisticas/` - Estadísticas en tiempo real

### Ejemplo de uso
```javascript
fetch('/api/musicos/search/?term=carlos')
    .then(response => response.json())
    .then(data => console.log(data.results));
```

##  Contribución

### Flujo de trabajo
1. Fork del repositorio
2. Crear rama: `git checkout -b feature/nueva-funcionalidad`
3. Commit: `git commit -am 'Agregar nueva funcionalidad'`
4. Push: `git push origin feature/nueva-funcionalidad`
5. Pull Request

### Estándares de código
- Usar Black para formateo: `black .`
- Usar flake8 para linting: `flake8 .`
- Cubrir código con tests: `coverage run -m pytest`

##  Licencia

Este proyecto está licenciado bajo MIT License.

##  Soporte

Para soporte técnico:
- Email: franzmonasterios6@gmail.com
- Documentación: [Link a documentación]
- Issues: [Link a GitHub Issues]

---

**Desarrollado con ❤️ para la comunidad musical**
