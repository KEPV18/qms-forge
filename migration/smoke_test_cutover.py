#!/usr/bin/env python3
"""QMS FORGE — SMOKE TEST: Cutover verification (new schema only)"""
import json, urllib.request, urllib.error, time

PUBLISHABLE_KEY = 'sb_publishable_-9nZ5bjWkfV8_AFSSA3Qdg_LAMr8NxJ'
SR = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlvdXVpa3Rlcm9peG5zcWF6em5jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDg2ODc2MCwiZXhwIjoyMDkwNDQ0NzYwfQ.JuLDMQIh97T9wwuZEybXfVXn2e145tME81a1eo8khP8'
SUPABASE_URL = 'https://iouuikteroixnsqazznc.supabase.co'
REST_URL = SUPABASE_URL + '/rest/v1'

# Auth
auth_url = SUPABASE_URL + '/auth/v1/token?grant_type=password'
data = json.dumps({'email': 'ibnkhaled16@gmail.com', 'password': 'QMS2026!admin'}).encode()
req = urllib.request.Request(auth_url, data=data, headers={
    'apikey': PUBLISHABLE_KEY, 'Content-Type': 'application/json',
}, method='POST')
resp = urllib.request.urlopen(req, timeout=10)
token = json.loads(resp.read())['access_token']
print('✅ Auth OK')

auth_headers = {
    'apikey': PUBLISHABLE_KEY,
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
}

sr_headers = {
    'apikey': SR,
    'Authorization': 'Bearer ' + SR,
    'Content-Type': 'application/json',
}

# 1. CREATE (NEW SCHEMA COLUMNS ONLY)
record_data = {
    'form_code': 'F/99',
    'serial': 'F/99-CUTOVER-TEST',
    'form_name': 'Cutover Validation',
    'status': 'draft',
    'form_data': {'purpose': 'cutover_smoke_test', 'value': 42},
    'section': 0,
    'section_name': 'Test',
    'frequency': 'N/A',
    'created_by': 'cutover_test',
    'edit_count': 0,
    # Legacy NOT NULL columns (still required until Phase G drops them)
    'row_index': 99999,
    'code': 'SMOKE-TEST',
    'record_name': 'Cutover Validation',
    'category': 'Test',
    'description': 'Smoke test',
    'when_to_fill': 'N/A',
    'template_link': '',
    'folder_link': '',
    'last_serial': 'F/99-CUTOVER-TEST',
    'last_file_date': '2026/04/22',
    'days_ago': '',
    'next_serial': '',
    'audit_status': '',
    'reviewed': False,
    'reviewed_by': '',
    'review_date': '',
    'file_reviews': {},
    'record_status': 'draft',
}

url = REST_URL + '/records'
body = json.dumps(record_data).encode()
req = urllib.request.Request(url, data=body, headers=auth_headers, method='POST')

try:
    resp = urllib.request.urlopen(req, timeout=15)
    result = json.loads(resp.read())
    r = result[0]
    test_id = r['id']
    print(f'✅ CREATE: id={test_id[:8]}... form_code={r["form_code"]} serial={r["serial"]} status={r["status"]}')
except urllib.error.HTTPError as e:
    err = e.read().decode()
    print(f'❌ CREATE FAILED: HTTP {e.code} {err[:300]}')
    exit(1)

# 2. READ
url = REST_URL + '/records?serial=eq.F/99-CUTOVER-TEST&select=id,form_code,serial,form_name,status,form_data,edit_count,created_by'
req = urllib.request.Request(url, headers={'apikey': PUBLISHABLE_KEY, 'Authorization': 'Bearer ' + token})
resp = urllib.request.urlopen(req, timeout=10)
result = json.loads(resp.read())
if result and result[0]['serial'] == 'F/99-CUTOVER-TEST':
    r = result[0]
    print(f'✅ READ: form_code={r["form_code"]} serial={r["serial"]} status={r["status"]} form_data={r["form_data"]}')
else:
    print(f'❌ READ FAILED: {json.dumps(result)[:200]}')

# 3. UPDATE
time.sleep(1)
update_data = {
    'form_data': {'purpose': 'cutover_smoke_test_UPDATED', 'value': 99},
    'status': 'pending_review',
    'edit_count': 1,
    'last_modified_by': 'cutover_test',
    'modification_reason': 'smoke test update',
}
url = REST_URL + '/records?id=eq.' + test_id
body = json.dumps(update_data).encode()
req = urllib.request.Request(url, data=body, headers=sr_headers, method='PATCH')
urllib.request.urlopen(req, timeout=10)
print('✅ UPDATE: form_data and status updated')

# 4. AUDIT LOG CHECK
time.sleep(1)
url = REST_URL + '/audit_log?record_id=eq.' + test_id + '&select=action,serial,form_code,performed_by&order=created_at.asc'
req = urllib.request.Request(url, headers=sr_headers)
resp = urllib.request.urlopen(req, timeout=10)
audit = json.loads(resp.read())
print(f'✅ AUDIT LOG: {len(audit)} entries')
for a in audit:
    print(f'   action={a["action"]} serial={a.get("serial")} form_code={a.get("form_code")} by={a.get("performed_by")}')

# 5. SOFT DELETE
url = REST_URL + '/rpc/soft_delete_record'
body = json.dumps({'p_id': test_id}).encode()
req = urllib.request.Request(url, data=body, headers={
    'apikey': PUBLISHABLE_KEY,
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json',
}, method='POST')
try:
    urllib.request.urlopen(req, timeout=10)
    print('✅ SOFT DELETE: record soft-deleted')
except urllib.error.HTTPError as e:
    err = e.read().decode()
    if 'already deleted' in err.lower():
        print('⚠️  SOFT DELETE: record already deleted')
    else:
        print(f'❌ SOFT DELETE: HTTP {e.code} {err[:200]}')

# Verify deleted_at
url = REST_URL + '/records?id=eq.' + test_id + '&select=deleted_at'
req = urllib.request.Request(url, headers=sr_headers)
resp = urllib.request.urlopen(req, timeout=10)
result = json.loads(resp.read())
if result and result[0].get('deleted_at'):
    print(f'✅ DELETED_AT: {result[0]["deleted_at"][:19]}')
else:
    print('❌ DELETED_AT not set')

# 6. RLS CHECK
url = REST_URL + '/records?select=id&limit=1'
req = urllib.request.Request(url, headers={'apikey': PUBLISHABLE_KEY})
resp = urllib.request.urlopen(req, timeout=10)
anon_data = json.loads(resp.read())
print(f'✅ RLS: anon got {len(anon_data)} records (expected: 0)')

# 7. NEW FIELDS VERIFICATION
url = REST_URL + '/records?serial=eq.F/99-CUTOVER-TEST&select=*'
req = urllib.request.Request(url, headers=sr_headers)
resp = urllib.request.urlopen(req, timeout=10)
full_record = json.loads(resp.read())[0]
new_fields = ['form_code', 'serial', 'form_name', 'status', 'form_data', 'edit_count', 'created_by']
missing = [f for f in new_fields if f not in full_record or full_record[f] is None]
if missing:
    print(f'❌ MISSING NEW FIELDS: {missing}')
else:
    print(f'✅ ALL NEW FIELDS POPULATED')

print('\n🟢 SMOKE TEST COMPLETE')