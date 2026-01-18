📊 Employee Timesheet Management System
A modern dark-themed web application for managing employee timesheets, built with Google Apps Script and Bootstrap 5.
🔗 Live Demo
Launch Application
Test Credentials:

Admin: admin / abc
Employee: sample / dec


✨ Features
👥 Employee

✅ Add/edit/delete weekly timesheet entries
💰 Auto-calculated gross pay (hours × hourly rate)
📤 Submit timesheets for admin review
📜 View approved/denied/pending history
🔔 Email notifications on review

🛡️ Admin

📋 Review all submitted timesheets
✅ Approve/deny entire weeks or individual entries
✏️ Edit entries with admin notes
⏳ Mark entries as pending for employee revision
📧 Send automated review notifications
⚙️ Optional auto-submit trigger (Sundays at 4 AM)

🎨 UI/UX

🌙 Modern dark mode theme
📱 Fully responsive (mobile/tablet/desktop)
⚡ Real-time calculations
🎯 Bootstrap 5 + Font Awesome icons


🚀 Quick Setup

Create Google Sheet with tabs: User Logins, Pending, Approved, Denied
Add Apps Script files: Code.gs, Index.html, Stylesheet.html, JavaScript.html
Deploy as Web App: Extensions → Apps Script → Deploy → New deployment
Add users to User Logins tab with columns: Employee ID, Name, Username, Password, Email, Role, Hourly Rate, Status


🛠️ Tech Stack

Backend: Google Apps Script
Frontend: HTML5, CSS3, JavaScript
Framework: Bootstrap 5
Database: Google Sheets
Currency: Indian Rupees (₹)


📋 Sheet Structure
User Logins: Employee ID | Name | Username | Password | Email | Role | Hourly Rate | Status
Pending: Employee ID | Week Start | Date | Hours | Gross Pay | Description | Status | Admin Note | Entry ID
Approved/Denied: All Pending columns + Approval/Denial Date, Admin ID, Reason

⚠️ Note
Uses plain text passwords for simplicity. For production, implement proper authentication and password hashing.

## 📧 Contact

**Shetty Naviya**
- GitHub: [@shettynaviya](https://github.com/shettynaviya)

## 📄 License
