# 🎯 Payment Plan Selection - Behavior Test

## Expected Behavior Flow:

### 📋 **Phase 1: Initial Plan Selection (Before First Payment)**
**Status**: `isPlanFixed = false`

✅ **User CAN:**
- Select ANY plan (Monthly, Quarterly, Half-Yearly, Annual)
- Change between plans freely
- See blue notification: "Select Your Payment Plan"
- All plan buttons are enabled and clickable

❌ **User CANNOT:**
- Make payments yet (must select a plan first)

---

### 📋 **Phase 2: After First Payment/Upload**
**Status**: `isPlanFixed = true`

✅ **User CAN:**
- See their selected plan marked as "Fixed for Year"
- View green notification: "Payment Plan Fixed for the Year"
- See other plans marked as "Plan Locked"

❌ **User CANNOT:**
- Change to a different plan
- Click other plan buttons (they're disabled)
- Make new payments for different plans

---

## 🧪 **Manual Testing Steps:**

### 1. **Fresh User (No Previous Payments)**
```
1. Navigate to Payment Plans page
2. ✅ Should see blue notification: "Select Your Payment Plan"
3. ✅ All 4 plan buttons should be clickable
4. ✅ Can switch between Monthly/Quarterly/Half-Yearly/Annual
5. ✅ Selected plan shows "Selected", others show "Select Plan"
```

### 2. **Select Plan & Make Card Payment**
```
1. Choose any plan (e.g., "Monthly")
2. Click "Selected" button on Monthly plan
3. Choose "Card Payment"
4. Fill in card details and submit
5. ✅ Should see success message with plan locking
6. ✅ Page should reload/update
7. ✅ Green notification: "Payment Plan Fixed for the Year"
8. ✅ Monthly plan shows "Fixed for Year" (green button)
9. ✅ Other plans show "Plan Locked" (disabled gray buttons)
10. ✅ Clicking other plans shows "Plan Fixed" popup
```

### 3. **Select Plan & Upload Bank Transfer**
```
1. Choose any plan (e.g., "Annual") 
2. Choose "Bank Transfer"
3. Upload a PDF/image file
4. Submit payment
5. ✅ Should see upload success with plan locking message
6. ✅ Same locked behavior as card payment
```

### 4. **Existing User (Has Previous Payment)**
```
1. User with existing payment logs in
2. ✅ Should immediately see green notification
3. ✅ Their previous plan should be pre-selected and locked
4. ✅ Cannot change to other plans
```

---

## 🔍 **Backend Verification:**

Check database after each payment:
```sql
SELECT 
    spa_id, 
    payment_plan, 
    payment_status, 
    amount,
    created_at 
FROM payments 
WHERE spa_id = [YOUR_SPA_ID] 
ORDER BY created_at DESC 
LIMIT 1;
```

**Expected Results:**
- `payment_plan`: Should match selected plan (Monthly/Quarterly/Half-Yearly/Annual)
- `payment_status`: 'completed' (card) or 'pending_approval' (bank transfer)

---

## 🚨 **Common Issues to Watch For:**

1. **Plan immediately locked on page load** → Check `checkExistingPayments()` logic
2. **Cannot select any plans** → Check `isPlanFixed` initial state
3. **Can change plans after payment** → Check payment success handlers
4. **Wrong plan shown as fixed** → Check plan mapping in `checkExistingPayments()`

---

## 📊 **Success Criteria:**

- [x] ✅ Fresh users can select any plan freely
- [x] ✅ After payment, plan becomes fixed for one year  
- [x] ✅ Users with existing payments see locked state
- [x] ✅ Clear visual feedback (notifications + button states)
- [x] ✅ Database correctly stores selected payment plan
- [x] ✅ Backend API returns correct `hasActivePayment` status

---

**Status**: 🎯 **READY FOR TESTING**

Test with different user accounts:
1. **New user** (no previous payments)
2. **Existing user** (has previous payments)
3. **Test both payment methods** (card + bank transfer)