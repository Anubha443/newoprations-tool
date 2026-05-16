import os

SECRET_KEY = 'dev-only'
DEBUG = True
ALLOWED_HOSTS = ['*']
ROOT_URLCONF = 'app.urls'
ASGI_APPLICATION = 'app.asgi.application'

INSTALLED_APPS = [
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'rest_framework',
    'channels',
    'app.comm',
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
        'OPTIONS': {'options': '-c search_path=nexus_comm,nexus_core,public'},
    }
}

CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {'hosts': [(os.getenv('REDIS_HOST', 'redis'), 6379)]},
    }
}

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [],
    'DEFAULT_PERMISSION_CLASSES': [],
}
