# Work Report Management System

A professional, full-stack web application built with Flask for managing daily employee work reports. Features a modern, responsive UI with separate dashboards for employees and administrators.

![Python](https://img.shields.io/badge/Python-3.8+-blue.svg)
![Flask](https://img.shields.io/badge/Flask-3.0.0-green.svg)
![License](https://img.shields.io/badge/License-MIT-yellow.svg)

## 🌟 Features

### Authentication
- ✅ Secure session-based authentication
- ✅ Password hashing with Werkzeug
- ✅ Role-based access control (Employee/Admin)
- ✅ Automatic session management

### Employee Module
- 📝 Submit daily work reports with text descriptions
- 📎 Optional file attachments (PDF, DOC, DOCX, XLS, XLSX, Images)
- 📅 Automatic date capture
- 🚫 Prevent duplicate submissions for the same day
- 📊 View submission history
- ✅ Real-time submission status indicator

### Admin Module
- 👥 Comprehensive employee management (Add, Edit, Delete)
- 📋 View all employee submissions
- 🔍 Advanced filtering by employee name and date
- 📥 Download attached files
- 📊 Dashboard statistics (total employees, submissions, etc.)
- 🗂️ Organized tab-based interface

### Database
- 🗄️ SQLite database for easy deployment
- 📊 Two main tables:
  - **users**: Stores user credentials and roles
  - **submissions**: Stores work reports with foreign key relationships
- 🔗 Cascade delete for data integrity

### UI/UX
- 🎨 Modern, professional design with gradient accents
- 📱 Fully responsive (mobile, tablet, desktop)
- ⚡ Smooth animations and transitions
- 🎯 Intuitive navigation
- 💬 Flash messages for user feedback
- 🌈 Distinctive color scheme avoiding generic AI aesthetics
- ✨ Interactive elements with hover effects

## 📋 Prerequisites

- Python 3.8 or higher
- pip (Python package installer)
- Web browser (Chrome, Firefox, Safari, or Edge)

## 🚀 Installation & Setup

### Step 1: Clone or Download the Project

```bash
# Navigate to your desired directory
cd /path/to/your/directory

# The project structure should look like this:
work_report_system/
├── app.py
├── requirements.txt
├── templates/
│   ├── base.html
│   ├── login.html
│   ├── employee_dashboard.html
│   └── admin_dashboard.html
├── static/
│   ├── style.css
│   └── script.js
└── uploads/
```

### Step 2: Create a Virtual Environment (Recommended)

```bash
# Navigate to project directory
cd work_report_system

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate

# On macOS/Linux:
source venv/bin/activate
```

### Step 3: Install Dependencies

```bash
pip install -r requirements.txt
```

### Step 4: Run the Application

```bash
python app.py
```

The application will start and display:
```
==============================================================
Work Report Management System
==============================================================

Default Login Credentials:
--------------------------------------------------------------
Admin:
  Email: admin@company.com
  Password: admin123

Employees:
  john@company.com / password123
  jane@company.com / password123
  bob@company.com / password123
==============================================================

 * Running on http://0.0.0.0:5000
```

### Step 5: Access the Application

Open your web browser and navigate to:
```
http://localhost:5000
```

## 🔐 Default Login Credentials

### Admin Account
- **Email**: admin@company.com
- **Password**: admin123

### Employee Accounts
- **John Doe**: john@company.com / password123
- **Jane Smith**: jane@company.com / password123
- **Bob Johnson**: bob@company.com / password123

> ⚠️ **Security Note**: Change these default passwords in production!

## 📖 User Guide

### For Employees

1. **Login**: Use your email and password to log in
2. **Check Status**: See if you've submitted today's report on the dashboard
3. **Submit Report**:
   - Enter a description of your work
   - Optionally attach a file (max 16MB)
   - Click "Submit Report"
4. **View History**: Scroll down to see your recent submissions
5. **Download Files**: Click the download link to retrieve your attachments

### For Administrators

1. **Login**: Use admin credentials
2. **View Dashboard Statistics**:
   - Total employees
   - Today's submissions
   - Total reports
3. **Manage Submissions**:
   - Click "Work Submissions" tab
   - Filter by employee name or date
   - Download attached files
   - View all submission details
4. **Manage Employees**:
   - Click "Manage Employees" tab
   - Add new employees with the "Add Employee" button
   - Edit existing employees
   - Delete employees (removes all their submissions)

## 🗂️ Project Structure

```
work_report_system/
│
├── app.py                          # Main Flask application
├── requirements.txt                # Python dependencies
├── work_reports.db                 # SQLite database (created automatically)
│
├── templates/                      # HTML templates
│   ├── base.html                  # Base template with navigation
│   ├── login.html                 # Login page
│   ├── employee_dashboard.html    # Employee interface
│   └── admin_dashboard.html       # Admin interface
│
├── static/                         # Static assets
│   ├── style.css                  # Professional CSS styling
│   └── script.js                  # JavaScript for interactivity
│
└── uploads/                        # Uploaded files storage
```

## 🗄️ Database Schema

### Users Table
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('employee', 'admin'))
);
```

### Submissions Table
```sql
CREATE TABLE submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    work_text TEXT NOT NULL,
    file_path TEXT,
    date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, date)
);
```

## 🔒 Security Features

1. **Password Hashing**: All passwords are hashed using Werkzeug's security functions
2. **Session Management**: Secure server-side sessions
3. **Role-Based Access Control**: Decorators enforce admin-only routes
4. **File Upload Validation**: 
   - Allowed file types only
   - Size limit (16MB)
   - Secure filename handling
5. **SQL Injection Prevention**: Parameterized queries
6. **CSRF Protection**: Built into Flask forms

## 🎨 Design Philosophy

This application features a **distinctive, professional design** that avoids generic AI aesthetics:

- **Typography**: Epilogue font family for clean, modern readability
- **Color Palette**: Deep blue primary colors with strategic gradient accents
- **Layout**: Asymmetric, card-based design with generous whitespace
- **Animations**: Smooth transitions and micro-interactions
- **Accessibility**: ARIA labels, keyboard navigation, focus states

## 🛠️ Customization

### Change Secret Key
Edit `app.py`:
```python
app.secret_key = 'your-new-secret-key-here'
```

### Modify File Upload Limits
Edit `app.py`:
```python
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # Change size
ALLOWED_EXTENSIONS = {'txt', 'pdf', 'doc', 'docx'}   # Modify extensions
```

### Update Branding
Edit `templates/base.html`:
```html
<span class="brand-text">Your Company Name</span>
```

### Change Color Scheme
Edit `static/style.css` CSS variables:
```css
:root {
    --primary-600: #your-color;
    --accent-green: #your-color;
    /* etc. */
}
```

## 🐛 Troubleshooting

### Port Already in Use
If port 5000 is busy, change it in `app.py`:
```python
app.run(debug=True, host='0.0.0.0', port=8000)  # Use different port
```

### Database Issues
Delete `work_reports.db` and restart the app to recreate with fresh data.

### File Upload Not Working
Check that the `uploads/` directory exists and has write permissions:
```bash
mkdir -p uploads
chmod 755 uploads
```

## 📝 Development

### Enable Debug Mode
Debug mode is enabled by default during development:
```python
app.run(debug=True)
```

### View Database
Use any SQLite browser to inspect `work_reports.db`:
```bash
sqlite3 work_reports.db
.tables
SELECT * FROM users;
SELECT * FROM submissions;
```

## 🚀 Production Deployment

For production deployment:

1. **Change the secret key** to a strong random value
2. **Disable debug mode**: `app.run(debug=False)`
3. **Use a production WSGI server** (e.g., Gunicorn, uWSGI)
4. **Set up HTTPS** with SSL certificates
5. **Use environment variables** for sensitive configuration
6. **Consider PostgreSQL** instead of SQLite for better concurrency
7. **Set up proper logging**
8. **Implement rate limiting**
9. **Add CSRF tokens** to all forms
10. **Set up automated backups** for the database

### Example Production Setup with Gunicorn
```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:8000 app:app
```

## 📄 License

This project is open source and available under the MIT License.

## 🤝 Support

For issues, questions, or contributions, please contact the development team.

## 📚 Additional Resources

- [Flask Documentation](https://flask.palletsprojects.com/)
- [SQLite Documentation](https://www.sqlite.org/docs.html)
- [Werkzeug Security](https://werkzeug.palletsprojects.com/en/latest/utils/#module-werkzeug.security)

---

**Built with ❤️ using Flask, HTML, CSS, and JavaScript**
