import os
import re
import sys
from jinja2 import Environment, FileSystemLoader

# Step 1: Validate Python Syntax
print("--- 1. Validating Python Syntax ---")
try:
    import py_compile
    py_compile.compile('app.py', doraise=True)
    print("  [PASS] app.py syntax is valid.")
except Exception as e:
    print(f"  [FAIL] app.py syntax error: {e}")
    sys.exit(1)

# Step 2: Import Flask App
print("\n--- 2. Importing Flask App ---")
try:
    from app import app
    print("  [PASS] Flask app imported successfully.")
except Exception as e:
    print(f"  [FAIL] Failed to import Flask app: {e}")
    sys.exit(1)

# Step 3: Compile All Jinja Templates
print("\n--- 3. Compiling All Jinja Templates ---")
template_dir = os.path.join(os.path.dirname(__file__), 'templates')
env = Environment(loader=FileSystemLoader(template_dir))

# Add app custom Jinja filters if any
for filter_name, filter_func in app.jinja_env.filters.items():
    env.filters[filter_name] = filter_func

html_files = [f for f in os.listdir(template_dir) if f.endswith('.html')]
compile_failures = 0
for html_file in sorted(html_files):
    try:
        env.get_template(html_file)
        print(f"  [PASS] {html_file}")
    except Exception as e:
        print(f"  [FAIL] {html_file}: {e}")
        compile_failures += 1

if compile_failures > 0:
    print(f"\nTemplate compilation failed for {compile_failures} template(s).")
    sys.exit(1)
else:
    print(f"  [OK] All {len(html_files)} templates compiled cleanly.")

# Step 4: Audit url_for Endpoints
print("\n--- 4. Auditing url_for Endpoints in Templates ---")
registered_endpoints = set(app.view_functions.keys())
url_for_pattern = re.compile(r"url_for\(\s*['\"]([a-zA-Z0-9_.]+)['\"]")

missing_endpoints = set()
total_url_for_calls = 0

for root, _, files in os.walk(template_dir):
    for f in files:
        if f.endswith('.html'):
            filepath = os.path.join(root, f)
            with open(filepath, 'r', encoding='utf-8') as tf:
                content = tf.read()
                matches = url_for_pattern.findall(content)
                for endpoint in matches:
                    total_url_for_calls += 1
                    if endpoint != 'static' and endpoint not in registered_endpoints:
                        missing_endpoints.add((f, endpoint))

if missing_endpoints:
    print("  [FAIL] Found references to unregistered endpoints:")
    for tpl, ep in missing_endpoints:
        print(f"    - In {tpl}: endpoint '{ep}' does NOT exist in app.py")
    sys.exit(1)
else:
    print(f"  [PASS] All {total_url_for_calls} url_for calls across all templates map to valid Flask endpoints.")

# Step 5: Print app.url_map
print("\n--- 5. Registered Flask Routes (app.url_map) ---")
print(app.url_map)

# Step 6: Test Important Routes using Flask Test Client
print("\n--- 6. Testing Key Routes ---")
client = app.test_client()

# Unauthenticated checks
r = client.get('/', follow_redirects=False)
assert r.status_code == 302 and '/login' in r.headers['Location'], f"Unauth / failed: {r.status_code}"
print("  [PASS] GET / (unauthenticated) -> 302 /login")

r = client.get('/login')
assert r.status_code == 200, f"GET /login failed: {r.status_code}"
print("  [PASS] GET /login -> 200 OK")

r = client.get('/dashboard', follow_redirects=False)
assert r.status_code == 302 and '/login' in r.headers['Location'], f"Unauth /dashboard failed: {r.status_code}"
print("  [PASS] GET /dashboard (unauthenticated) -> 302 /login")

# Admin role checks
with client.session_transaction() as sess:
    sess['user_id'] = 1
    sess['user_name'] = 'Admin'
    sess['role'] = 'admin'

r = client.get('/dashboard', follow_redirects=False)
assert r.status_code == 302 and '/admin/dashboard' in r.headers['Location'], f"Admin /dashboard failed: {r.status_code}"
print("  [PASS] GET /dashboard (admin) -> 302 /admin/dashboard")

r = client.get('/admin/dashboard')
assert r.status_code == 200, f"GET /admin/dashboard failed: {r.status_code}"
print("  [PASS] GET /admin/dashboard -> 200 OK")

# Employee role checks
with client.session_transaction() as sess:
    sess['user_id'] = 2
    sess['user_name'] = 'Employee'
    sess['role'] = 'employee'
    sess['employment_type'] = 'inhouse'

r = client.get('/dashboard', follow_redirects=False)
assert r.status_code == 302 and '/employee/dashboard' in r.headers['Location'], f"Employee /dashboard failed: {r.status_code}"
print("  [PASS] GET /dashboard (employee) -> 302 /employee/dashboard")

r = client.get('/employee/dashboard')
assert r.status_code == 200, f"GET /employee/dashboard failed: {r.status_code}"
print("  [PASS] GET /employee/dashboard -> 200 OK")

print("\n==========================================")
print("  ALL VALIDATION CHECKS PASSED PERFECTLY!")
print("==========================================\n")
