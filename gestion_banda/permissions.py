from rest_framework import permissions


class TieneModulo(permissions.BasePermission):
    """Verifica que usuario tenga acceso al módulo especificado"""
    modulo_requerido = None

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        if self.modulo_requerido is None:
            return True

        return request.user.tiene_modulo(self.modulo_requerido)


class EsPresidente(permissions.BasePermission):
    """Solo presidentes pueden acceder"""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.rol == 'PRESIDENTE'


class EsDirector(permissions.BasePermission):
    """Solo directores y presidentes pueden acceder"""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.rol in ['DIRECTOR', 'PRESIDENTE']


class EsSubdirector(permissions.BasePermission):
    """Solo subdirectores y presidentes pueden acceder"""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.rol in ['SUBDIRECTOR', 'PRESIDENTE']


class EsJefeSeccion(permissions.BasePermission):
    """Solo jefes de sección y presidentes pueden acceder"""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.rol in ['JEFE_SECCION', 'PRESIDENTE']


class EsMusico(permissions.BasePermission):
    """Solo músicos pueden acceder"""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.rol == 'MUSICO'


class EsDirectorOSubdirector(permissions.BasePermission):
    """Solo directores, subdirectores y presidentes pueden acceder"""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.rol in ['DIRECTOR', 'SUBDIRECTOR', 'PRESIDENTE']
