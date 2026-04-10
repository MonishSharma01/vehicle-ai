# Quick Start Guide - Precision Garage Dashboard

## 🎯 Get Started in 3 Minutes

### Step 1: Extract and Navigate
```bash
cd d:\vehicle-ai\frontend\garage-dashboard
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Run Development Server
```bash
npm run dev
```

### Step 4: Open Browser
Navigate to: **http://localhost:3000**

---

## 🧪 Quick Feature Test (5 Minutes)

### Test 1: Dashboard Interactions (1 min)
1. Go to Dashboard
2. Click **ACCEPT** on the new booking alert
3. Verify the booking appears in "Live Service Tracking"
4. Watch the 20-minute countdown timer tick down
5. Click **Mark Completed**
6. Check that stats updated (Completed +1, Revenue +800)

### Test 2: Services Management (1 min)
1. Navigate to **Services**
2. Search for "Battery" - should find "Battery Check"
3. Click pencil icon to edit → change price to 900
4. Click trash icon → delete a service
5. Click **+ Add New Service** → add "Wheel Balancing" for ₹1500, 30 min
6. Try the Quick Add form at bottom

### Test 3: Work Orders (1.5 min)
1. Go to **Work Orders**
2. Click **New Work Order**
3. Fill: John Doe, Tesla Model 3, Battery Check, tomorrow's date
4. Click **Create Order**
5. In the table, click **View Details**
6. Change status: Pending → In Progress → Completed
7. Watch the summary cards update

### Test 4: Customers (1.5 min)
1. Navigate to **Customers**
2. Click **+ Add New Customer**
3. Fill: Priya Sharma, +91-9876543210, priya@email.com, BMW X5, Audi A4
4. Click **Add Customer**
5. Click **View History** on any customer
6. Click **Export CSV** → `customers.csv` should download

---

## 📊 Mock Data Included

**Services** (6 pre-loaded):
- Battery Check - ₹800 - 20 min
- Oil Change - ₹1500 - 30 min
- Wheel Alignment - ₹2800 - 60 min
- Brake Pad Replacement - ₹6500 - 90 min
- Full Oil Service - ₹4200 - 45 min
- Tire Rotation - ₹1200 - 45 min

**Customers** (5 pre-loaded):
- Ajay Sharma (12 visits)
- Priya Rao (5 visits)
- Michael Khan (8 visits)
- Sonia Kapoor (3 visits)
- Rajesh Verma (2 visits)

**Work Orders** (9 pre-loaded):
- Mixed statuses: Pending, In Progress, Completed

---

## 🔧 Useful Commands

```bash
# Development
npm run dev

# Build for production
npm run build

# Start production build
npm start

# Check for lint errors
npm run lint

# Reset all data to defaults
# Run in browser console:
localStorage.clear();
location.reload();
```

---

## 📁 Key Files Reference

| File | Purpose |
|------|---------|
| `app/page.tsx` | Dashboard with stats, bookings, tracking |
| `app/services/page.tsx` | Service CRUD operations |
| `app/work-orders/page.tsx` | Work order management |
| `app/customers/page.tsx` | Customer management + CSV export |
| `components/Sidebar.tsx` | Navigation sidebar |
| `components/Header.tsx` | Top header with user info |
| `hooks/useLocalStorage.ts` | Custom state persistence hook |
| `lib/mockData.ts` | Initial data for all entities |
| `types/index.ts` | TypeScript interfaces |

---

## 🎨 Customize Colors & Styling

Edit `app/globals.css` and `tailwind.config.ts` to change:
- Primary color (currently blue)
- Success/Error/Warning colors
- Font sizes and spacing
- Button styles

---

## 📱 Test Responsive Design

1. Open browser DevTools (F12)
2. Click Device Toolbar (or Ctrl+Shift+M)
3. Switch between Mobile (375px), Tablet (768px), Desktop (1024px)
4. Sidebar and layout should adapt

---

## 💾 How Data Persistence Works

All data is saved to **localStorage** automatically:
- Every add/edit/delete updates localStorage
- Data persists even after closing browser
- Manual data entry is retained between sessions
- Clear localStorage with `localStorage.clear()` in console

---

## ❓ Common Questions

**Q: Where are my changes saved?**
A: In browser localStorage. Check DevTools → Application → Local Storage

**Q: Can I edit customer visit counts?**
A: Currently they auto-increment. Visit count increases when work orders reference that customer.

**Q: How do I reset everything?**
A: Open console (F12) and run `localStorage.clear()`, then refresh page.

**Q: Can I use this with a real backend?**
A: Yes! Replace localStorage calls in components with API calls to your backend.

**Q: Is this mobile-friendly?**
A: Desktop-first, optimized for tablets. Mobile version would need hamburger menu for sidebar.

---

## 🚀 Next Steps

1. **Test all features** using the checklist above
2. **Customize mock data** in `lib/mockData.ts`
3. **Modify colors/styling** in Tailwind config
4. **Add backend integration** by replacing localStorage calls
5. **Deploy** to Vercel: `npm i -g vercel && vercel`

---

**Happy Testing!** 🎉
