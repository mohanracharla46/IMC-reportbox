import sqlite3
import os

def migrate_client_categories():
    db_file = 'work_reports.db'
    if not os.path.exists(db_file):
        print(f"Database {db_file} not found.")
        return

    try:
        conn = sqlite3.connect(db_file)
        cursor = conn.cursor()
        
        political_clients = ['RMR', 'RSR', 'SG', 'JKR', 'Degala']
        corporate_clients = ['IMC', 'Cornext', 'AIC', 'Yuvatha', 'Raksha']
        
        print("Categorizing Political clients...")
        for name in political_clients:
            cursor.execute("UPDATE clients SET category = 'Political' WHERE name = ?", (name,))
        
        print("Categorizing Corporate clients...")
        for name in corporate_clients:
            cursor.execute("UPDATE clients SET category = 'Corporate' WHERE name = ?", (name,))
            
        conn.commit()
        print("Migration completed successfully.")
        
        # Verify
        cursor.execute("SELECT name, category FROM clients")
        rows = cursor.fetchall()
        for row in rows:
            print(f"Client: {row[0]}, Category: {row[1]}")
            
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    migrate_client_categories()
