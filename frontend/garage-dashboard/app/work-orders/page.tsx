'use client';

import { useState, useEffect } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { WorkOrder, Service } from '@/types';
import { mockWorkOrders, mockServices } from '@/lib/mockData';
import { generateId, formatDate } from '@/lib/utils';
import { Plus, Eye, X } from 'lucide-react';

interface WorkOrderFormData {
  customerName: string;
  carModel: string;
  serviceType: string;
  scheduledDate: string;
  status: 'Pending' | 'In Progress' | 'Completed';
}

export default function WorkOrdersPage() {
  const [workOrders, setWorkOrders] = useLocalStorage<WorkOrder[]>(
    'workOrders',
    mockWorkOrders
  );
  const [services] = useLocalStorage<Service[]>('services', mockServices);
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: string } | null>(null);
  const [formData, setFormData] = useState<WorkOrderFormData>({
    customerName: '',
    carModel: '',
    serviceType: services[0]?.name || '',
    scheduledDate: new Date().toISOString().split('T')[0],
    status: 'Pending',
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToast = (message: string, type: string = 'success') => {
    setToast({ message, type });
  };

  const filteredOrders = workOrders.filter((order) => {
    const matchesStatus = filterStatus === 'All' || order.status === filterStatus;
    const matchesSearch =
      order.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const stats = {
    total: workOrders.length,
    pending: workOrders.filter((o) => o.status === 'Pending').length,
    inProgress: workOrders.filter((o) => o.status === 'In Progress').length,
    completed: workOrders.filter((o) => o.status === 'Completed').length,
  };

  const handleAddWorkOrder = () => {
    if (
      !formData.customerName ||
      !formData.carModel ||
      !formData.serviceType ||
      !formData.scheduledDate
    ) {
      showToast('Please fill all fields', 'error');
      return;
    }

    if (editingId) {
      setWorkOrders(
        workOrders.map((o) =>
          o.id === editingId
            ? { ...o, ...formData }
            : o
        )
      );
      showToast('Work order updated!');
      setEditingId(null);
    } else {
      const newOrder: WorkOrder = {
        id: generateId(),
        orderId: `WO-${String(workOrders.length + 1).padStart(3, '0')}`,
        ...formData,
      };
      setWorkOrders([...workOrders, newOrder]);
      showToast('Work order created!');
    }

    setFormData({
      customerName: '',
      carModel: '',
      serviceType: services[0]?.name || '',
      scheduledDate: new Date().toISOString().split('T')[0],
      status: 'Pending',
    });
    setShowAddModal(false);
  };

  const handleUpdateStatus = (id: string, newStatus: WorkOrder['status']) => {
    setWorkOrders(
      workOrders.map((o) => (o.id === id ? { ...o, status: newStatus } : o))
    );
    showToast(`Status updated to ${newStatus}`);
    setShowDetailsModal(null);
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      Pending: 'bg-yellow-50 text-yellow-700',
      'In Progress': 'bg-blue-50 text-blue-700',
      Completed: 'bg-green-50 text-green-700',
    } as Record<string, string>;

    return (
      <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${styles[status] || ''}`}>
        {status}
      </span>
    );
  };

  const detailedOrder = workOrders.find((o) => o.id === showDetailsModal);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Work Orders</h1>
          <p className="text-gray-600 mt-1">Track and manage all customer jobs</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
        >
          <Plus size={20} />
          New Work Order
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-gray-600 text-sm uppercase">Total Orders</p>
          <h3 className="text-3xl font-bold text-gray-900 mt-2">{stats.total}</h3>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-gray-600 text-sm uppercase">Pending</p>
          <h3 className="text-3xl font-bold text-yellow-600 mt-2">{stats.pending}</h3>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-gray-600 text-sm uppercase">In Progress</p>
          <h3 className="text-3xl font-bold text-blue-600 mt-2">{stats.inProgress}</h3>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <p className="text-gray-600 text-sm uppercase">Completed</p>
          <h3 className="text-3xl font-bold text-green-600 mt-2">{stats.completed}</h3>
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-2 mb-6">
        {['All', 'Pending', 'In Progress', 'Completed'].map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filterStatus === status
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Filter by Order ID or Customer Name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                Order ID
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                Customer
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                Vehicle
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                Service
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                Status
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                Scheduled
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map((order) => (
              <tr key={order.id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 text-sm font-bold text-blue-600">{order.orderId}</td>
                <td className="px-6 py-4 text-sm text-gray-900">{order.customerName}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{order.carModel}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{order.serviceType}</td>
                <td className="px-6 py-4 text-sm">{getStatusBadge(order.status)}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{order.scheduledDate}</td>
                <td className="px-6 py-4 text-sm">
                  <button
                    onClick={() => setShowDetailsModal(order.id)}
                    className="flex items-center gap-1 text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    <Eye size={18} />
                    View Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">New Work Order</h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingId(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Customer Name
                </label>
                <input
                  type="text"
                  value={formData.customerName}
                  onChange={(e) =>
                    setFormData({ ...formData, customerName: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Car Model
                </label>
                <input
                  type="text"
                  value={formData.carModel}
                  onChange={(e) =>
                    setFormData({ ...formData, carModel: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Service Type
                </label>
                <select
                  value={formData.serviceType}
                  onChange={(e) =>
                    setFormData({ ...formData, serviceType: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                >
                  {services.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Scheduled Date
                </label>
                <input
                  type="date"
                  value={formData.scheduledDate}
                  onChange={(e) =>
                    setFormData({ ...formData, scheduledDate: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-3 p-6 border-t border-gray-200 justify-end">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingId(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleAddWorkOrder}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
              >
                Create Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && detailedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Order Details</h2>
              <button
                onClick={() => setShowDetailsModal(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <p className="text-sm text-gray-600">Order ID</p>
                <p className="font-semibold text-gray-900">{detailedOrder.orderId}</p>
              </div>

              <div>
                <p className="text-sm text-gray-600">Customer</p>
                <p className="font-semibold text-gray-900">{detailedOrder.customerName}</p>
              </div>

              <div>
                <p className="text-sm text-gray-600">Vehicle</p>
                <p className="font-semibold text-gray-900">{detailedOrder.carModel}</p>
              </div>

              <div>
                <p className="text-sm text-gray-600">Service</p>
                <p className="font-semibold text-gray-900">{detailedOrder.serviceType}</p>
              </div>

              <div>
                <p className="text-sm text-gray-600">Scheduled Date</p>
                <p className="font-semibold text-gray-900">{detailedOrder.scheduledDate}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Update Status
                </label>
                <select
                  value={detailedOrder.status}
                  onChange={(e) =>
                    handleUpdateStatus(
                      detailedOrder.id,
                      e.target.value as WorkOrder['status']
                    )
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                >
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 p-6 border-t border-gray-200 justify-end">
              <button
                onClick={() => setShowDetailsModal(null)}
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
