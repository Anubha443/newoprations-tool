from django.urls import path
from . import views

urlpatterns = [
    path('channels', views.channels),
    path('channels/<int:id>/messages', views.channel_messages),
    path('messages', views.create_message),
    path('messages/<int:id>', views.update_message),
    path('messages/<int:id>', views.delete_message),
    path('messages/<int:id>/react', views.react_message),
    path('dm', views.dm),
    path('channels/<int:id>/topics/<str:topic>/summarize', views.summarize_topic),
    path('search', views.search_messages),
    path('channels/<int:channel_id>/topics/<str:topic>/read', views.read_receipt),
]
