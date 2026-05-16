import os
import jwt
from django.http import JsonResponse

class JWTAuthMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.path.startswith('/health'):
            return self.get_response(request)
        auth = request.headers.get('Authorization', '')
        if not auth.startswith('Bearer '):
            return JsonResponse({'error': 'Missing bearer token'}, status=401)
        token = auth.split(' ', 1)[1]
        try:
            payload = jwt.decode(token, os.getenv('JWT_ACCESS_SECRET', 'dev_access_secret'), algorithms=['HS256'])
            request.user_payload = payload
        except Exception:
            return JsonResponse({'error': 'Invalid token'}, status=401)
        return self.get_response(request)
