'use client';

import { useState } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Service } from '@/types';
import { mockServices } from '@/lib/mockData';
import { generateId, formatCurrency } from '@/lib/utils';
import { Pencil, Trash2, Plus, X } from 'lucide-react';
import { useEffect } from 'react';

interface ServiceFormData {
  name: string;
  price: number;
  estimatedTime: number;
}

export default function ServicesPage() {
  const [services, setServices] = useLocalStorage<Service[]>('services', mockServices);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: string } | null>(null);
  const [formData, setFormData] = useState<ServiceFormData>({
    name: '',
    price: 0,
    estimatedTime: 0,
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

  const filteredServices = services.filter((service) =>
    service.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddService = () => {
    if (!formData.name || formData.price <= 0 || formData.estimatedTime <= 0) {
      showToast('Please fill all fields with valid values', 'error');
      return;
    }

    if (editingId) {
      setServices(
        services.map((s) =>
          s.id === editingId
            ? { ...s, ...formData }
            : s
        )
      );
      showToast('Service updated successfully!');
      setEditingId(null);
    } else {
      const newService: Service = {
        id: generateId(),
        ...formData,
      };
      setServices([...services, newService]);
      showToast('Service added successfully!');
    }

    setFormData({ name: '', price: 0, estimatedTime: 0 });
    setShowAddModal(false);
  };

  const handleEdit = (service: Service) => {
    setFormData({
      name: service.name,
      price: service.price,
      estimatedTime: service.estimatedTime,
    });
    setEditingId(service.id);
    setShowAddModal(true);
  };

  const handleDelete = (id: string) => {
    setServices(services.filter((s) => s.id !== id));
    setShowDeleteConfirm(null);
    showToast('Service deleted successfully!');
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setEditingId(null);
    setFormData({ name: '', price: 0, estimatedTime: 0 });
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Services</h1>
          <p className="text-gray-600 mt-1">Manage your service price list and operational catalog</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
        >
          <Plus size={20} />
          Add New Service
        </button>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search services by name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Services Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                Service Name
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                Price
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                Est. Time
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredServices.map((service) => (
              <tr key={service.id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                  {service.name}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {formatCurrency(service.price)}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {service.estimatedTime} min
                </td>
                <td className="px-6 py-4 text-sm">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleEdit(service)}
                      className="text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      <Pencil size={18} />
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(service.id)}
                      className="text-red-600 hover:text-red-800 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
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
              <h2 className="text-xl font-bold text-gray-900">
                {editingId ? 'Edit Service' : 'Add New Service'}
              </h2>
              <button onClick={handleCloseModal} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Service Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Price (₹)
                </label>
                <input
                  type="number"
                  value={formData.price || ''}
                  onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estimated Time (minutes)
                </label>
                <input
                  type="number"
                  value={formData.estimatedTime || ''}
                  onChange={(e) => setFormData({ ...formData, estimatedTime: Number(e.target.value) })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-3 p-6 border-t border-gray-200 justify-end">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleAddService}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
              >
                {editingId ? 'Update Service' : 'Add Service'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full mx-4">
            <div className="p-6">
              <h2 className="text-lg font-bold text-gray-900">Delete Service?</h2>
              <p className="text-gray-600 text-sm mt-2">
                Are you sure you want to delete this service? This action cannot be undone.
              </p>
            </div>

            <div className="flex gap-3 p-6 border-t border-gray-200 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(showDeleteConfirm)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium"
              >
                Delete
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
