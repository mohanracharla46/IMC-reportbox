# Database Schema Documentation

## Overview

The Work Report System uses SQLite as its database engine. The database consists of two main tables with a foreign key relationship.

## Entity Relationship Diagram

```
┌─────────────────────────────────┐
│          USERS                  │
├─────────────────────────────────┤
│ id (PK)          INTEGER        │
│ name             TEXT            │
│ email (UNIQUE)   TEXT            │
│ password         TEXT            │
│ role             TEXT            │
│                  ('employee' or │
│                   'admin')      │
└─────────────────────────────────┘
          │
          │ 1
          │
          │ has many
          │
          │ N
          ▼
┌─────────────────────────────────┐
│       SUBMISSIONS               │
├─────────────────────────────────┤
│ id (PK)          INTEGER        │
│ user_id (FK)     INTEGER        │
│ work_text        TEXT            │
│ file_path        TEXT (nullable)│
│ date             DATE            │
│ created_at       TIMESTAMP       │
│                                  │
│ UNIQUE(user_id, date)           │
└─────────────────────────────────┘
```

## Table Specifications

### Users Table

**Purpose**: Stores user accounts with authentication credentials and role information.

| Column   | Type    | Constraints                           | Description                    |
|----------|---------|---------------------------------------|--------------------------------|
| id       | INTEGER | PRIMARY KEY, AUTOINCREMENT            | Unique user identifier         |
| name     | TEXT    | NOT NULL                              | User's full name               |
| email    | TEXT    | NOT NULL, UNIQUE                      | User's email (login username)  |
| password | TEXT    | NOT NULL                              | Hashed password                |
| role     | TEXT    | NOT NULL, CHECK(role IN (...))        | 'employee' or 'admin'          |

**Indexes**:
- Primary Key Index on `id`
- Unique Index on `email`

**Sample Data**:
```sql
INSERT INTO users (name, email, password, role) VALUES
('Prashanth', 'prashanth@iramediaconcepts.com', 'hashed_password', 'admin');
```

### Submissions Table

**Purpose**: Stores daily work reports submitted by employees.

| Column     | Type      | Constraints                    | Description                        |
|------------|-----------|--------------------------------|------------------------------------|
| id         | INTEGER   | PRIMARY KEY, AUTOINCREMENT     | Unique submission identifier       |
| user_id    | INTEGER   | NOT NULL, FOREIGN KEY          | Reference to users table           |
| work_text  | TEXT      | NOT NULL                       | Description of work performed      |
| file_path  | TEXT      | NULL                           | Path to uploaded file (optional)   |
| date       | DATE      | NOT NULL                       | Date of work (YYYY-MM-DD)          |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP      | When submission was created        |

**Constraints**:
- Foreign Key: `user_id` → `users.id` (ON DELETE CASCADE)
- Unique Constraint: `(user_id, date)` - Prevents duplicate submissions per day

**Indexes**:
- Primary Key Index on `id`
- Index on `user_id` (foreign key)
- Unique Index on `(user_id, date)`
- Index on `date` (for filtering)

**Sample Data**:
```sql
INSERT INTO submissions (user_id, work_text, file_path, date) VALUES
(2, 'Completed API integration for user authentication', 'uploads/2_file.pdf', '2026-02-13'),
(3, 'Fixed bug in reporting dashboard, updated documentation', NULL, '2026-02-13');
```

## Relationships

### One-to-Many: Users → Submissions

- **Cardinality**: One user can have many submissions (0 to N)
- **Foreign Key**: `submissions.user_id` → `users.id`
- **Cascade**: ON DELETE CASCADE (deleting a user deletes all their submissions)

## Business Rules

1. **Unique Daily Submission**: A user can only submit one report per day
   - Enforced by: `UNIQUE(user_id, date)` constraint
   
2. **Role Validation**: User role must be either 'employee' or 'admin'
   - Enforced by: `CHECK(role IN ('employee', 'admin'))` constraint

3. **Cascade Deletion**: Deleting a user automatically deletes all their submissions
   - Enforced by: `ON DELETE CASCADE` foreign key constraint

4. **Required Fields**: 
   - Users: All fields are required
   - Submissions: `id`, `user_id`, `work_text`, `date` are required
   - Submissions: `file_path` is optional

## Common Queries

### Get all submissions for a specific user
```sql
SELECT * FROM submissions 
WHERE user_id = ? 
ORDER BY date DESC;
```

### Get today's submissions with user details
```sql
SELECT s.*, u.name, u.email 
FROM submissions s
JOIN users u ON s.user_id = u.id
WHERE s.date = date('now')
ORDER BY s.created_at DESC;
```

### Check if user submitted today
```sql
SELECT COUNT(*) as count 
FROM submissions 
WHERE user_id = ? AND date = date('now');
```

### Get all employees (non-admin users)
```sql
SELECT * FROM users 
WHERE role = 'employee' 
ORDER BY name;
```

### Get submission statistics
```sql
SELECT 
    COUNT(*) as total_submissions,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(DISTINCT date) as unique_dates
FROM submissions;
```

## Database Initialization

The database is automatically initialized when the application starts if it doesn't exist:

```python
def init_db():
    conn = sqlite3.connect('work_reports.db')
    cursor = conn.cursor()
    
    # Create tables with constraints
    cursor.execute('''CREATE TABLE IF NOT EXISTS users (...)''')
    cursor.execute('''CREATE TABLE IF NOT EXISTS submissions (...)''')
    
    # Create default admin and sample employees
    # ...
    
    conn.commit()
    conn.close()
```

## Backup & Recovery

### Backup Database
```bash
# Create a backup
cp work_reports.db work_reports_backup_$(date +%Y%m%d).db

# Or use SQLite backup command
sqlite3 work_reports.db ".backup work_reports_backup.db"
```

### Restore Database
```bash
# Restore from backup
cp work_reports_backup.db work_reports.db
```

### Export to SQL
```bash
# Export entire database to SQL file
sqlite3 work_reports.db .dump > work_reports.sql

# Import from SQL file
sqlite3 new_database.db < work_reports.sql
```

## Performance Considerations

1. **Indexes**: The database uses indexes on frequently queried columns:
   - Primary keys (automatic)
   - Foreign keys
   - Unique constraints
   - Date column for filtering

2. **Query Optimization**:
   - Use parameterized queries (prevents SQL injection, allows query caching)
   - Use appropriate JOINs instead of multiple queries
   - Limit result sets when displaying paginated data

3. **Connection Management**:
   - Create new connections for each request
   - Close connections after use
   - Use `row_factory = sqlite3.Row` for dictionary-like row access

## Security Considerations

1. **Password Storage**: Never store plain-text passwords
   - Use Werkzeug's `generate_password_hash()` and `check_password_hash()`

2. **SQL Injection Prevention**: Always use parameterized queries
   ```python
   # GOOD
   cursor.execute('SELECT * FROM users WHERE email = ?', (email,))
   
   # BAD - Never do this!
   cursor.execute(f'SELECT * FROM users WHERE email = "{email}"')
   ```

3. **File Paths**: Store relative paths, not absolute paths
   - Allows for application portability
   - Prevents path disclosure vulnerabilities

## Migration Guide

If you need to modify the schema in production:

1. **Backup the database** first
2. **Write migration script** with ALTER TABLE statements
3. **Test on a copy** of production data
4. **Apply migration** during maintenance window
5. **Verify data integrity** after migration

Example migration:
```sql
-- Add new column to users table
ALTER TABLE users ADD COLUMN phone TEXT;

-- Update existing records with default value
UPDATE users SET phone = 'N/A' WHERE phone IS NULL;
```

## Database File Location

- **Development**: `work_reports.db` in the project root
- **Production**: Should be stored outside the web root for security
  - Recommended: `/var/db/work_reports/work_reports.db`
  - Or use environment variable for the path

## Monitoring & Maintenance

### Check Database Size
```bash
ls -lh work_reports.db
```

### Vacuum Database (Optimize)
```sql
VACUUM;
```

### Check Integrity
```sql
PRAGMA integrity_check;
```

### View Database Info
```sql
PRAGMA database_list;
PRAGMA table_info(users);
PRAGMA table_info(submissions);
```
