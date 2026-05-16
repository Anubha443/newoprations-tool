from django.db import models

class Department(models.Model):
    id = models.BigAutoField(primary_key=True)
    org_id = models.UUIDField()
    name = models.CharField(max_length=120)
    head_id = models.UUIDField(null=True, blank=True)
    parent_id = models.BigIntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta: db_table = 'departments'

class Designation(models.Model):
    id = models.BigAutoField(primary_key=True)
    org_id = models.UUIDField()
    name = models.CharField(max_length=120)
    department_id = models.BigIntegerField()
    level = models.IntegerField(default=1)
    class Meta: db_table = 'designations'

class Employee(models.Model):
    id = models.BigAutoField(primary_key=True)
    user_id = models.UUIDField()
    org_id = models.UUIDField()
    employee_code = models.CharField(max_length=60, unique=True)
    department_id = models.BigIntegerField(null=True, blank=True)
    designation_id = models.BigIntegerField(null=True, blank=True)
    manager_id = models.BigIntegerField(null=True, blank=True)
    employment_type = models.CharField(max_length=50)
    join_date = models.DateField()
    status = models.CharField(max_length=40)
    salary_info = models.JSONField(default=dict)
    emergency_contact = models.JSONField(default=dict)
    documents = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta: db_table = 'employees'

class LeaveType(models.Model):
    id = models.BigAutoField(primary_key=True)
    org_id = models.UUIDField()
    name = models.CharField(max_length=80)
    days_allowed = models.IntegerField(default=0)
    carry_forward = models.BooleanField(default=False)
    paid = models.BooleanField(default=True)
    class Meta: db_table = 'leave_types'

class LeaveRequest(models.Model):
    id = models.BigAutoField(primary_key=True)
    employee_id = models.BigIntegerField()
    leave_type_id = models.BigIntegerField()
    from_date = models.DateField()
    to_date = models.DateField()
    days = models.DecimalField(max_digits=5, decimal_places=2)
    reason = models.TextField()
    status = models.CharField(max_length=20, default='pending')
    approved_by = models.UUIDField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta: db_table = 'leave_requests'

class Attendance(models.Model):
    id = models.BigAutoField(primary_key=True)
    employee_id = models.BigIntegerField()
    date = models.DateField()
    check_in = models.DateTimeField(null=True, blank=True)
    check_out = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=30)
    overtime_hours = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    notes = models.TextField(blank=True)
    class Meta: db_table = 'attendance'

class Payroll(models.Model):
    id = models.BigAutoField(primary_key=True)
    employee_id = models.BigIntegerField()
    month = models.IntegerField()
    year = models.IntegerField()
    basic_salary = models.DecimalField(max_digits=12, decimal_places=2)
    allowances = models.JSONField(default=dict)
    deductions = models.JSONField(default=dict)
    net_salary = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    status = models.CharField(max_length=20, default='draft')
    processed_at = models.DateTimeField(null=True, blank=True)
    class Meta: db_table = 'payroll'

class RecruitmentJob(models.Model):
    id = models.BigAutoField(primary_key=True)
    org_id = models.UUIDField()
    title = models.CharField(max_length=180)
    department_id = models.BigIntegerField(null=True, blank=True)
    description = models.TextField()
    requirements = models.TextField()
    status = models.CharField(max_length=20, default='open')
    openings = models.IntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta: db_table = 'recruitment_jobs'

class RecruitmentApplicant(models.Model):
    id = models.BigAutoField(primary_key=True)
    job_id = models.BigIntegerField()
    name = models.CharField(max_length=140)
    email = models.EmailField()
    phone = models.CharField(max_length=40, blank=True)
    resume_url = models.TextField()
    stage = models.CharField(max_length=30, default='applied')
    ai_score = models.FloatField(null=True, blank=True)
    ai_summary = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta: db_table = 'recruitment_applicants'

class PerformanceReview(models.Model):
    id = models.BigAutoField(primary_key=True)
    employee_id = models.BigIntegerField()
    reviewer_id = models.UUIDField()
    period = models.CharField(max_length=40)
    ratings = models.JSONField(default=dict)
    comments = models.TextField(blank=True)
    overall_score = models.FloatField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta: db_table = 'performance_reviews'
