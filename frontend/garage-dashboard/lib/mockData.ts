import { Service, Customer, WorkOrder, NewBooking, LiveJob, ChargesConfig } from '@/types';

export const mockServices: Service[] = [
  { id: '1', name: 'Battery Check', price: 800, estimatedTime: 20 },
  { id: '2', name: 'Oil Change', price: 1500, estimatedTime: 30 },
  { id: '3', name: 'Wheel Alignment', price: 2800, estimatedTime: 60 },
  { id: '4', name: 'Brake Pad Replacement', price: 6500, estimatedTime: 90 },
  { id: '5', name: 'Full Oil Service', price: 4200, estimatedTime: 45 },
  { id: '6', name: 'Tire Rotation', price: 1200, estimatedTime: 45 },
];

export const mockCustomers: Customer[] = [
  {
    id: '1',
    name: 'Ajay Sharma',
    phone: '+91 98765 43210',
    email: 'ajay@example.com',
    carModels: ['BMW X5'],
    totalVisits: 12,
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '2',
    name: 'Priya Rao',
    phone: '+91 87654 32109',
    email: 'priya@example.com',
    carModels: ['Honda City'],
    totalVisits: 5,
    createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '3',
    name: 'Michael Khan',
    phone: '+91 95008 87766',
    email: 'michael@example.com',
    carModels: ['Audi A4'],
    totalVisits: 8,
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '4',
    name: 'Sonia Kapoor',
    phone: '+91 77223 34455',
    email: 'sonia@example.com',
    carModels: ['Tesla Model 3'],
    totalVisits: 3,
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '5',
    name: 'Rajesh Verma',
    phone: '+91 98765 11111',
    email: 'rajesh@example.com',
    carModels: ['Maruti Swift'],
    totalVisits: 2,
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export const mockWorkOrders: WorkOrder[] = [
  {
    id: '1',
    orderId: 'WO-101',
    customerName: 'John Doe',
    carModel: 'BMW M3 (2022)',
    serviceType: 'Oil Change',
    status: 'Pending',
    scheduledDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  },
  {
    id: '2',
    orderId: 'WO-102',
    customerName: 'Sarah Miller',
    carModel: 'Tesla Model 3',
    serviceType: 'Brake Service',
    status: 'In Progress',
    scheduledDate: new Date().toISOString().split('T')[0],
  },
  {
    id: '3',
    orderId: 'WO-103',
    customerName: 'Mike Knight',
    carModel: 'Ford F-150',
    serviceType: 'Transmission',
    status: 'Completed',
    scheduledDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  },
  {
    id: '4',
    orderId: 'WO-104',
    customerName: 'Emily Watson',
    carModel: 'Audi A6',
    serviceType: 'Wheel Alignment',
    status: 'Pending',
    scheduledDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  },
  {
    id: '5',
    orderId: 'WO-105',
    customerName: 'James Brown',
    carModel: 'Honda Civic',
    serviceType: 'Battery Check',
    status: 'In Progress',
    scheduledDate: new Date().toISOString().split('T')[0],
  },
  {
    id: '6',
    orderId: 'WO-106',
    customerName: 'Lisa Anderson',
    carModel: 'Mercedes C-Class',
    serviceType: 'Oil Service',
    status: 'Completed',
    scheduledDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  },
  {
    id: '7',
    orderId: 'WO-107',
    customerName: 'David Wilson',
    carModel: 'Volkswagen Golf',
    serviceType: 'Tire Rotation',
    status: 'Pending',
    scheduledDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  },
  {
    id: '8',
    orderId: 'WO-108',
    customerName: 'Jennifer Lee',
    carModel: 'BMW X5',
    serviceType: 'Full Service',
    status: 'In Progress',
    scheduledDate: new Date().toISOString().split('T')[0],
  },
  {
    id: '9',
    orderId: 'WO-109',
    customerName: 'Robert Davis',
    carModel: 'Hyundai Tucson',
    serviceType: 'Oil Change',
    status: 'Completed',
    scheduledDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  },
];

export const mockNewBooking: NewBooking = {
  id: '1',
  issueId: 'I1001',
  carModel: 'BMW X5 (2022)',
  owner: 'Ajay',
  problem: 'BATTERY CHECK',
  scheduledTime: 'Today, 10:00 AM',
};

export const mockLiveJobs: LiveJob[] = [
  {
    id: '1',
    carId: 'CAR-002',
    serviceType: 'Oil Change',
    status: 'IN_PROGRESS',
    timeLeft: 1200, // 20 minutes
    serviceCost: 1500,
  },
  {
    id: '2',
    carId: 'CAR-003',
    serviceType: 'Tire Rotation',
    status: 'SCHEDULED',
    scheduledTime: '11:30 AM',
    serviceCost: 1200,
  },
];

export const defaultChargesConfig: ChargesConfig = {
  basicService: 20000,
  engineFuelRangeMin: 1000,
  engineFuelRangeMax: 2000,
  coolantMin: 700,
  coolantMax: 800,
  batteryExchangeMin: 25000,
  batteryExchangeMax: 30000,
  tyresNormalMin: 2000,
  tyresNormalMax: 3000,
  tyresNew: 20000,
  carDamage: '',
};

export const defaultDashboardStats = {
  todaysBookings: 4,
  completed: 2,
  revenue: 2400,
  rating: 4.2,
};
