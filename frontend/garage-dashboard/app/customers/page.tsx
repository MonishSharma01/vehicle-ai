'use client';

import { useState, useEffect } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Customer, WorkOrder } from '@/types';
import { mockCustomers, mockWorkOrders } from '@/lib/mockData';
import { generateId, formatCSV, downloadCSV } from '@/lib/utils';
import { Plus, Download, Eye, X } from 'lucide-react';

interface CustomerFormData {
  name: string;
  phone: string;
  email: string;
  carModels: string;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useLocalStorage<Customer[]>(
    'customers',
    mockCustomers
  );
  const [workOrders] = useLocalStorage<WorkOrder[]>('workOrders', mockWorkOrders);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: string } | null>(null);
  const [formData, setFormData] = useState<CustomerFormData>({
    name: '',
    phone: '',
    email: '',
    carModels: '',
  });

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToast = (message: string, type: string = 'success') => {
    setToast({ message, type });
  };

  const filteredCustomers = customers.filter((customer) =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone.includes(searchTerm) ||
    customer.carModels.some((car) =>
      car.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const recentCustomers = [...customers]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, 5);

  const handleAddCustomer = () => {
    if (!formData.name || !formData.phone || !formData.email || !formData.carModels) {
      showToast('Please fill all fields', 'error');
      return;
    }

    const newCustomer: Customer = {
      id: generateId(),
      name: formData.name,
      phone: formData.phone,
      email: formData.email,
      carModels: formData.carModels.split(',').map((car) => car.trim()),
      totalVisits: 0,
      createdAt: new Date().toISOString(),
    };

    setCustomers([...customers, newCustomer]);
    showToast('Customer added successfully!');
    setFormData({ name: '', phone: '', email: '', carModels: '' });
    setShowAddModal(false);
  };

  const handleExportCSV = () => {
    const headers = ['Name', 'Phone', 'Email', 'Car Models', 'Total Visits'];
    const rows = customers.map((customer) => [
      customer.name,
      customer.phone,
      customer.email,
      customer.carModels.join('; '),
      customer.totalVisits.toString(),
    ]);

    const csvContent = formatCSV(headers, rows);
    downloadCSV(csvContent, 'customers.csv');
    showToast('Customers exported as CSV!');
  };

  const getCustomerHistory = (customerId: string): WorkOrder[] => {
    return workOrders.filter((order) => {
      const customer = customers.find((c) => c.id === customerId);
      return customer && order.customerName === customer.name;
    });
  };

  const historicalOrders = showHistoryModal
    ? getCustomerHistory(showHistoryModal)
    : [];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Customers</h1>
          <p className="text-gray-600 mt-1">Manage your customer database</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            <Download size={20} />
            Export CSV
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            <Plus size={20} />
            Add New Customer
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search by name, phone, or car model..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Customers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {filteredCustomers.map((customer) => (
          <div
            key={customer.id}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-lg font-bold text-blue-600">
                  {customer.name.charAt(0)}
                </span>
              </div>
            </div>

            <h3 className="text-lg font-bold text-gray-900 mb-1">
              {customer.name}
            </h3>

            <div className="space-y-2 mb-4">
              <p className="text-sm text-gray-600 flex items-center gap-2">
                <span className="text-blue-600">📞</span>
                {customer.phone}
              </p>
              <p className="text-sm text-gray-600 break-all">
                {customer.email}
              </p>
              {customer.carModels.length > 0 && (
                <p className="text-sm text-gray-600 flex items-center gap-2">
                  <span>🚗</span>
                  {customer.carModels.join(', ')}
                </p>
              )}
            </div>

            <div className="pb-4 border-b border-gray-200">
              <p className="text-sm text-gray-600">Total Visits</p>
              <p className="text-2xl font-bold text-gray-900">
                {customer.totalVisits}
              </p>
            </div>

            <button
              onClick={() => setShowHistoryModal(customer.id)}
              className="w-full mt-4 text-blue-600 hover:text-blue-800 font-medium text-sm transition-colors flex items-center justify-center gap-2"
            >
              <Eye size={16} />
              View History
            </button>
          </div>
        ))}
      </div>

      {/* Recent Customers Section */}
      {recentCustomers.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            Recent Customers
          </h2>
          <div className="space-y-3">
            {recentCustomers.map((customer) => (
              <div
                key={customer.id}
                className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <div>
                  <p className="font-medium text-gray-900">{customer.name}</p>
                  <p className="text-sm text-gray-600">{customer.phone}</p>
                </div>
                <button
                  onClick={() => setShowHistoryModal(customer.id)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <Eye size={18} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Add New Customer</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Car Models (comma-separated)
                </label>
                <textarea
                  value={formData.carModels}
                  onChange={(e) =>
                    setFormData({ ...formData, carModels: e.target.value })
                  }
                  placeholder="e.g., BMW X5, Mercedes C-Class"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 resize-none"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex gap-3 p-6 border-t border-gray-200 justify-end">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCustomer}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
              >
                Add Customer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-screen overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
              <h2 className="text-xl font-bold text-gray-900">
                Service History -{' '}
                {customers.find((c) => c.id === showHistoryModal)?.name}
              </h2>
              <button
                onClick={() => setShowHistoryModal(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6">
              {historicalOrders.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No service history found for this customer
                </p>
              ) : (
                <div className="space-y-3">
                  {historicalOrders.map((order) => (
                    <div
                      key={order.id}
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-gray-900">
                            {order.orderId}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            Service: {order.serviceType}
                          </p>
                          <p className="text-sm text-gray-600">
                            Vehicle: {order.carModel}
                          </p>
                          <p className="text-sm text-gray-600">
                            Date: {order.scheduledDate}
                          </p>
                        </div>
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                            order.status === 'Completed'
                              ? 'bg-green-50 text-green-700'
                              : order.status === 'In Progress'
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-yellow-50 text-yellow-700'
                          }`}
                        >
                          {order.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-3 p-6 border-t border-gray-200 justify-end sticky bottom-0 bg-white">
              <button
                onClick={() => setShowHistoryModal(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 bg-white rounded-lg shadow-lg p-4 flex items-center gap-3 ${
            toast.type === 'error' ? 'border-l-4 border-red-500' : 'border-l-4 border-green-500'
          }`}
        >
          <p className="text-gray-800 text-sm font-medium">{toast.message}</p>
        </div>
      )}
    </div>
  );
}
