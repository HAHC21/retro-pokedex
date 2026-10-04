from datetime import timedelta

from app.domain.roles import ROLE_ADMIN, ROLE_DEVELOPER, ROLE_USER

PASSWORD_PROVIDER = "password"
MIN_PASSWORD_LENGTH = 8
CONFIRMATION_TTL = timedelta(hours=48)
# Title rank only (never demote). Admin and developer share the same privileges.
ROLE_RANK = {ROLE_USER: 0, ROLE_DEVELOPER: 1, ROLE_ADMIN: 1}
