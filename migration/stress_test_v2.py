#!/usr/bin/env python3
"""
QMS FORGE — STRESS & EDGE CASE TESTING (v2 — with proper result verification)
Fixes: check returned rows, not just HTTP status (PostgREST returns 204/200 for 0 rows affected)
"""
import json, urllib.request, urllib.error, time, sys

PUBLISHABLE_KEY = 'sb_publishable_-9nZ5bjWkfV8_AFSSA3Qdg_LAMr8NxJ'
SR = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlvdXVpa3Rlcm9peG5zcWF6em5jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDg2ODc2MCwiZXhwIjoyMDkwNDQ0NzYwfQ.JuLDMQIh97T9wwuZEybXfVXn2e145tME81a1eo8khP8'
URL = 'https://iouuikteroixnsqazznc.supabase.co'
REST = URL + '/rest/v1'

results = []

def report(name, passed, detail=''):
    icon = '✅' if passed else '❌'
    results.append((name, passed, detail))
    print(f'  {icon} {name}' + (f' — {detail}' if detail else ''))

def auth(email, pw):
    d = json.dumps({'email': email, 'password': pw}).encode()
    req = urllib.request.Request(f'{URL}/auth/v1/token?grant_type=password', data=d, headers={'apikey': PUBLISHABLE_KEY, 'Content-Type': 'application/json'}, method='POST')
    resp = urllib.request.urlopen(req, timeout=10)
    return json.loads(resp.read())['access_token']

def api(token, path, method='GET', body=None, prefer_rep=False):
    actual_token = SR if token == 'SR' else token
    key = PUBLISHABLE_KEY
    url = REST + path
    headers = {'apikey': key, 'Authorization': f'Bearer {actual_token}'}
    data = None
    if body is not None:
        headers['Content-Type'] = 'application/json'
        data = json.dumps(body).encode()
    if prefer_rep:
        headers['Prefer'] = 'return=representation'
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        resp = urllib.request.urlopen(req, timeout=15)
        raw = resp.read().decode()
        if not raw:
            return [], None, resp.status
        parsed = json.loads(raw)
        return parsed, None, resp.status
    except urllib.error.HTTPError as e:
        err_body = e.read().decode()[:300]
        return None, f'HTTP {e.code}: {err_body}', e.code

admin_token = auth('ibnkhaled16@gmail.com', 'QMS2026!admin')
manager_token = auth('akh.dev185@gmail.com', 'QMS2026!dev')

print('=' * 70)
print('QMS FORGE — STRESS & EDGE CASE TESTING (v2)')
print('=' * 70)

# ═══════════════════════════════════════════════════════════════════════════
# 1. RLS ENFORCEMENT
# ═══════════════════════════════════════════════════════════════════════════
print('\n1️⃣  RLS ENFORCEMENT')

# 1a. Anon READ (should return 0 rows)
data, err, status = api(PUBLISHABLE_KEY, '/records?select=id&limit=1')
report('Anon READ records', len(data) == 0, f'{len(data)} rows (RLS blocks anon)')

# 1b. Anon INSERT
_, err, _ = api(PUBLISHABLE_KEY, '/records', 'POST', {'form_code': 'F/99', 'serial': 'ANON-INSERT', 'form_name': 'Hack', 'status': 'draft', 'form_data': {}})
report('Anon INSERT blocked', err is not None, 'Blocked' if err else 'LEAKED!')

# 1c. Anon UPDATE (with Prefer: return=representation to check rows affected)
data, err, status = api(PUBLISHABLE_KEY, '/records?serial=eq.F/11-001', 'PATCH', {'status': 'hacked'}, prefer_rep=True)
is_blocked = (data is not None and len(data) == 0) or err is not None
detail = f'{len(data)} rows affected (0=blocked)' if data else (f'Error: {err[:60]}' if err else 'Unknown')
report('Anon UPDATE blocked', is_blocked, detail)

# 1d. Anon DELETE (hard)
data, err, status = api(PUBLISHABLE_KEY, '/records?serial=eq.F/11-001', 'DELETE', prefer_rep=True)
is_blocked = (data is not None and len(data) == 0) or err is not None
detail = f'{len(data)} rows affected (0=blocked)' if data else (f'Error: {err[:60]}' if err else 'Unknown')
report('Anon DELETE blocked', is_blocked, detail)

# 1e. Authenticated hard DELETE (should be blocked by RLS)
data, err, status = api(admin_token, '/records?serial=eq.F/11-001', 'DELETE', prefer_rep=True)
is_blocked = (data is not None and len(data) == 0) or err is not None
detail = f'{len(data)} rows affected (0=blocked)' if data else (f'Error: {err[:60]}' if err else 'Unknown')
report('Admin hard DELETE blocked', is_blocked, detail)

# 1f. Authenticated INSERT with role check (admin)
ts1 = int(time.time() * 1000)
adm_serial = f'F/99-ADM-{ts1}'
data, err, _ = api(admin_token, '/records', 'POST', {'form_code': 'F/99', 'serial': adm_serial, 'form_name': 'RLS Admin', 'status': 'draft', 'form_data': {}}, prefer_rep=True)
report('Admin INSERT allowed', data is not None and len(data) > 0, f'serial={data[0]["serial"]}' if data and len(data) > 0 else (err[:80] if err else 'No data returned'))

# 1g. Authenticated INSERT with role check (manager)
ts2 = int(time.time() * 1000) + 1
mgr_serial = f'F/99-MGR-{ts2}'
data, err, _ = api(manager_token, '/records', 'POST', {'form_code': 'F/99', 'serial': mgr_serial, 'form_name': 'RLS Manager', 'status': 'draft', 'form_data': {}}, prefer_rep=True)
report('Manager INSERT allowed', data is not None and len(data) > 0, f'serial={data[0]["serial"]}' if data and len(data) > 0 else (err[:80] if err else 'No data returned'))

# 1h. Authenticated UPDATE (admin)
data, err, _ = api(admin_token, f'/records?serial=eq.{adm_serial}', 'PATCH', {'form_data': {'tested': True}}, prefer_rep=True)
report('Admin UPDATE allowed', data is not None and len(data) >= 1, f'{len(data)} rows affected')

# ═══════════════════════════════════════════════════════════════════════════
# 2. AUDIT LOG IMMUTABILITY
# ═══════════════════════════════════════════════════════════════════════════
print('\n2️⃣  AUDIT LOG IMMUTABILITY')

# 2a. Authenticated UPDATE on audit_log (should affect 0 rows)
data, err, _ = api(admin_token, '/audit_log?id=eq.73af13f2-431c-448a-8bb1-2c01d7fab33e', 'PATCH', {'performed_by': 'hacked'}, prefer_rep=True)
is_blocked = (data is not None and len(data) == 0) or err is not None
detail = f'{len(data)} rows affected (0=immutable)' if data else (f'Error: {err[:60]}' if err else 'Unknown')
report('Audit log UPDATE blocked', is_blocked, detail)

# 2b. Authenticated INSERT on audit_log
_, err, _ = api(admin_token, '/audit_log', 'POST', {'record_id': '00000000-0000-4000-a000-000000000000', 'action': 'hack', 'changed_fields': [], 'previous_values': {}, 'new_values': {}, 'performed_by': 'hacker'})
report('Audit log INSERT blocked', err is not None, 'Blocked' if err else 'LEAKED!')

# 2c. Authenticated DELETE on audit_log
_, err, _ = api(admin_token, '/audit_log?limit=1', 'DELETE')
report('Audit log DELETE blocked', err is not None, f'Blocked (HTTP error)' if err else 'Returned 204 (check: 0 rows = blocked, but no error)')

# ═══════════════════════════════════════════════════════════════════════════
# 3. INVALID PAYLOADS (DB Constraints)
# ═══════════════════════════════════════════════════════════════════════════
print('\n3️⃣  INVALID PAYLOADS (DB constraints)')

# 3a. Missing required fields
_, err, _ = api(admin_token, '/records', 'POST', {'form_code': 'F/99'})
report('Missing required fields (400)', err is not None, err[:80] if err else 'ACCEPTED')

# 3b. Invalid status enum
_, err, _ = api(admin_token, '/records', 'POST', {'form_code': 'F/99', 'serial': 'F/99-INVC', 'form_name': 'Bad', 'status': 'HACKED', 'form_data': {}})
report('Invalid status enum (400)', err is not None, err[:80] if err else 'ACCEPTED')

# 3c. Duplicate serial
_, err, _ = api(admin_token, '/records', 'POST', {'form_code': 'F/11', 'serial': 'F/11-001', 'form_name': 'Dup', 'status': 'draft', 'form_data': {}})
report('Duplicate serial (409)', err is not None, err[:80] if err else 'ACCEPTED')

# 3d. NULL form_data
_, err, _ = api(admin_token, '/records', 'POST', {'form_code': 'F/99', 'serial': 'F/99-NFD', 'form_name': 'Null', 'status': 'draft', 'form_data': None})
report('NULL form_data (400)', err is not None, err[:80] if err else 'ACCEPTED')

# 3e. Negative edit_count
_, err, _ = api(admin_token, '/records', 'POST', {'form_code': 'F/99', 'serial': 'F/99-NEG', 'form_name': 'Neg', 'status': 'draft', 'form_data': {}, 'edit_count': -1})
report('Negative edit_count (400)', err is not None, err[:80] if err else 'ACCEPTED')

# 3f. Section out of range
_, err, _ = api(admin_token, '/records', 'POST', {'form_code': 'F/99', 'serial': 'F/99-SEC', 'form_name': 'BadSec', 'status': 'draft', 'form_data': {}, 'section': 99})
report('Section out of range (400)', err is not None, err[:80] if err else 'ACCEPTED')

# ═══════════════════════════════════════════════════════════════════════════
# 4. NOTIFICATIONS ACCESS CONTROL
# ═══════════════════════════════════════════════════════════════════════════
print('\n4️⃣  NOTIFICATIONS ACCESS CONTROL')

# 4a. Anon READ notifications (should return 0)
data, err, _ = api(PUBLISHABLE_KEY, '/notifications?select=id&limit=1')
report('Anon READ notifications blocked', len(data) == 0 if data else True, f'{len(data) if data else "error"} rows (0=blocked)')

# 4b. Authenticated UPDATE someone else's notification
data, err, _ = api(manager_token, '/notifications?user_id=eq.c634003e-7507-4315-8f73-bc2bb96c4673', 'PATCH', {'read': True}, prefer_rep=True)
is_blocked = (data is not None and len(data) == 0) or err is not None
detail = f'{len(data)} rows (0=blocked)' if data else (f'Error: {err[:60]}' if err else 'Unknown')
report('Other user notification UPDATE blocked', is_blocked, detail)

# ═══════════════════════════════════════════════════════════════════════════
# 5. HIGH-FREQUENCY WRITES (Burst)
# ═══════════════════════════════════════════════════════════════════════════
print('\n5️⃣  HIGH-FREQUENCY WRITES')

start = time.time()
success_count = 0
fail_count = 0
burst_ts = int(time.time() * 1000)
for i in range(20):
    rec = {'form_code': 'F/99', 'serial': f'F/99-BURST-{burst_ts}-{i:03d}', 'form_name': f'Burst {i}', 'status': 'draft', 'form_data': {'seq': i}}
    data, err, status_code = api(admin_token, '/records', 'POST', rec, prefer_rep=True)
    if (data and len(data) > 0) or (err is None and status_code in (200, 201)):
        success_count += 1
    else:
        fail_count += 1

duration = round(time.time() - start, 2)
report(f'20 burst creates in {duration}s', success_count == 20, f'{success_count}/20 succeeded')

# ═══════════════════════════════════════════════════════════════════════════
# CLEANUP
# ═══════════════════════════════════════════════════════════════════════════
print('\n🧹 CLEANUP')
cleanup_serials = [f'F/99-BURST-{burst_ts}-{i:03d}' for i in range(20)]
cleanup_serials += [adm_serial, mgr_serial]
for s in cleanup_serials:
    api('SR', f'/records?serial=eq.{s}', 'DELETE')

# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY
# ═══════════════════════════════════════════════════════════════════════════
passed = sum(1 for _, p, _ in results if p)
failed = sum(1 for _, p, _ in results if not p)
print(f'\n{"=" * 70}')
print(f'RESULTS: {passed} PASS / {failed} FAIL')
print(f'{"=" * 70}')

for name, p, detail in results:
    icon = '✅' if p else '❌'
    print(f'  {icon} {name}' + (f' — {detail}' if detail else ''))

critical = [(n, d) for n, p, d in results if not p]
if critical:
    print(f'\n🔴 CRITICAL FAILURES:')
    for name, detail in critical:
        print(f'  ⚠️  {name}: {detail}')

sys.exit(1 if failed > 0 else 0)