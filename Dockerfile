FROM python:3.10-slim

# Establecer variables de entorno
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Establecer directorio de trabajo
WORKDIR /app

# Instalar dependencias del sistema requeridas para pdfplumber y postgres
RUN apt-get update \
    && apt-get install -y --no-install-recommends gcc libpq-dev \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Crear usuario sin privilegios root
RUN addgroup --system appgroup && adduser --system --group appuser

# Instalar dependencias de Python
COPY requirements.txt /app/
RUN pip install --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Copiar el proyecto
COPY . /app/
RUN chown -R appuser:appgroup /app
USER appuser