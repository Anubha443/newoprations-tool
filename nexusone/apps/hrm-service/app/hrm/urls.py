from django.urls import path
from . import views
urlpatterns = [
    path('employees', views.employees),
    path('departments', views.departments),
    path('leave-types', views.leave_types),
    path('leave-requests', views.leave_requests),
    path('leave-requests/<int:id>/approve', views.leave_approve_reject),
    path('leave-requests/<int:id>/reject', views.leave_approve_reject),
    path('attendance/checkin', views.checkin),
    path('attendance/checkut', views.checkout),
    path('attendance', views.attendance_list),
    path('payroll', views.payroll),
    path('payroll/<int:id>/process', views.payroll_process),
    path('jobs', views.jobs),
    path('applicants', views.applicants),
    path('applicants/<int:id>/ai-screen', views.applicant_ai_screen),
]
