// Default Data
const defaultVehicles = [
  { id: "CAR-001", model: "Tesla Model 3", health: 72, failure: "Battery Cell Degradation", urgency: "Medium", action: "Schedule Service", status: "warning", garageApproval: "pending", userApproval: "pending" },
  { id: "CAR-002", model: "Honda City", health: 95, failure: "Normal / None", urgency: "None", action: "Monitor Only", status: "healthy", garageApproval: "none", userApproval: "none" },
  { id: "CAR-003", model: "Toyota Camry", health: 45, failure: "Engine Overheating", urgency: "High", action: "URGENT Service", status: "critical", garageApproval: "pending", userApproval: "pending" },
  { id: "CAR-004", model: "Ford Mustang", health: 88, failure: "Routine Oil Change", urgency: "Low", action: "Schedule Service", status: "healthy", garageApproval: "pending", userApproval: "pending" },
  { id: "CAR-005", model: "BMW X5", health: 30, failure: "Coolant System Leak", urgency: "High", action: "URGENT Service", status: "critical", garageApproval: "pending", userApproval: "pending" },
  { id: "CAR-006", model: "Hyundai Creta", health: 65, failure: "Brake Pad Wear", urgency: "Medium", action: "Schedule Service", status: "warning", garageApproval: "pending", userApproval: "pending" }
];

const defaultAnomalies = [
  { time: "10:15 AM", vehicle: "CAR-003", issue: "Risk=Low but Decision=Urgent → MISMATCH", severity: "critical" },
  { time: "09:30 AM", vehicle: null, issue: "Prediction confidence 65% (below 70% threshold)", severity: "warning" },
  { time: "08:45 AM", vehicle: null, issue: "Pricing Agent failed to respond → RESTARTED", severity: "info" }
];

const defaultGarages = [
  { name: "QuickFix Garage", bookings: 156, revenue: 140400, rating: 4.2, status: "active" },
  { name: "SpeedService", bookings: 98, revenue: 88200, rating: 4.5, status: "active" },
  { name: "AutoCare Pro", bookings: 45, revenue: 40500, rating: 3.9, status: "warning-status" },
  { name: "City Garage", bookings: 12, revenue: 10800, rating: 3.2, status: "suspended" }
];

const failureData = [
  { label: "Battery Issues", pct: 45, color: "#4F46E5" },
  { label: "Engine Problems", pct: 25, color: "#8B5CF6" },
  { label: "Oil Related", pct: 20, color: "#F59E0B" },
  { label: "Coolant Issues", pct: 10, color: "#14B8A6" }
];

// Initialize global state arrays
let vehicles = JSON.parse(localStorage.getItem('ai_admin_vehicles')) || defaultVehicles;
let anomalies = JSON.parse(localStorage.getItem('ai_admin_anomalies')) || defaultAnomalies;
let garages = JSON.parse(localStorage.getItem('ai_admin_garages')) || defaultGarages;

// Save functions
function saveState() {
  localStorage.setItem('ai_admin_vehicles', JSON.stringify(vehicles));
  localStorage.setItem('ai_admin_anomalies', JSON.stringify(anomalies));
  localStorage.setItem('ai_admin_garages', JSON.stringify(garages));
}

// Global UI Utilities
function showToast(message, type = 'success') {
  let container = document.getElementById('toastContainer');
  if(!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  let icon = 'fa-check-circle';
  if(type === 'info') icon = 'fa-info-circle';
  if(type === 'warning' || type === 'error') icon = 'fa-exclamation-triangle';
  toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('out');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function formatTime(date) {
  return date.toLocaleTimeString('en-US', { hour12: true, hour: 'numeric', minute: '2-digit', second: '2-digit' });
}

function openModal(id) {
  const el = document.getElementById(id);
  if(el) el.classList.add('show');
}
function closeModal(id) { 
  const el = document.getElementById(id);
  if(el) el.classList.remove('show'); 
}

// Layout Global Initialization
document.addEventListener('DOMContentLoaded', () => {
  const clock = document.getElementById('liveClock');
  if(clock) {
    setInterval(() => clock.textContent = new Date().toLocaleTimeString('en-US', { hour12: false }), 1000);
    clock.textContent = new Date().toLocaleTimeString('en-US', { hour12: false });
  }

  const welcomeDate = document.getElementById('welcomeDate');
  if(welcomeDate) welcomeDate.textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const lastRefresh = document.getElementById('lastRefresh');
  if(lastRefresh) lastRefresh.textContent = formatTime(new Date());
  
  const h = new Date().getHours();
  const msg = document.getElementById('welcomeMsg');
  if(msg) msg.innerHTML = `Good ${h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening'}, Admin`;

  const totalCard = document.getElementById('statVehicles');
  if(totalCard) totalCard.textContent = vehicles.length + 241;
});
