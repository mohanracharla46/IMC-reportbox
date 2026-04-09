import sqlite3
import json

def test_api_logic():
    conn = sqlite3.connect('work_reports.db')
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    clients = cursor.execute("SELECT name, category FROM clients ORDER BY name").fetchall()
    conn.close()
    
    results = {'Political': [], 'Corporate': []}
    for c in clients:
        cat = c['category'] if c['category'] in ['Political', 'Corporate'] else 'Corporate'
        results[cat].append(c['name'])
    
    results['Political'].append('Others')
    results['Corporate'].append('Other')
    print(json.dumps(results, indent=2))

if __name__ == "__main__":
    test_api_logic()
