from django.utils import timezone
from rest_framework.decorators import api_view
from rest_framework.response import Response
from pypdf import PdfReader
import httpx
from .models import *
from .serializers import *


def _crud(request, model, serializer):
    if request.method == 'GET':
        if request.GET.get('id'):
            obj = model.objects.get(id=request.GET['id'])
            return Response(serializer(obj).data)
        return Response(serializer(model.objects.all(), many=True).data)
    if request.method == 'POST':
        s = serializer(data=request.data); s.is_valid(raise_exception=True); s.save(); return Response(s.data, status=201)
    if request.method == 'PUT':
        obj = model.objects.get(id=request.data['id']); s = serializer(obj, data=request.data, partial=True); s.is_valid(raise_exception=True); s.save(); return Response(s.data)
    if request.method == 'DELETE':
        model.objects.filter(id=request.data.get('id')).delete(); return Response(status=204)

@api_view(['GET','POST','PUT','DELETE'])
def employees(request): return _crud(request, Employee, EmployeeSerializer)
@api_view(['GET','POST','PUT','DELETE'])
def departments(request): return _crud(request, Department, DepartmentSerializer)
@api_view(['GET','POST','PUT','DELETE'])
def leave_types(request): return _crud(request, LeaveType, LeaveTypeSerializer)
@api_view(['GET','POST'])
def leave_requests(request): return _crud(request, LeaveRequest, LeaveRequestSerializer)
@api_view(['PUT'])
def leave_approve_reject(request, id):
    lr = LeaveRequest.objects.get(id=id); lr.status = request.data.get('status','approved'); lr.approved_by = getattr(request,'user_payload',{}).get('sub'); lr.save(update_fields=['status','approved_by']); return Response(LeaveRequestSerializer(lr).data)

@api_view(['POST'])
def checkin(request):
    a, _ = Attendance.objects.get_or_create(employee_id=request.data['employee_id'], date=timezone.now().date(), defaults={'status':'present'})
    a.check_in = timezone.now(); a.status='present'; a.save(); return Response(AttendanceSerializer(a).data)
@api_view(['POST'])
def checkout(request):
    a = Attendance.objects.get(employee_id=request.data['employee_id'], date=timezone.now().date())
    a.check_out = timezone.now(); a.save(); return Response(AttendanceSerializer(a).data)
@api_view(['GET'])
def attendance_list(request): return Response(AttendanceSerializer(Attendance.objects.all(), many=True).data)

@api_view(['GET','POST','PUT','DELETE'])
def payroll(request): return _crud(request, Payroll, PayrollSerializer)
@api_view(['POST'])
def payroll_process(request, id):
    p = Payroll.objects.get(id=id); p.net_salary = PayrollSerializer(p).data['preview_net_salary']; p.status='processed'; p.processed_at=timezone.now(); p.save(update_fields=['net_salary','status','processed_at']); return Response(PayrollSerializer(p).data)

@api_view(['GET','POST','PUT','DELETE'])
def jobs(request): return _crud(request, RecruitmentJob, RecruitmentJobSerializer)
@api_view(['GET','POST','PUT','DELETE'])
def applicants(request): return _crud(request, RecruitmentApplicant, RecruitmentApplicantSerializer)

@api_view(['POST'])
def applicant_ai_screen(request, id):
    a = RecruitmentApplicant.objects.get(id=id)
    resume_text = ''
    try:
        if a.resume_url.startswith('file://'):
            reader = PdfReader(a.resume_url.replace('file://',''))
            resume_text = '\n'.join([(p.extract_text() or '') for p in reader.pages])
    except Exception:
        resume_text = ''
    payload = {'name': a.name, 'resume_text': resume_text, 'job_id': a.job_id}
    ai_url = request.headers.get('X-AI-Service-URL', 'http://api-gateway:4000/internal/ai/hrm-screen')
    result = {'score': 65, 'summary': 'Baseline candidate profile.'}
    try:
        with httpx.Client(timeout=20) as client:
            result = client.post(ai_url, json=payload).json()
    except Exception:
        pass
    a.ai_score = float(result.get('score', 0)); a.ai_summary = result.get('summary', 'No summary'); a.save(update_fields=['ai_score','ai_summary'])
    return Response(RecruitmentApplicantSerializer(a).data)
