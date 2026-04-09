import sqlite3

def bug_check():
    conn = sqlite3.connect('work_reports.db')
    cursor = conn.cursor()
    cursor.execute("SELECT name, category FROM clients WHERE category = 'Political'")
    rows = cursor.fetchall()
    print(f"Political Clients ({len(rows)}):")
    for r in rows:
        print(r)
    
    cursor.execute("SELECT DISTINCT category FROM clients")
    cats = cursor.fetchall()
    print(f"Categories in DB: {cats}")
    conn.close()

if __name__ == "__main__":
    bug_check()
