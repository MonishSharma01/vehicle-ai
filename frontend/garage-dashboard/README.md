# Precision Garage - Dashboard Frontend

A complete Next.js + Tailwind CSS frontend for a garage management dashboard with full CRUD operations, real-time tracking, and localStorage persistence.

## 🚀 Features

✅ **Complete Dashboard**
- Real-time statistics (Today's Bookings, Completed, Revenue, Rating)
- New booking alert system with Accept/Reject functionality
- Live service tracking with countdown timers
- Service charges configuration modal

✅ **Services Management**
- View all services in a searchable table
- Add, edit, and delete services
- Quick add service form
- Filter by service name

✅ **Work Orders Tracking**
- Create new work orders with full details
- Filter by status (All, Pending, In Progress, Completed)
- Search by Order ID or Customer name
- View detailed order information
- Update order status in real-time
- Summary cards showing order statistics

✅ **Customer Management**
- Add new customers with multiple car models
- Search customers by name, phone, or car model
- View service history for each customer
- Display customer visit count
- Export customer list as CSV
- Recent customers sidebar

✅ **Technical**
- TypeScript for type safety
- Responsive design (Desktop-first)
- localStorage for data persistence
- No backend required - all client-side
- Custom React hooks for state management
- Tailwind CSS for styling
- Lucide React for icons
- Toast notifications for user feedback

## 📋 Prerequisites

- Node.js 16+ (recommended 18 or higher)
- npm or yarn package manager

## 🛠️ Installation

1. **Initialize the Next.js project** (if not already done):

```bash
npx create-next-app@latest . --tailwind --typescript
# When prompted:
# - Use ESLint? → Yes
# - src/ directory? → No
# - App Router? → Yes
# - Customize import alias? → No
```

2. **Install additional dependencies**:

```bash
npm install lucide-react
```

3. **Project structure** - The following files should be created in your project root:

```
garage-dashboard/
├── app/
│   ├── layout.tsx
│   ├── globals.css
│   ├── page.tsx (Dashboard)
│   ├── services/
│   │   └── page.tsx
│   ├── work-orders/
│   │   └── page.tsx
│   └── customers/
│       └── page.tsx
├── components/
│   ├── Sidebar.tsx
│   ├── Header.tsx
│   ├── StatsCard.tsx
│   ├── NewBookingAlert.tsx
│   ├── LiveServiceTrackingItem.tsx
│   └── SetChargesModal.tsx
├── hooks/
│   └── useLocalStorage.ts
├── lib/
│   ├── mockData.ts
│   └── utils.ts
├── types/
│   └── index.ts
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.js
├── next.config.js
└── .eslintrc.json
```

All files are provided in the code blocks below.

## 🚀 Running the Application

1. **Start the development server**:

```bash
npm run dev
```

2. **Open in browser**:

Navigate to [http://localhost:3000](http://localhost:3000)

3. **Build for production**:

```bash
npm run build
npm start
```

## 📝 User Guide & Feature Testing

### Dashboard (/):

1. **Stats Cards**: Display Today's Bookings (4), Completed (2), Revenue (₹2,400), Rating (4.2⭐)
   - Stats update when you accept bookings or mark services as completed

2. **New Booking Alert**:
   - Shows BMW X5 booking with Issue ID I1001, Owner: Ajay, Problem: BATTERY CHECK
   - Click **ACCEPT** → Moves to Live Service Tracking with 20-minute countdown
   - Click **REJECT** → Removes the booking

3. **Live Service Tracking**:
   - Shows active jobs with status badges (IN_PROGRESS green, SCHEDULED yellow)
   - For IN_PROGRESS jobs: Shows timer countdown
   - Click **Mark Completed** → Updates stats and removes from tracking
   - Click **Submission** → Shows success toast notification

4. **Insights Banner**:
   - Displays "80% of your bookings are BATTERY issues → Stock more batteries!"
   - Click **X** to dismiss

5. **Set My Charges Button**:
   - Opens modal with form fields for service charges
   - Charges include: Basic Service, Engine Fuel Range, Coolant, Battery Exchange, Tyres, Car Damage
   - Click **Save Changes** → Stores in localStorage

### Services (/services):

1. **Search Services**:
   - Type in search bar to filter services by name
   - Mock data includes: Battery Check, Oil Change, Wheel Alignment, Brake Pad Replacement, etc.

2. **Add Service** (Modal):
   - Click **+ Add New Service** button
   - Fill: Service Name, Price (₹), Estimated Time (minutes)
   - Click **Add Service** to save

3. **Edit Service**:
   - Click pencil icon next to any service
   - Modal opens with pre-filled values
   - Modify and click **Update Service**

4. **Delete Service**:
   - Click trash icon next to any service
   - Confirmation modal appears
   - Click **Delete** to confirm

5. **Quick Add Section**:
   - Alternative way to add services
   - Fill all fields in the quick add form and click **Add Service**

### Work Orders (/work-orders):

1. **View Summary Cards**:
   - Shows Total Orders, Pending, In Progress, Completed counts
   - Automatically updates based on data

2. **Filter Work Orders**:
   - Click filter buttons: **All**, **Pending**, **In Progress**, **Completed**
   - Active filter is highlighted in blue

3. **Search Work Orders**:
   - Type Order ID (e.g., WO-101) or Customer Name
   - Table filters in real-time

4. **Create Work Order**:
   - Click **+ New Work Order** button
   - Fill: Customer Name, Car Model, Service Type (dropdown), Scheduled Date
   - Click **Create Order** to add to table

5. **View Order Details**:
   - Click **View Details** button in Actions column
   - Modal shows full order information
   - Change Status using dropdown: Pending → In Progress → Completed
   - Status updates immediately and table refreshes

### Customers (/customers):

1. **Search Customers**:
   - Search by Name, Phone Number, or Car Model
   - Filters dynamically as you type

2. **Add Customer**:
   - Click **+ Add New Customer** button
   - Fill: Name, Phone, Email, Car Models (comma-separated)
   - Click **Add Customer** to save

3. **View Customer Details**:
   - Each customer shown as a card with name, phone, email, car models
   - Shows **Total Visits** count

4. **View Service History**:
   - Click **View History** button on any customer card
   - Modal shows all past work orders for that customer
   - Displays Order ID, Service Type, Vehicle, Status, and Date

5. **Export CSV**:
   - Click **Export CSV** button at top right
   - Downloads `customers.csv` file with all customer data
   - Columns: Name, Phone, Email, Car Models, Total Visits

6. **Recent Customers**:
   - Bottom section shows last 5 added customers
   - Quick access to recently added records

## 💾 Data Storage

All data is stored in **localStorage** using the custom `useLocalStorage` hook:

- `dashboardStats` - Current stats (bookings, completed, revenue, rating)
- `liveJobs` - Active service jobs
- `newBooking` - Current booking to accept/reject
- `chargesConfig` - Service charge configuration
- `services` - All services
- `workOrders` - All work orders
- `customers` - All customers

**Clear localStorage** (to reset all data):
```javascript
// In browser console:
localStorage.clear();
// Then reload the page
```

## 🎨 Styling

- **Framework**: Tailwind CSS
- **Color Scheme**: Blue primary, green success, red danger, yellow warning
- **Layout**: Sidebar (left) + Main Content (right)
- **Responsive**: Desktop-first, works on tablets and mobile
- **Icons**: Lucide React (20 outlined icons)

## 📦 Project Structure

```
components/          # Reusable UI components
├── Sidebar.tsx
├── Header.tsx
├── StatsCard.tsx
├── NewBookingAlert.tsx
├── LiveServiceTrackingItem.tsx
└── SetChargesModal.tsx

app/                 # Next.js App Router pages
├── layout.tsx       # Root layout with sidebar
├── globals.css      # Global styles
├── page.tsx         # Dashboard
├── services/
├── work-orders/
└── customers/

types/              # TypeScript interfaces
└── index.ts

lib/                # Utilities and mock data
├── mockData.ts
└── utils.ts

hooks/              # Custom React hooks
└── useLocalStorage.ts
```

## 🐛 Troubleshooting

### Issue: Styles not loading
**Solution**: Make sure Tailwind CSS is properly configured in `tailwind.config.ts` and `postcss.config.js`

### Issue: Data not persisting after refresh
**Solution**: Check localStorage in browser DevTools (F12 → Application → Local Storage)

### Issue: Icons not showing
**Solution**: Ensure `lucide-react` is installed: `npm install lucide-react`

### Issue: TypeScript errors
**Solution**: Run `npm run build` to check for compilation errors, or check `tsconfig.json`

## 🎯 Interactive Features Checklist

- ✅ Accept/Reject bookings
- ✅ Live job countdown timer
- ✅ Mark service as completed
- ✅ Submit order
- ✅ Add/Edit/Delete services
- ✅ Create work orders
- ✅ Update work order status
- ✅ Add/Edit customers
- ✅ View customer history
- ✅ Export customers as CSV
- ✅ Search and filter across all pages
- ✅ Toast notifications
- ✅ Modal dialogs
- ✅ Responsive sidebar navigation

## 📱 Responsive Breakpoints

- **Mobile**: < 768px (single column, sidebar hidden/drawer)
- **Tablet**: 768px - 1024px (adjusts grid to 2 columns)
- **Desktop**: > 1024px (full layout with 3-4 columns)

## 🔄 Next Steps (Optional Enhancements)

1. **Add Authentication**: Integrate with a backend auth service
2. **Connect API**: Replace localStorage with actual API calls
3. **Real-time Updates**: Add WebSocket for live notifications
4. **Dark Mode**: Implement theme switcher
5. **Print Reports**: Add print functionality for work orders
6. **Email Notifications**: Send confirmations to customers
7. **Payment Integration**: Add payment processing for services
8. **Mobile App**: Build React Native version

## 📄 License

MIT - Feel free to use this as a template for your projects

## 🤝 Support

For issues or questions, refer to the troubleshooting section or check browser console (F12) for error messages.

---

**Great! Your Precision Garage Dashboard is ready to use!** 🚗✨
