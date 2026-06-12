from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import api_views

router = DefaultRouter()
router.register(r'musicos', api_views.MusicoViewSet, basename='musicos')
router.register(r'usuarios', api_views.UsuarioViewSet, basename='usuarios')
router.register(r'modulos', api_views.ModuloViewSet, basename='modulos')
router.register(r'roles-modulos', api_views.RolModuloViewSet, basename='roles-modulos')
router.register(r'eventos', api_views.EventoViewSet, basename='eventos')
router.register(r'asistencias', api_views.AsistenciaViewSet, basename='asistencias')
router.register(r'descuentos', api_views.DescuentoViewSet, basename='descuentos')
router.register(r'pagos', api_views.PagoViewSet, basename='pagos')
router.register(r'configuracion', api_views.ConfiguracionViewSet, basename='configuracion')
router.register(r'adelantos', api_views.AdelantoViewSet, basename='adelantos')
router.register(r'planillas', api_views.PlanillaLiquidacionViewSet, basename='planillas')
router.register(r'contratos', api_views.ContratoMusicoViewSet, basename='contratos')
router.register(r'deudas', api_views.DeudaViewSet, basename='deudas')
router.register(r'abonos', api_views.AbonoDeudaViewSet, basename='abonos')
router.register(r'jefes-seccion', api_views.JefeSeccionViewSet, basename='jefes-seccion')

urlpatterns = [
    path('auth/me/', api_views.UserMeView.as_view(), name='auth_me'),
    path('dashboard/', api_views.DashboardView.as_view(), name='dashboard'),
    path('ranking/', api_views.RankingView.as_view(), name='ranking'),
    path('', include(router.urls)),
]

