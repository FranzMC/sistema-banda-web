# Generated migration to remove unique constraint from documento_identidad

from django.db import migrations, models
import django.core.validators


class Migration(migrations.Migration):
    dependencies = [
        ("gestion_banda", "0002_alter_configuracionsistema_hora_limite_tardanza"),
    ]

    operations = [
        migrations.AlterField(
            model_name="musico",
            name="documento_identidad",
            field=models.CharField(
                blank=True,
                max_length=20,
                null=True,
                validators=[
                    django.core.validators.RegexValidator(
                        "^[0-9-]+$", "Solo se permiten números y guiones"
                    )
                ],
                verbose_name="Documento de Identidad",
            ),
        ),
    ]
