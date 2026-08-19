"""Precarga al staff del club en la base, resolviendo sus usernames de
Twitch a IDs reales vía la API — así cuando cada uno hace login por primera
vez, el sistema ya los reconoce como staff sin intervención manual.

Uso:
    docker compose exec backend python scripts/seed_staff.py

Idempotente: correrlo de nuevo no duplica nada ni pisa is_staff de alguien
que ya se logueó y quedó con datos de perfil reales.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.database import SessionLocal
from app.models import Role, User
from app.services.twitch import (
    TwitchAuthError,
    fetch_users_by_login,
    get_app_access_token,
)

# username de Twitch -> nombre de rol (catálogo, ver SPECS.md §5)
STAFF: dict[str, str] = {
    "BazthyFreeman": "CEO",
    "chubisxd": "Artista",
    "Sirxtias1": "Caster y Programación",
    "l_DracheN_l": "Contenido Multimedia",
    "zacenfg": "Gestión de Recursos y TO",
    "AckermanFG": "Programador",
    "pochoclo23": "Colaborador Externo",
}

ROLE_CATALOG = [
    "CEO",
    "Artista",
    "Caster y Programación",
    "Contenido Multimedia",
    "Gestión de Recursos y TO",
    "Programador",
    "Colaborador Externo",
]


def ensure_role_catalog(db) -> dict[str, Role]:
    roles = {r.name: r for r in db.query(Role).all()}
    for name in ROLE_CATALOG:
        if name not in roles:
            role = Role(name=name)
            db.add(role)
            roles[name] = role
    db.commit()
    return {
        name: db.query(Role).filter(Role.name == name).first() for name in ROLE_CATALOG
    }


def main() -> None:
    db = SessionLocal()
    roles = ensure_role_catalog(db)

    try:
        app_token = get_app_access_token()
        twitch_users = fetch_users_by_login(list(STAFF.keys()), app_token)
    except TwitchAuthError as exc:
        print(f"ERROR consultando Twitch: {exc}")
        db.close()
        sys.exit(1)

    found_logins = {u["login"].lower() for u in twitch_users}
    missing = [login for login in STAFF if login.lower() not in found_logins]
    if missing:
        print(f"AVISO: no se encontraron en Twitch estos usernames: {missing}")
        print("       (revisar que estén bien escritos — no bloquea al resto)")

    for twitch_user in twitch_users:
        login_key = next(
            (k for k in STAFF if k.lower() == twitch_user["login"].lower()), None
        )
        if login_key is None:
            continue
        role_name = STAFF[login_key]

        user = db.query(User).filter(User.twitch_id == twitch_user["id"]).first()
        if user is None:
            user = User(
                twitch_id=twitch_user["id"],
                twitch_username=twitch_user["login"],
                display_name=twitch_user["display_name"],
                avatar_url=twitch_user.get("profile_image_url"),
                is_staff=True,
            )
            db.add(user)
            print(f"+ creado: {twitch_user['display_name']} ({role_name})")
        else:
            if not user.is_staff:
                user.is_staff = True
                print(f"~ promovido a staff: {twitch_user['display_name']}")
            else:
                print(f"= ya existía como staff: {twitch_user['display_name']}")

        role = roles[role_name]
        if role not in user.roles:
            user.roles.append(role)

        db.commit()

    db.close()
    print("\nListo.")


if __name__ == "__main__":
    main()
