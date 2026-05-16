SECRET_KEY = 'dev-only'
DEBUG = True
ALLOWED_HOSTS = ['*']
ROOT_URLCONF = 'app.urls'
INSTALLED_APPS = [
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'rest_framework',
    'app.hrm',
]
MIDDLEWARE = ['app.middleware.JWTAuthMiddleware']
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'nexusone',
        'USER': 'nexus',
        'PASSWORD': 'nexus',
        'HOST': 'postgres',
        'PORT': 5432,
        'OPTIONS': {'options': '-c search_path=nexus_hrm,nexus_core,public'},
    }
}
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [],
    'DEFAULT_PERMISSION_CLASSES': [],
}
