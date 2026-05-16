from rest_framework import serializers
from .models import *

class DepartmentSerializer(serializers.ModelSerializer):
    class Meta: model = Department; fields = '__all__'
class DesignationSerializer(serializers.ModelSerializer):
    class Meta: model = Designation; fields = '__all__'
class EmployeeSerializer(serializers.ModelSerializer):
    class Meta: model = Employee; fields = '__all__'
class LeaveTypeSerializer(serializers.ModelSerializer):
    class Meta: model = LeaveType; fields = '__all__'
class LeaveRequestSerializer(serializers.ModelSerializer):
    class Meta: model = LeaveRequest; fields = '__all__'
class AttendanceSerializer(serializers.ModelSerializer):
    anomaly_flag = serializers.SerializerMethodField()
    class Meta: model = Attendance; fields = '__all__'
    def get_anomaly_flag(self, obj): return (obj.status.lower() == 'absent') or (obj.overtime_hours and float(obj.overtime_hours) > 4)
class PayrollSerializer(serializers.ModelSerializer):
    preview_net_salary = serializers.SerializerMethodField()
    class Meta: model = Payroll; fields = '__all__'
    def get_preview_net_salary(self, obj):
        allowances = sum([float(v) for v in (obj.allowances or {}).values()])
        deductions = sum([float(v) for v in (obj.deductions or {}).values()])
        return float(obj.basic_salary) + allowances - deductions
class RecruitmentJobSerializer(serializers.ModelSerializer):
    class Meta: model = RecruitmentJob; fields = '__all__'
class RecruitmentApplicantSerializer(serializers.ModelSerializer):
    class Meta: model = RecruitmentApplicant; fields = '__all__'
class PerformanceReviewSerializer(serializers.ModelSerializer):
    class Meta: model = PerformanceReview; fields = '__all__'
