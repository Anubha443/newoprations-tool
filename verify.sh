#!/usr/bin/env bash
set +e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$ROOT_DIR/nexusone"
if [ -f "$APP_DIR/.env" ]; then
  # shellcheck disable=SC1090
  source "$APP_DIR/.env"
fi

PGHOST="${POSTGRES_HOST:-localhost}"
PGPORT="${POSTGRES_PORT:-5432}"
PGDATABASE="${POSTGRES_DB:-nexusone}"
PGUSER="${POSTGRES_USER:-nexus}"
PGPASSWORD="${POSTGRES_PASSWORD:-nexus}"
export PGPASSWORD

API="http://localhost:4000"
COMM="http://localhost:8001"
HRM="http://localhost:8002"
CRM="http://localhost:8003"
WEB="http://localhost:3000"

GREEN='\033[0;32m'; RED='\033[0;31m'; CYAN='\033[0;36m'; NC='\033[0m'

echo -e "${CYAN}============================================${NC}"
echo -e "${CYAN} NexusOne - Full System Verification ${NC}"
echo -e "${CYAN}============================================${NC}"

pass_count=0
total=42
failed=()
TOKEN=""; COOKIE_JAR="$(mktemp)"
ORG_NAME="Verify Org $RANDOM"; EMAIL="verify_$RANDOM@nexusone.local"; PASSWORD="Passw0rd!123"
CHANNEL_ID=""; MSG_ID=""; DEPT_ID=""; EMP_ID=""; LEAVE_TYPE_ID=""; LEAVE_ID=""; JOB_ID=""; APP_ID=""
PIPE_ID=""; STAGE_ID=""; CO_ID=""; CONTACT_ID=""; DEAL_ID=""; WON_STAGE_ID=""

check() {
  local num="$1"; local name="$2"; local cmd="$3"
  local out
  out=$(eval "$cmd" 2>&1)
  local code=$?
  if [ $code -eq 0 ]; then
    echo -e "Check $num: $name -> ${GREEN}PASS ✅${NC}"
    pass_count=$((pass_count+1))
  else
    echo -e "Check $num: $name -> ${RED}FAIL ❌${NC}"
    echo "  Response/Error: $out"
    failed+=("$num")
  fi
}

json_field() { python - "$1" "$2" <<'PY'
import json,sys
raw=sys.argv[1]; key=sys.argv[2]
try:
 d=json.loads(raw); print(d.get(key,''))
except Exception: print('')
PY
}

contains_status_ok() { python - "$1" <<'PY'
import json,sys
try:
 d=json.loads(sys.argv[1]);
 if isinstance(d,dict) and d.get('status')=='ok': raise SystemExit(0)
except Exception: pass
raise SystemExit(1)
PY
}

# 1
check 1 "All 5 app containers running" "docker ps --format '{{.Names}}' | grep -E 'web|api-gateway|comm-service|hrm-service|crm-service' | wc -l | awk '{exit !(
\$1>=5)}'"

# 2
check 2 "PostgreSQL schemas exist" "psql -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE -tAc \"SELECT COUNT(*) FROM information_schema.schemata WHERE schema_name IN ('nexus_core','nexus_comm','nexus_hrm','nexus_crm');\" | grep -qx '4'"

# 3
check 3 "Redis PING" "(redis-cli -h localhost -p 6379 ping || docker exec \$(docker ps --format '{{.Names}}' | grep redis | head -n1) redis-cli ping) | grep -q PONG"

# 4
check 4 "All /health endpoints status ok" "for u in $WEB/health $API/health $COMM/health $HRM/health $CRM/health; do r=\$(curl -sS \"\$u\"); python - <<PY
import json,sys
try:
 d=json.loads('''\$r''')
 ok=(isinstance(d,dict) and d.get('status')=='ok')
except Exception:
 ok=False
sys.exit(0 if ok else 1)
PY
 || exit 1; done"

# 5 register
check 5 "POST /auth/register" "resp=\$(curl -sS -c $COOKIE_JAR -w '\n%{http_code}' -X POST $API/auth/register -H 'Content-Type: application/json' -d '{\"organizationName\":\"$ORG_NAME\",\"owner\":{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"full_name\":\"Verifier User\"}}'); body=\$(echo \"\$resp\"|head -n1); code=\$(echo \"\$resp\"|tail -n1); [ \"\$code\" = '201' ] && echo \"\$body\" | grep -q 'owner_id'"

# 6 login
check 6 "POST /auth/login" "resp=\$(curl -sS -c $COOKIE_JAR -w '\n%{http_code}' -X POST $API/auth/login -H 'Content-Type: application/json' -d '{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}'); body=\$(echo \"\$resp\"|head -n1); code=\$(echo \"\$resp\"|tail -n1); TOKEN=\$(python - <<PY
import json
try: print(json.loads('''\$body''').get('accessToken',''))
except: print('')
PY
); [ \"\$code\" = '200' ] && [ -n \"\$TOKEN\" ]"

# 7
check 7 "GET /auth/me with token" "resp=\$(curl -sS -w '\n%{http_code}' -H \"Authorization: Bearer $TOKEN\" $API/auth/me); body=\$(echo \"\$resp\"|head -n1); code=\$(echo \"\$resp\"|tail -n1); [ \"\$code\" = '200' ] && echo \"\$body\" | grep -q \"$EMAIL\""

# 8
check 8 "GET /auth/me no token is 401" "code=\$(curl -sS -o /tmp/v_noauth.out -w '%{http_code}' $API/auth/me); [ \"\$code\" = '401' ]"

# 9
check 9 "POST /auth/refresh" "resp=\$(curl -sS -b $COOKIE_JAR -c $COOKIE_JAR -w '\n%{http_code}' -X POST $API/auth/refresh); body=\$(echo \"\$resp\"|head -n1); code=\$(echo \"\$resp\"|tail -n1); NEW=\$(python - <<PY
import json
try: print(json.loads('''\$body''').get('accessToken',''))
except: print('')
PY
); [ \"\$code\" = '200' ] && [ -n \"\$NEW\" ]"

# 10-15
check 10 "Create channel" "resp=\$(curl -sS -w '\n%{http_code}' -X POST $COMM/comm/channels -H 'Content-Type: application/json' -H \"Authorization: Bearer $TOKEN\" -d '{\"org_id\":\"11111111-1111-1111-1111-111111111111\",\"name\":\"verification\",\"description\":\"verify\",\"type\":\"public\"}'); body=\$(echo \"\$resp\"|head -n1); code=\$(echo \"\$resp\"|tail -n1); CHANNEL_ID=\$(python - <<PY
import json
try: print(json.loads('''\$body''').get('id',''))
except: print('')
PY
); [ \"\$code\" = '201' ] && [ -n \"\$CHANNEL_ID\" ]"
check 11 "Create message" "resp=\$(curl -sS -w '\n%{http_code}' -X POST $COMM/comm/messages -H 'Content-Type: application/json' -H \"Authorization: Bearer $TOKEN\" -d '{\"channel\":'\"$CHANNEL_ID\"',\"topic_name\":\"Verification\",\"content\":\"Hello NexusOne\",\"content_type\":\"plain\"}'); body=\$(echo \"\$resp\"|head -n1); code=\$(echo \"\$resp\"|tail -n1); MSG_ID=\$(python - <<PY
import json
try: print(json.loads('''\$body''').get('id',''))
except: print('')
PY
); [ \"\$code\" = '201' ] && [ -n \"\$MSG_ID\" ]"
check 12 "Get topic messages contains ours" "curl -sS -H \"Authorization: Bearer $TOKEN\" '$COMM/comm/channels/$CHANNEL_ID/messages?topic=Verification' | grep -q 'Hello NexusOne'"
check 13 "React to message" "code=\$(curl -sS -o /tmp/v13.out -w '%{http_code}' -X POST $COMM/comm/messages/$MSG_ID/react -H 'Content-Type: application/json' -H \"Authorization: Bearer $TOKEN\" -d '{\"emoji\":\"👍\"}'); [ \"\$code\" = '200' ]"
check 14 "Search message by q" "curl -sS -H \"Authorization: Bearer $TOKEN\" '$COMM/comm/search?q=Hello&channel_id=$CHANNEL_ID' | grep -q 'Hello NexusOne'"
check 15 "Summarize topic" "resp=\$(curl -sS -w '\n%{http_code}' -X POST $COMM/comm/channels/$CHANNEL_ID/topics/Verification/summarize -H 'Content-Type: application/json' -H \"Authorization: Bearer $TOKEN\"); body=\$(echo \"\$resp\"|head -n1); code=\$(echo \"\$resp\"|tail -n1); [ \"\$code\" = '200' ] && python - <<PY
import json,sys
try:
 s=json.loads('''\$body''').get('summary','')
 sys.exit(0 if isinstance(s,str) and len(s.strip())>0 else 1)
except Exception: sys.exit(1)
PY"

# 16-25
check 16 "Create department" "resp=\$(curl -sS -w '\n%{http_code}' -X POST $HRM/hrm/departments -H 'Content-Type: application/json' -H \"Authorization: Bearer $TOKEN\" -d '{\"org_id\":\"11111111-1111-1111-1111-111111111111\",\"name\":\"Verification Dept\"}'); body=\$(echo \"\$resp\"|head -n1); code=\$(echo \"\$resp\"|tail -n1); DEPT_ID=\$(python - <<PY
import json
try: print(json.loads('''\$body''').get('id',''))
except: print('')
PY
); [ \"\$code\" = '201' ] && [ -n \"\$DEPT_ID\" ]"
check 17 "Create employee" "resp=\$(curl -sS -w '\n%{http_code}' -X POST $HRM/hrm/employees -H 'Content-Type: application/json' -H \"Authorization: Bearer $TOKEN\" -d '{\"user_id\":\"11111111-1111-1111-1111-111111111112\",\"org_id\":\"11111111-1111-1111-1111-111111111111\",\"employee_code\":\"EMP-'\"$RANDOM\"'\",\"department_id\":'\"$DEPT_ID\"',\"employment_type\":\"full_time\",\"join_date\":\"2026-01-01\",\"status\":\"active\"}'); body=\$(echo \"\$resp\"|head -n1); code=\$(echo \"\$resp\"|tail -n1); EMP_ID=\$(python - <<PY
import json
try: print(json.loads('''\$body''').get('id',''))
except: print('')
PY
); [ \"\$code\" = '201' ] && [ -n \"\$EMP_ID\" ]"
check 18 "Get employee by id includes dept" "curl -sS -H \"Authorization: Bearer $TOKEN\" '$HRM/hrm/employees?id=$EMP_ID' | grep -q 'department_id'"
check 19 "Create leave type" "resp=\$(curl -sS -w '\n%{http_code}' -X POST $HRM/hrm/leave-types -H 'Content-Type: application/json' -H \"Authorization: Bearer $TOKEN\" -d '{\"org_id\":\"11111111-1111-1111-1111-111111111111\",\"name\":\"Annual\",\"days_allowed\":20,\"carry_forward\":true,\"paid\":true}'); body=\$(echo \"\$resp\"|head -n1); code=\$(echo \"\$resp\"|tail -n1); LEAVE_TYPE_ID=\$(python - <<PY
import json
try: print(json.loads('''\$body''').get('id',''))
except: print('')
PY
); [ \"\$code\" = '201' ] && [ -n \"\$LEAVE_TYPE_ID\" ]"
check 20 "Create leave request pending" "resp=\$(curl -sS -w '\n%{http_code}' -X POST $HRM/hrm/leave-requests -H 'Content-Type: application/json' -H \"Authorization: Bearer $TOKEN\" -d '{\"employee_id\":'\"$EMP_ID\"',\"leave_type_id\":'\"$LEAVE_TYPE_ID\"',\"from_date\":\"2026-06-01\",\"to_date\":\"2026-06-02\",\"days\":2,\"reason\":\"verification\"}'); body=\$(echo \"\$resp\"|head -n1); code=\$(echo \"\$resp\"|tail -n1); LEAVE_ID=\$(python - <<PY
import json
try:
 d=json.loads('''\$body''');print(d.get('id',''));import sys;sys.exit(0 if d.get('status')=='pending' else 1)
except Exception: import sys;sys.exit(1)
PY
); [ \"\$code\" = '201' ] && [ -n \"\$LEAVE_ID\" ]"
check 21 "Approve leave" "resp=\$(curl -sS -w '\n%{http_code}' -X PUT $HRM/hrm/leave-requests/$LEAVE_ID/approve -H 'Content-Type: application/json' -H \"Authorization: Bearer $TOKEN\" -d '{\"status\":\"approved\"}'); body=\$(echo \"\$resp\"|head -n1); code=\$(echo \"\$resp\"|tail -n1); [ \"\$code\" = '200' ] && echo \"\$body\" | grep -q 'approved'"
check 22 "Attendance checkin" "resp=\$(curl -sS -w '\n%{http_code}' -X POST $HRM/hrm/attendance/checkin -H 'Content-Type: application/json' -H \"Authorization: Bearer $TOKEN\" -d '{\"employee_id\":'\"$EMP_ID\"'}'); body=\$(echo \"\$resp\"|head -n1); code=\$(echo \"\$resp\"|tail -n1); [ \"\$code\" = '200' ] && echo \"\$body\" | grep -q 'check_in'"
check 23 "Create job" "resp=\$(curl -sS -w '\n%{http_code}' -X POST $HRM/hrm/jobs -H 'Content-Type: application/json' -H \"Authorization: Bearer $TOKEN\" -d '{\"org_id\":\"11111111-1111-1111-1111-111111111111\",\"title\":\"Verification Engineer\",\"description\":\"desc\",\"requirements\":\"req\"}'); body=\$(echo \"\$resp\"|head -n1); code=\$(echo \"\$resp\"|tail -n1); JOB_ID=\$(python - <<PY
import json
try: print(json.loads('''\$body''').get('id',''))
except: print('')
PY
); [ \"\$code\" = '201' ] && [ -n \"\$JOB_ID\" ]"
check 24 "Create applicant" "resp=\$(curl -sS -w '\n%{http_code}' -X POST $HRM/hrm/applicants -H 'Content-Type: application/json' -H \"Authorization: Bearer $TOKEN\" -d '{\"job_id\":'\"$JOB_ID\"',\"name\":\"Alex Applicant\",\"email\":\"alex.applicant@example.com\",\"resume_url\":\"file:///tmp/nonexistent.pdf\"}'); body=\$(echo \"\$resp\"|head -n1); code=\$(echo \"\$resp\"|tail -n1); APP_ID=\$(python - <<PY
import json
try: print(json.loads('''\$body''').get('id',''))
except: print('')
PY
); [ \"\$code\" = '201' ] && [ -n \"\$APP_ID\" ]"
check 25 "AI screen applicant" "resp=\$(curl -sS -w '\n%{http_code}' -X POST $HRM/hrm/applicants/$APP_ID/ai-screen -H 'Content-Type: application/json' -H \"Authorization: Bearer $TOKEN\"); body=\$(echo \"\$resp\"|head -n1); code=\$(echo \"\$resp\"|tail -n1); [ \"\$code\" = '200' ] && python - <<PY
import json,sys
try:
 d=json.loads('''\$body''')
 ok=isinstance(d.get('ai_score'),(int,float)) and 0<=float(d['ai_score'])<=100 and isinstance(d.get('ai_summary'),str) and d['ai_summary'].strip()
 sys.exit(0 if ok else 1)
except Exception: sys.exit(1)
PY"

# 26-35
check 26 "Create pipeline" "resp=\$(curl -sS -w '\n%{http_code}' -X POST $CRM/crm/pipelines -H 'Content-Type: application/json' -H \"Authorization: Bearer $TOKEN\" -d '{\"org_id\":\"11111111-1111-1111-1111-111111111111\",\"name\":\"Sales Pipeline\",\"is_default\":true}'); body=\$(echo \"\$resp\"|head -n1); code=\$(echo \"\$resp\"|tail -n1); PIPE_ID=\$(python - <<PY
import json
try: print(json.loads('''\$body''').get('id',''))
except: print('')
PY
); [ \"\$code\" = '201' ] && [ -n \"\$PIPE_ID\" ]"
check 27 "Create stage Prospecting" "resp=\$(curl -sS -w '\n%{http_code}' -X POST $CRM/crm/pipelines/$PIPE_ID/stages -H 'Content-Type: application/json' -H \"Authorization: Bearer $TOKEN\" -d '{\"name\":\"Prospecting\",\"position\":1,\"color\":\"#6366F1\",\"probability\":20}'); body=\$(echo \"\$resp\"|head -n1); code=\$(echo \"\$resp\"|tail -n1); STAGE_ID=\$(python - <<PY
import json
try: print(json.loads('''\$body''').get('id',''))
except: print('')
PY
); [ \"\$code\" = '201' ] && [ -n \"\$STAGE_ID\" ]"
check 28 "Create company" "resp=\$(curl -sS -w '\n%{http_code}' -X POST $CRM/crm/companies -H 'Content-Type: application/json' -H \"Authorization: Bearer $TOKEN\" -d '{\"org_id\":\"11111111-1111-1111-1111-111111111111\",\"owner_id\":\"11111111-1111-1111-1111-111111111112\",\"name\":\"Test Corp\"}'); body=\$(echo \"\$resp\"|head -n1); code=\$(echo \"\$resp\"|tail -n1); CO_ID=\$(python - <<PY
import json
try: print(json.loads('''\$body''').get('id',''))
except: print('')
PY
); [ \"\$code\" = '201' ] && [ -n \"\$CO_ID\" ]"
check 29 "Create contact" "resp=\$(curl -sS -w '\n%{http_code}' -X POST $CRM/crm/contacts -H 'Content-Type: application/json' -H \"Authorization: Bearer $TOKEN\" -d '{\"org_id\":\"11111111-1111-1111-1111-111111111111\",\"owner_id\":\"11111111-1111-1111-1111-111111111112\",\"first_name\":\"Casey\",\"last_name\":\"Contact\",\"email\":\"casey@testcorp.com\",\"company_id\":\"'\"$CO_ID\"'\"}'); body=\$(echo \"\$resp\"|head -n1); code=\$(echo \"\$resp\"|tail -n1); CONTACT_ID=\$(python - <<PY
import json
try: print(json.loads('''\$body''').get('id',''))
except: print('')
PY
); [ \"\$code\" = '201' ] && [ -n \"\$CONTACT_ID\" ]"
check 30 "Create deal" "resp=\$(curl -sS -w '\n%{http_code}' -X POST $CRM/crm/deals -H 'Content-Type: application/json' -H \"Authorization: Bearer $TOKEN\" -d '{\"org_id\":\"11111111-1111-1111-1111-111111111111\",\"owner_id\":\"11111111-1111-1111-1111-111111111112\",\"name\":\"Verification Deal\",\"pipeline_id\":\"'\"$PIPE_ID\"'\",\"stage_id\":\"'\"$STAGE_ID\"'\",\"contact_id\":\"'\"$CONTACT_ID\"'\",\"company_id\":\"'\"$CO_ID\"'\",\"amount\":10000}'); body=\$(echo \"\$resp\"|head -n1); code=\$(echo \"\$resp\"|tail -n1); DEAL_ID=\$(python - <<PY
import json
try: print(json.loads('''\$body''').get('id',''))
except: print('')
PY
); [ \"\$code\" = '201' ] && [ -n \"\$DEAL_ID\" ]"
check 31 "Board includes deal under stage" "curl -sS -H \"Authorization: Bearer $TOKEN\" $CRM/crm/pipelines/$PIPE_ID/board | grep -q $DEAL_ID"
check 32 "Create activity" "code=\$(curl -sS -o /tmp/v32.out -w '%{http_code}' -X POST $CRM/crm/activities -H 'Content-Type: application/json' -H \"Authorization: Bearer $TOKEN\" -d '{\"org_id\":\"11111111-1111-1111-1111-111111111111\",\"type\":\"call\",\"title\":\"Verification call\",\"contact_id\":\"'\"$CONTACT_ID\"'\",\"created_by\":\"11111111-1111-1111-1111-111111111112\"}'); [ \"\$code\" = '201' ]"
check 33 "Contact timeline has activity" "curl -sS -H \"Authorization: Bearer $TOKEN\" $CRM/crm/contacts/$CONTACT_ID/timeline | grep -q 'Verification call'"
check 34 "Deal AI forecast fields" "resp=\$(curl -sS -w '\n%{http_code}' -X POST $CRM/crm/deals/$DEAL_ID/ai-forecast -H \"Authorization: Bearer $TOKEN\"); body=\$(echo \"\$resp\"|head -n1); code=\$(echo \"\$resp\"|tail -n1); [ \"\$code\" = '201' -o \"\$code\" = '200' ] && python - <<PY
import json,sys
try:
 d=json.loads('''\$body''')
 ok=(isinstance(d.get('probability',d.get('predicted_probability')), (int,float)) and isinstance(d.get('reasoning',str(d.get('factors',''))),str) and len(str(d.get('reasoning',d.get('factors',''))))>0)
 sys.exit(0 if ok else 1)
except Exception: sys.exit(1)
PY"
check 35 "CRM dashboard stats fields" "curl -sS -H \"Authorization: Bearer $TOKEN\" '$CRM/crm/dashboard/stats?org_id=11111111-1111-1111-1111-111111111111' | python - <<PY
import json,sys
d=json.loads(sys.stdin.read())
ok=('pipeline_value' in d or 'totalDeals' in d) and ('conversion_rate' in d or 'conversionRate' in d)
sys.exit(0 if ok else 1)
PY"

# 36-38
check 36 "AI chat non-empty" "resp=\$(curl -sS -N -m 20 -H 'Content-Type: application/json' -H \"Authorization: Bearer $TOKEN\" -X POST $API/ai/chat -d '{\"message\":\"Hello\",\"context_type\":\"general\"}'); [ -n \"\$resp\" ]"
check 37 "AI action summarize_thread non-empty" "resp=\$(curl -sS -H 'Content-Type: application/json' -H \"Authorization: Bearer $TOKEN\" -X POST $API/ai/action -d '{\"action_type\":\"summarize_thread\",\"payload\":{\"messages\":[\"Hello\",\"World\",\"This is a test thread\"]}}'); [ -n \"\$resp\" ] && echo \"\$resp\" | grep -qi 'summary\|result\|content'"
check 38 "AI search returns results array" "resp=\$(curl -sS -w '\n%{http_code}' -H 'Content-Type: application/json' -H \"Authorization: Bearer $TOKEN\" -X POST $API/ai/search -d '{\"query\":\"verification\",\"scope\":[\"comm\",\"hrm\",\"crm\"]}'); body=\$(echo \"\$resp\"|head -n1); code=\$(echo \"\$resp\"|tail -n1); [ \"\$code\" != '500' ] && echo \"\$body\" | grep -q 'results'"

# 39-42
check 39 "Audit log row exists" "psql -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE -tAc \"SELECT COUNT(*) FROM nexus_core.audit_logs;\" | awk '{exit !(\$1>0)}'"
check 40 "Move deal to Won and comm notification exists" "resp=\$(curl -sS -H 'Content-Type: application/json' -H \"Authorization: Bearer $TOKEN\" -X POST $CRM/crm/pipelines/$PIPE_ID/stages -d '{\"name\":\"Won\",\"position\":99,\"color\":\"#10B981\",\"probability\":100}'); WON_STAGE_ID=\$(python - <<PY
import json
try: print(json.loads('''\$resp''').get('id',''))
except: print('')
PY
); curl -sS -H 'Content-Type: application/json' -H \"Authorization: Bearer $TOKEN\" -X PUT $CRM/crm/deals/$DEAL_ID -d '{\"stage_id\":\"'\"$WON_STAGE_ID\"'\",\"status\":\"won\"}' >/dev/null && curl -sS -H 'Content-Type: application/json' -H \"Authorization: Bearer $TOKEN\" -X POST $API/integrations/deal-won-notification -d '{\"deal_name\":\"Verification Deal\",\"amount\":10000,\"channel_id\":'\"$CHANNEL_ID\"'}' >/dev/null && psql -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE -tAc \"SELECT COUNT(*) FROM nexus_comm.messages WHERE content ILIKE '%Deal won%Verification Deal%';\" | awk '{exit !(\$1>0)}'"
check 41 "Leave approval creates DM row" "curl -sS -H 'Content-Type: application/json' -H \"Authorization: Bearer $TOKEN\" -X POST $API/integrations/leave-approved-notification -d '{\"employee_user_id\":\"11111111-1111-1111-1111-111111111112\",\"dm_id\":'\"$CHANNEL_ID\"',\"leave_type\":\"Annual\",\"from_date\":\"2026-06-01\",\"to_date\":\"2026-06-02\"}' >/dev/null && psql -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE -tAc \"SELECT COUNT(*) FROM nexus_comm.messages WHERE content ILIKE '%approved%';\" | awk '{exit !(\$1>0)}'"
check 42 "x-request-id header on /auth/me" "curl -sSI -H \"Authorization: Bearer $TOKEN\" $API/auth/me | tr -d '\r' | grep -qi '^x-request-id:'"

echo "=============================="
echo "NexusOne Verification Complete"
echo "Passed: $pass_count / $total"
echo "=============================="
if [ ${#failed[@]} -gt 0 ]; then
  echo "Failed checks: $(IFS=,; echo "${failed[*]}") — fix these before proceeding to next prompt"
fi

rm -f "$COOKIE_JAR"
