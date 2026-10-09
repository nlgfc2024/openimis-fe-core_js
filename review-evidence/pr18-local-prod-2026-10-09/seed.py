import json, secrets
from pathlib import Path
from django.conf import settings
from core.test_helpers import create_test_interactive_user, create_test_language, create_admin_role
from core.models import Role, UserRole
create_test_language()
password = 'Local!8' + secrets.token_urlsafe(18)
role = create_admin_role()
role.is_system = 64
role.save()
user = create_test_interactive_user(username='local_auth_admin', password=password, roles=[role.id])
from django.core.cache import cache
cache.clear()
assert user.is_staff and user.is_superuser
out = Path('/tmp/mlatho-local-prod/credentials.json')
out.write_text(json.dumps({'username': user.username, 'password': password}))
out.chmod(0o600)
print('Isolated test admin created')
print(json.dumps({k: getattr(settings, k) for k in ['MODE','DEBUG','IS_TESTING','CSRF_USE_SESSIONS','CSRF_COOKIE_SECURE','SESSION_COOKIE_SECURE','SESSION_COOKIE_AGE','CSRF_TRUSTED_ORIGINS','USE_X_FORWARDED_HOST','SECURE_PROXY_SSL_HEADER','MIDDLEWARE']}, default=str, indent=2))
import core
print('Loaded core:', core.__file__)
