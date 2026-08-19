from slowapi import Limiter
from slowapi.util import get_remote_address

# rate limiting por IP, en memoria — informe de seguridad 18-08-2026,
# hallazgo #6. Render Free corre un solo proceso, así que el storage en
# memoria (default de slowapi) alcanza; si el proyecto crece a más de una
# instancia, ahí sí hace falta un backend compartido (Redis) para que el
# límite sea real entre procesos.
#
# default_limits aplica a TODAS las rutas salvo que se sobreescriba con
# @limiter.limit(...) en un endpoint puntual (ver tier_lists.py: POST
# /tierlists tiene un límite más estricto porque es el único endpoint de
# escritura que no requiere ninguna cuenta).
limiter = Limiter(key_func=get_remote_address, default_limits=["300/hour"])
