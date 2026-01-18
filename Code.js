// Code.gs - Main Backend Functions

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function doGet(e) {
  const template = HtmlService.createTemplateFromFile('Index');
  return template.evaluate()
    .setTitle('Timesheet Management System')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ====== AUTHENTICATION ======
function validateLogin(username, password) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('User Logins');
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    // Convert everything to strings and trim whitespace
    const dbUsername = String(data[i][2]).trim();
    const dbPassword = String(data[i][3]).trim();
    const dbStatus = String(data[i][7]).trim();
    
    const inputUsername = String(username).trim();
    const inputPassword = String(password).trim();
    
    if (dbUsername === inputUsername && dbPassword === inputPassword && dbStatus === 'Active') {
      return {
        success: true,
        user: {
          employeeId: data[i][0],
          name: data[i][1],
          email: data[i][4],
          role: data[i][5],
          hourlyRate: data[i][6]
        }
      };
    }
  }
  return { success: false, message: 'Invalid credentials or inactive account' };
}

function requestNewPassword(username) {
  const admins = getActiveAdmins();
  if (admins.length === 0) {
    return { success: false, message: 'No active admins found' };
  }
  
  const subject = 'Password Reset Request';
  const body = `A password reset has been requested for username: ${username}\n\nPlease assist the user.`;
  
  admins.forEach(admin => {
    MailApp.sendEmail(admin.email, subject, body);
  });
  
  return { success: true, message: 'Password reset request sent to admins' };
}

function getActiveAdmins() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('User Logins');
  const data = sheet.getDataRange().getValues();
  const admins = [];
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][5] === 'Admin' && data[i][7] === 'Active') {
      admins.push({
        employeeId: data[i][0],
        name: data[i][1],
        email: data[i][4]
      });
    }
  }
  return admins;
}

// ====== EMPLOYEE FUNCTIONS ======
function getPendingTimesheet(employeeId) {
  const weekStart = getWeekStart(new Date());
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Pending');
  const data = sheet.getDataRange().getValues();
  const entries = [];
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == employeeId && data[i][1].getTime() === weekStart.getTime()) {
      entries.push({
        entryId: data[i][8],
        date: formatDate(data[i][2]),
        hours: data[i][3],
        grossPay: data[i][4],
        description: data[i][5],
        status: data[i][6],
        adminNote: data[i][7]
      });
    }
  }
  
  return entries;
}

function addTimesheetEntry(employeeId, hourlyRate, date, hours, description) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Pending');
  const weekStart = getWeekStart(new Date(date));
  const grossPay = hours * hourlyRate;
  const entryId = Utilities.getUuid();
  
  sheet.appendRow([
    employeeId,
    weekStart,
    new Date(date),
    hours,
    grossPay,
    description,
    'Pending',
    '',
    entryId
  ]);
  
  return { success: true };
}

function updateTimesheetEntry(entryId, date, hours, hourlyRate, description) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Pending');
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][8] === entryId && data[i][6] === 'Pending') {
      const grossPay = hours * hourlyRate;
      sheet.getRange(i + 1, 3).setValue(new Date(date));
      sheet.getRange(i + 1, 4).setValue(hours);
      sheet.getRange(i + 1, 5).setValue(grossPay);
      sheet.getRange(i + 1, 6).setValue(description);
      return { success: true };
    }
  }
  return { success: false, message: 'Entry not found or already submitted' };
}

function deleteTimesheetEntry(entryId) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Pending');
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][8] === entryId && data[i][6] === 'Pending') {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }
  return { success: false, message: 'Entry not found or already submitted' };
}

function submitWeeklyTimesheet(employeeId) {
  const weekStart = getWeekStart(new Date());
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Pending');
  const data = sheet.getDataRange().getValues();
  let updated = 0;
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == employeeId && data[i][1].getTime() === weekStart.getTime() && data[i][6] === 'Pending') {
      sheet.getRange(i + 1, 7).setValue('Submitted');
      updated++;
    }
  }
  
  if (updated > 0) {
    notifyAdminsOfSubmission(employeeId);
    return { success: true };
  }
  return { success: false, message: 'No pending entries to submit' };
}

function notifyAdminsOfSubmission(employeeId) {
  const admins = getActiveAdmins();
  const userSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('User Logins');
  const userData = userSheet.getDataRange().getValues();
  let employeeName = '';
  
  for (let i = 1; i < userData.length; i++) {
    if (userData[i][0] == employeeId) {
      employeeName = userData[i][1];
      break;
    }
  }
  
  const subject = 'Timesheet Submitted for Review';
  const body = `Employee ${employeeName} (ID: ${employeeId}) has submitted their timesheet for review.`;
  
  admins.forEach(admin => {
    MailApp.sendEmail(admin.email, subject, body);
  });
}

function getHistoricalTimesheets(employeeId) {
  const approved = getHistoricalFromSheet('Approved', employeeId);
  const denied = getHistoricalFromSheet('Denied', employeeId);
  const pending = getPendingHistoricalFromSheet(employeeId);
  return { approved, denied, pending };
}

function getPendingHistoricalFromSheet(employeeId) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Pending');
  if (!sheet) return [];
  
  const data = sheet.getDataRange().getValues();
  const entries = [];
  const currentWeekStart = getWeekStart(new Date());
  
  for (let i = 1; i < data.length; i++) {
    // Only get entries from previous weeks (not current week)
    if (data[i][0] == employeeId && data[i][1].getTime() < currentWeekStart.getTime()) {
      entries.push({
        weekStart: formatDate(data[i][1]),
        date: formatDate(data[i][2]),
        hours: data[i][3],
        grossPay: data[i][4],
        description: data[i][5],
        status: data[i][6],
        adminNote: data[i][7]
      });
    }
  }
  
  return entries;
}

function getHistoricalFromSheet(sheetName, employeeId) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) return [];
  
  const data = sheet.getDataRange().getValues();
  const entries = [];
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == employeeId) {
      entries.push({
        weekStart: formatDate(data[i][1]),
        date: formatDate(data[i][2]),
        hours: data[i][3],
        grossPay: data[i][4],
        description: data[i][5],
        adminNote: data[i][7],
        actionDate: sheetName === 'Approved' ? formatDate(data[i][9]) : formatDate(data[i][9]),
        actionBy: sheetName === 'Approved' ? data[i][10] : data[i][10],
        reason: sheetName === 'Denied' ? data[i][11] : ''
      });
    }
  }
  
  return entries;
}

// ====== ADMIN FUNCTIONS ======
function getSubmittedTimesheets() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Pending');
  const data = sheet.getDataRange().getValues();
  const userSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('User Logins');
  const userData = userSheet.getDataRange().getValues();
  
  const timesheets = {};
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][6] === 'Submitted') {
      const employeeId = data[i][0];
      const weekStart = formatDate(data[i][1]);
      const key = `${employeeId}_${weekStart}`;
      
      if (!timesheets[key]) {
        let employeeName = '';
        for (let j = 1; j < userData.length; j++) {
          if (userData[j][0] == employeeId) {
            employeeName = userData[j][1];
            break;
          }
        }
        
        timesheets[key] = {
          employeeId,
          employeeName,
          weekStart,
          totalHours: 0,
          totalGrossPay: 0,
          entries: []
        };
      }
      
      timesheets[key].totalHours += data[i][3];
      timesheets[key].totalGrossPay += data[i][4];
      timesheets[key].entries.push({
        entryId: data[i][8],
        date: formatDate(data[i][2]),
        hours: data[i][3],
        grossPay: data[i][4],
        description: data[i][5],
        adminNote: data[i][7]
      });
    }
  }
  
  return Object.values(timesheets);
}

function approveEntries(entryIds, adminId) {
  const pendingSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Pending');
  const approvedSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Approved');
  const data = pendingSheet.getDataRange().getValues();
  const approvalDate = new Date();
  const rowsToDelete = [];
  
  for (let i = 1; i < data.length; i++) {
    if (entryIds.includes(data[i][8])) {
      approvedSheet.appendRow([
        data[i][0], data[i][1], data[i][2], data[i][3], data[i][4],
        data[i][5], data[i][6], data[i][7], data[i][8],
        approvalDate, adminId
      ]);
      rowsToDelete.push(i + 1);
    }
  }
  
  // Delete from bottom to top to maintain row indices
  for (let i = rowsToDelete.length - 1; i >= 0; i--) {
    pendingSheet.deleteRow(rowsToDelete[i]);
  }
  
  return { success: true };
}

function denyEntries(entryIds, adminId, reason) {
  const pendingSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Pending');
  const deniedSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Denied');
  const data = pendingSheet.getDataRange().getValues();
  const denialDate = new Date();
  const rowsToDelete = [];
  
  for (let i = 1; i < data.length; i++) {
    if (entryIds.includes(data[i][8])) {
      deniedSheet.appendRow([
        data[i][0], data[i][1], data[i][2], data[i][3], data[i][4],
        data[i][5], data[i][6], data[i][7], data[i][8],
        denialDate, adminId, reason
      ]);
      rowsToDelete.push(i + 1);
    }
  }
  
  for (let i = rowsToDelete.length - 1; i >= 0; i--) {
    pendingSheet.deleteRow(rowsToDelete[i]);
  }
  
  return { success: true };
}

function markEntriesAsPending(entryIds) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Pending');
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (entryIds.includes(data[i][8]) && data[i][6] === 'Submitted') {
      sheet.getRange(i + 1, 7).setValue('Pending');
      sheet.getRange(i + 1, 8).setValue('Returned to Pending by Admin for revision');
    }
  }
  
  return { success: true };
}

function adminEditEntry(entryId, hours, adminId, adminNote) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Pending');
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][8] === entryId) {
      const employeeId = data[i][0];
      const userSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('User Logins');
      const userData = userSheet.getDataRange().getValues();
      let hourlyRate = 0;
      
      for (let j = 1; j < userData.length; j++) {
        if (userData[j][0] == employeeId) {
          hourlyRate = userData[j][6];
          break;
        }
      }
      
      const grossPay = hours * hourlyRate;
      sheet.getRange(i + 1, 4).setValue(hours);
      sheet.getRange(i + 1, 5).setValue(grossPay);
      sheet.getRange(i + 1, 8).setValue(`Edited by Admin ${adminId}: ${adminNote}`);
      return { success: true };
    }
  }
  return { success: false };
}

function finalizeReview(employeeId, weekStart) {
  const userSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('User Logins');
  const userData = userSheet.getDataRange().getValues();
  let email = '';
  let name = '';
  
  for (let i = 1; i < userData.length; i++) {
    if (userData[i][0] == employeeId) {
      email = userData[i][4];
      name = userData[i][1];
      break;
    }
  }
  
  if (!email) return { success: false };
  
  const approved = getWeekEntries('Approved', employeeId, weekStart);
  const denied = getWeekEntries('Denied', employeeId, weekStart);
  
  let body = `Dear ${name},\n\nYour timesheet for week starting ${weekStart} has been reviewed.\n\n`;
  
  if (approved.length > 0) {
    body += `APPROVED ENTRIES: ${approved.length}\n`;
  }
  if (denied.length > 0) {
    body += `DENIED ENTRIES: ${denied.length}\n`;
  }
  
  body += '\nPlease log in to view details.';
  
  MailApp.sendEmail(email, 'Timesheet Review Complete', body);
  return { success: true };
}

function getWeekEntries(sheetName, employeeId, weekStart) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) return [];
  
  const data = sheet.getDataRange().getValues();
  const entries = [];
  const weekDate = new Date(weekStart);
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == employeeId && data[i][1].getTime() === weekDate.getTime()) {
      entries.push(data[i]);
    }
  }
  
  return entries;
}

function getAllHistoricalTimesheets() {
  const approved = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Approved');
  const denied = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Denied');
  const userSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('User Logins');
  const userData = userSheet.getDataRange().getValues();
  
  const timesheets = {};
  
  function processSheet(sheet, status) {
    if (!sheet) return;
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      const employeeId = data[i][0];
      const weekStart = formatDate(data[i][1]);
      const key = `${employeeId}_${weekStart}`;
      
      if (!timesheets[key]) {
        let employeeName = '';
        for (let j = 1; j < userData.length; j++) {
          if (userData[j][0] == employeeId) {
            employeeName = userData[j][1];
            break;
          }
        }
        
        timesheets[key] = {
          employeeId,
          employeeName,
          weekStart,
          status: status,
          entries: []
        };
      } else if (timesheets[key].status !== status) {
        timesheets[key].status = 'Mixed';
      }
      
      timesheets[key].entries.push({
        date: formatDate(data[i][2]),
        hours: data[i][3],
        grossPay: data[i][4],
        description: data[i][5],
        status: status
      });
    }
  }
  
  processSheet(approved, 'Approved');
  processSheet(denied, 'Denied');
  
  return Object.values(timesheets);
}

// ====== UTILITY FUNCTIONS ======
function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  const weekStart = new Date(d.setDate(diff));
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
}

function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const year = d.getFullYear();
  return `${month}/${day}/${year}`;
}

function formatCurrency(amount) {
  return '₹' + Number(amount).toFixed(2);
}

// ====== AUTO-SUBMIT TRIGGER ======
function autoSubmitTimesheets() {
  const lastSunday = new Date();
  lastSunday.setDate(lastSunday.getDate() - lastSunday.getDay());
  lastSunday.setHours(0, 0, 0, 0);
  
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Pending');
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][1].getTime() === lastSunday.getTime() && data[i][6] === 'Pending') {
      sheet.getRange(i + 1, 7).setValue('Submitted');
    }
  }
}

function installAutoSubmitTrigger() {
  ScriptApp.newTrigger('autoSubmitTimesheets')
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.SUNDAY)
    .atHour(4)
    .create();
  return { success: true, message: 'Auto-submit trigger installed' };
}