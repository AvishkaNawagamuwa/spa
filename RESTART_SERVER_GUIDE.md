# 🔄 RESTART BACKEND SERVER - QUICK GUIDE

## ⚠️ IMPORTANT: You MUST restart the server for the fix to work!

---

## Option 1: If Using VS Code Terminal

### Step 1: Stop the Server
1. Click on the terminal running the backend
2. Press `Ctrl + C`
3. Wait for it to stop (you'll see command prompt again)

### Step 2: Start the Server
```bash
cd backend
npm start
```

Or if already in backend directory:
```bash
npm start
```

---

## Option 2: If Using External Terminal/Command Prompt

### Step 1: Stop the Server
1. Go to the terminal window running the server
2. Press `Ctrl + C`
3. Confirm if asked

### Step 2: Start the Server
```bash
# Navigate to backend folder
cd "D:\SPA PROJECT\SPA NEW VSCODE\ppp\backend"

# Start the server
npm start
```

---

## Option 3: If Using nodemon (Auto-restart)

### Just save the file!
- If you're using nodemon, it should auto-restart
- Wait a few seconds
- Check the terminal - should see "Server restarted"

---

## ✅ Verify Server is Running

You should see these messages:
```
Server running on port 3001
✅ MySQL Connected to LSA Spa Management Database
Socket.IO initialized
```

---

## 🧪 Test After Restart

### 1. Try Resubmitting Documents
- Go to http://localhost:5173/adminSPA
- Login with a rejected SPA account
- Go to "Resubmit Application"
- Upload new NIC Front and NIC Back
- Click Submit

### 2. Check Backend Logs
Should see:
```
📝 Resubmission request for SPA ID: X
📎 Files received: ['nicFront', 'nicBack']
📎 NIC Front uploaded: uploads\spas\nic\nicFront-...png
📎 NIC Back uploaded: uploads\spas\nic\nicBack-...png
✅ Update data prepared
```

### 3. View Documents as AdminLSA
- Login as AdminLSA
- View the SPA details
- Click on NIC documents
- ✅ Should display correctly now!

---

## ❌ Troubleshooting

### Server Won't Start
**Error**: "Port already in use"
**Solution**: 
1. Find process using port 3001:
   ```bash
   netstat -ano | findstr :3001
   ```
2. Kill that process:
   ```bash
   taskkill /PID <process_id> /F
   ```
3. Start server again

### Can't Find Backend Directory
```bash
# Use full path
cd "D:\SPA PROJECT\SPA NEW VSCODE\ppp\backend"
npm start
```

### NPM Command Not Found
- Install Node.js if not installed
- Or use: `node server.js`

---

## 🎯 Quick Checklist

- [ ] Backend server stopped
- [ ] Backend server restarted  
- [ ] See "Server running" message
- [ ] See "MySQL Connected" message
- [ ] Ready to test resubmission!

---

**After restart, try resubmitting SPA #100 with new NIC photos!** 🚀
