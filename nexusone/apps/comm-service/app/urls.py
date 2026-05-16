from django.http import JsonResponse
from django.urls import include, path


def health(_request):
    return JsonResponse({'service': 'comm-service', 'status': 'ok'})


urlpatterns = [
    path('health/', health),
    path('comm/', include('app.comm.urls')),
]
