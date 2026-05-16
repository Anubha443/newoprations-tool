from django.http import JsonResponse
from django.urls import include, path

def health(_request):
    return JsonResponse({'service': 'hrm-service', 'status': 'ok'})

urlpatterns = [
    path('health/', health),
    path('hrm/', include('app.hrm.urls')),
]
