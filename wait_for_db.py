import time
import psycopg2
import os

db_host = os.environ.get('DB_HOST', 'db')
db_user = os.environ.get('DB_USER', 'admin_banda')
db_password = os.environ.get('DB_PASSWORD', 'meji_no_pierde_123')
db_name = os.environ.get('DB_NAME', 'sis_banda_prod')

print(f"Esperando a que la base de datos {db_host} esté lista...")

while True:
    try:
        psycopg2.connect(host=db_host, user=db_user, password=db_password, dbname=db_name)
        print("¡Base de datos lista!")
        break
    except psycopg2.OperationalError:
        print("Base de datos no disponible, esperando...")
        time.sleep(1)