# 🚀 Quick Start Guide

## Get Started in 3 Minutes

### Step 1: Install Python Dependencies
```bash
cd work_report_system
pip install -r requirements.txt
```

### Step 2: Run the Application
```bash
python app.py
```

### Step 3: Open in Browser
Navigate to: **http://localhost:5000**

---

## 🔐 Login Credentials

### Admin Access
```
Email: admin@company.com
Password: admin123
```

### Employee Access
```
Email: john@company.com
Password: password123
```

---

## 📱 Quick Feature Guide

### For Employees
1. **Login** → See your dashboard
2. **Check Status** → "Submitted Today" or "Not Submitted"
3. **Submit Report** → Fill form + optional file upload
4. **View History** → See your past 10 submissions

### For Admins
1. **Login** → See statistics dashboard
2. **View Reports** → Filter by employee/date
3. **Manage Staff** → Add, edit, or delete employees
4. **Download Files** → Click download links

---

## 📂 Project Structure

```
work_report_system/
├── app.py                    # Main application
├── requirements.txt          # Dependencies
├── templates/               # HTML files
├── static/                  # CSS & JS
└── uploads/                 # Uploaded files
```

---

## 🛠️ Common Commands

### View Database
```bash
sqlite3 work_reports.db
SELECT * FROM users;
SELECT * FROM submissions;
```

### Reset Database
```bash
rm work_reports.db
python app.py  # Creates fresh database
```

### Change Port
Edit `app.py` line 323:
```python
app.run(debug=True, host='0.0.0.0', port=8000)
```

---

## 🎯 Key Features

✅ Secure authentication with role-based access
✅ Daily work report submission
✅ File attachments (PDF, DOC, Excel, Images)
✅ Admin dashboard with statistics
✅ Employee management (CRUD)
✅ Report filtering by name and date
✅ Duplicate submission prevention
✅ Responsive mobile design

---

## 📞 Need Help?

- Read **README.md** for detailed documentation
- Check **DATABASE_SCHEMA.md** for database info
- Review **PROJECT_CHECKLIST.md** for testing

---

## 🚨 Important Notes

⚠️ Change the secret key in production (app.py line 18)
⚠️ Maximum file upload size: 16MB
⚠️ Allowed file types: PDF, DOC, DOCX, XLS, XLSX, Images
⚠️ One submission per employee per day

---

**Ready to use! Start exploring the application now! 🎉**
