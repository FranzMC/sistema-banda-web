import uuid
from rest_framework import serializers
from django.db.models import Sum
from decimal import Decimal
from .models import (
    Usuario, Modulo, RolModulo, UsuarioModulo, Musico, Evento, Asistencia, Descuento,
    Pago, RendimientoMusico, ConfiguracionSistema, Adelanto, PlanillaLiquidacion,
    ContratoMusico, DetalleMontoDiario, JefeSeccion, Deuda, AbonoDeuda
)


class UsuarioSerializer(serializers.ModelSerializer):
    modulos = serializers.SerializerMethodField()
    modulos_personales = serializers.SerializerMethodField()
    musico_data = serializers.SerializerMethodField()

    class Meta:
        model = Usuario
        fields = ['id', 'username', 'first_name', 'last_name', 'email', 'rol', 'telefono', 'is_active', 'modulos', 'modulos_personales', 'musico_data']
        read_only_fields = ['id', 'username', 'modulos', 'modulos_personales', 'musico_data']

    def get_modulos(self, obj):
        # Retorna módulos según rol del usuario
        modulos = obj.modulos_asignados.values('id', 'clave', 'nombre')
        return list(modulos)

    def get_modulos_personales(self, obj):
        # Retorna módulos personalizados adicionales (a través de la relación UsuarioModulo)
        modulos = obj.modulos_personales.filter(modulo__activo=True).values(
            'modulo__id', 'modulo__clave', 'modulo__nombre'
        )
        # Remapear los campos para que coincidan con la estructura esperada
        return [
            {
                'id': m['modulo__id'],
                'clave': m['modulo__clave'],
                'nombre': m['modulo__nombre']
            }
            for m in modulos
        ]

    def get_musico_data(self, obj):
        try:
            perfil = obj.perfil_musico
            return {
                'documento_identidad': perfil.documento_identidad,
                'nombres': perfil.nombres,
                'apellidos': perfil.apellidos,
                'telefono': perfil.telefono,
                'direccion': perfil.direccion,
                'instrumento': perfil.instrumento,
                'nivel': perfil.nivel,
            }
        except AttributeError:
            return None


class UsuarioCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    ci = serializers.CharField(write_only=True, required=False, allow_blank=True)
    musico_data = serializers.DictField(write_only=True, required=False)
    modulos_personales = serializers.ListField(
        child=serializers.CharField(), required=False, write_only=True
    )

    class Meta:
        model = Usuario
        fields = ['id', 'username', 'password', 'ci', 'first_name', 'last_name', 'email', 'rol', 'telefono', 'is_active', 'musico_data', 'modulos_personales']
        read_only_fields = ['id']

    def validate(self, attrs):
        if self.instance is None and not attrs.get('username'):
            nombres = attrs.get('first_name', '')
            base = (nombres.split()[0] if nombres else 'user').lower()
            attrs['username'] = f"{base}_{uuid.uuid4().hex[:6]}"

        if attrs.get('rol') == 'MUSICO' and not attrs.get('musico_data') and self.instance is None:
            raise serializers.ValidationError({'musico_data': 'Se requieren datos de músico para crear un usuario de rol MUSICO.'})

        return attrs

    def generate_default_password(self, ci_value):
        ci_digits = ''.join(ch for ch in (ci_value or '') if ch.isdigit())
        if len(ci_digits) >= 4:
            base = ci_digits[:4]
        else:
            base = ci_digits.ljust(4, '0')
        return f"{base}B@nda2026"

    def create(self, validated_data):
        musico_data = validated_data.pop('musico_data', None)
        personal_modules = validated_data.pop('modulos_personales', [])
        password = validated_data.pop('password', None)
        ci_value = validated_data.pop('ci', None)

        if not password:
            ci_source = ci_value or (musico_data or {}).get('documento_identidad')
            password = self.generate_default_password(ci_source)

        user = Usuario.objects.create(
            username=validated_data['username'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            email=validated_data.get('email', ''),
            rol=validated_data.get('rol', 'MUSICO'),
            telefono=validated_data.get('telefono', ''),
            is_active=validated_data.get('is_active', True),
        )

        user.set_password(password)
        user.save()

        if user.rol == 'MUSICO' and musico_data:
            Musico.objects.create(usuario=user, **musico_data)

        if personal_modules:
            self._assign_personal_modules(user, personal_modules)

        return user

    def update(self, instance, validated_data):
        musico_data = validated_data.pop('musico_data', None)
        personal_modules = validated_data.pop('modulos_personales', None)
        password = validated_data.pop('password', None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        if password:
            instance.set_password(password)

        instance.save()

        if instance.rol == 'MUSICO' and musico_data:
            Musico.objects.update_or_create(usuario=instance, defaults=musico_data)

        if personal_modules is not None:
            self._assign_personal_modules(instance, personal_modules)

        return instance

    def _assign_personal_modules(self, user, module_claves):
        from .models import Modulo, UsuarioModulo

        UsuarioModulo.objects.filter(usuario=user).delete()
        modulos = Modulo.objects.filter(clave__in=module_claves)
        for modulo in modulos:
            UsuarioModulo.objects.create(usuario=user, modulo=modulo)


class ModuloSerializer(serializers.ModelSerializer):
    class Meta:
        model = Modulo
        fields = ['id', 'clave', 'nombre', 'descripcion', 'activo']


class RolModuloSerializer(serializers.ModelSerializer):
    modulo = ModuloSerializer(read_only=True)
    modulo_id = serializers.PrimaryKeyRelatedField(queryset=Modulo.objects.all(), source='modulo', write_only=True)

    class Meta:
        model = RolModulo
        fields = ['id', 'rol', 'modulo', 'modulo_id']


class RendimientoSerializer(serializers.ModelSerializer):
    class Meta:
        model = RendimientoMusico
        fields = '__all__'


class MusicoSerializer(serializers.ModelSerializer):
    rendimiento = RendimientoSerializer(read_only=True)
    usuario = UsuarioSerializer(read_only=True)

    class Meta:
        model = Musico
        fields = ['id', 'usuario', 'documento_identidad', 'nombres', 'apellidos', 'telefono', 'direccion',
                  'talla_camisa', 'talla_chamarra', 'numero_calzado', 'instrumento', 'nivel',
                  'fecha_nacimiento', 'foto_perfil', 'orden', 'activo', 'created_at', 'rendimiento']

    def validate_documento_identidad(self, value):
        if not value:
            return value

        qs = Musico.objects.filter(documento_identidad=value)
        if self.instance:
            qs = qs.exclude(id=self.instance.id)

        if qs.exists():
            raise serializers.ValidationError("Ya existe Músico con este Documento de Identidad.")
        return value


class AsistenciaSerializer(serializers.ModelSerializer):
    musico_nombre = serializers.CharField(source='musico.nombre_completo', read_only=True)
    evento_titulo = serializers.CharField(source='evento.titulo', read_only=True)

    class Meta:
        model = Asistencia
        fields = '__all__'


class EventoSerializer(serializers.ModelSerializer):
    asistencias = AsistenciaSerializer(source='asistencia_set', many=True, read_only=True)

    class Meta:
        model = Evento
        fields = '__all__'


class DescuentoSerializer(serializers.ModelSerializer):
    musico_nombre = serializers.CharField(source='musico.nombre_completo', read_only=True)

    class Meta:
        model = Descuento
        fields = '__all__'


class AdelantoSerializer(serializers.ModelSerializer):
    musico_nombre = serializers.CharField(source='musico.nombre_completo', read_only=True)

    class Meta:
        model = Adelanto
        fields = '__all__'


class PlanillaLiquidacionSerializer(serializers.ModelSerializer):
    eventos_detalles = EventoSerializer(source='eventos', many=True, read_only=True)

    class Meta:
        model = PlanillaLiquidacion
        fields = '__all__'


class PagoSerializer(serializers.ModelSerializer):
    musico_nombre = serializers.CharField(source='musico.nombre_completo', read_only=True)
    planilla_titulo = serializers.CharField(source='planilla.titulo', read_only=True)

    class Meta:
        model = Pago
        fields = '__all__'


class PlanillaLiquidacionDetalleSerializer(serializers.ModelSerializer):
    eventos_detalles = EventoSerializer(source='eventos', many=True, read_only=True)
    pagos_detalles = PagoSerializer(source='pagos', many=True, read_only=True)
    total_pagos = serializers.SerializerMethodField()

    class Meta:
        model = PlanillaLiquidacion
        fields = '__all__'

    def get_total_pagos(self, obj):
        return obj.pagos.aggregate(total=Sum('monto_final'))['total'] or Decimal('0.00')


class DetalleMontoDiarioSerializer(serializers.ModelSerializer):
    musico_nombre = serializers.CharField(source='contrato.musico.nombre_completo', read_only=True)
    evento_titulo = serializers.CharField(source='contrato.evento.titulo', read_only=True)
    aprobado_por_nombre = serializers.CharField(source='aprobado_por.get_full_name', read_only=True)

    class Meta:
        model = DetalleMontoDiario
        fields = '__all__'


class ContratoMusicoSerializer(serializers.ModelSerializer):
    musico_nombre = serializers.CharField(source='musico.nombre_completo', read_only=True)
    evento_titulo = serializers.CharField(source='evento.titulo', read_only=True)
    aprobado_por_nombre = serializers.CharField(source='aprobado_por.get_full_name', read_only=True)
    detalles_diarios = DetalleMontoDiarioSerializer(many=True, read_only=True)
    monto_total_calculado = serializers.SerializerMethodField()

    class Meta:
        model = ContratoMusico
        fields = '__all__'

    def get_monto_total_calculado(self, obj):
        if obj.detalles_diarios.exists():
            return obj.detalles_diarios.aggregate(total=Sum('monto_asignado'))['total'] or Decimal('0.00')
        return obj.monto_diario


class AsistenciaExtendedSerializer(serializers.ModelSerializer):
    musico_nombre = serializers.CharField(source='musico.nombre_completo', read_only=True)
    evento_titulo = serializers.CharField(source='evento.titulo', read_only=True)
    contrato_detalle = ContratoMusicoSerializer(source='contrato', read_only=True)

    class Meta:
        model = Asistencia
        fields = '__all__'


class JefeSeccionSerializer(serializers.ModelSerializer):
    musico_nombre = serializers.CharField(source='musico.nombre_completo', read_only=True)
    seccion_display = serializers.CharField(source='get_seccion_display', read_only=True)

    class Meta:
        model = JefeSeccion
        fields = '__all__'


class ConfiguracionSistemaSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConfiguracionSistema
        fields = '__all__'


class DeudaSerializer(serializers.ModelSerializer):
    musico_nombre = serializers.CharField(source='musico.nombre_completo', read_only=True)
    saldo_restante = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = Deuda
        fields = '__all__'


class AbonoDeudaSerializer(serializers.ModelSerializer):
    deuda_motivo = serializers.CharField(source='deuda.motivo', read_only=True)
    musico_nombre = serializers.CharField(source='deuda.musico.nombre_completo', read_only=True)

    class Meta:
        model = AbonoDeuda
        fields = '__all__'
