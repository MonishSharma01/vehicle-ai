'use client';

import { ChargesConfig } from '@/types';
import { useState } from 'react';
import { X } from 'lucide-react';

interface SetChargesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (charges: ChargesConfig) => void;
  initialCharges: ChargesConfig;
}

export default function SetChargesModal({
  isOpen,
  onClose,
  onSave,
  initialCharges,
}: SetChargesModalProps) {
  const [charges, setCharges] = useState(initialCharges);

  if (!isOpen) return null;

  const handleChange = (key: keyof ChargesConfig, value: any) => {
    setCharges((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSave = () => {
    onSave(charges);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Set Service Charges</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Basic Service */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Basic Service
            </label>
            <input
              type="number"
              value={charges.basicService}
              onChange={(e) => handleChange('basicService', Number(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Engine Fuel Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Engine Fuel Min (₹)
              </label>
              <input
                type="number"
                value={charges.engineFuelRangeMin}
                onChange={(e) => handleChange('engineFuelRangeMin', Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Engine Fuel Max (₹)
              </label>
              <input
                type="number"
                value={charges.engineFuelRangeMax}
                onChange={(e) => handleChange('engineFuelRangeMax', Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Coolant */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Coolant Min (₹)
              </label>
              <input
                type="number"
                value={charges.coolantMin}
                onChange={(e) => handleChange('coolantMin', Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Coolant Max (₹)
              </label>
              <input
                type="number"
                value={charges.coolantMax}
                onChange={(e) => handleChange('coolantMax', Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Battery Exchange */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Battery Exchange Min (₹)
              </label>
              <input
                type="number"
                value={charges.batteryExchangeMin}
                onChange={(e) => handleChange('batteryExchangeMin', Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Battery Exchange Max (₹)
              </label>
              <input
                type="number"
                value={charges.batteryExchangeMax}
                onChange={(e) => handleChange('batteryExchangeMax', Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Tires Normal */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tyres Normal Min (₹)
              </label>
              <input
                type="number"
                value={charges.tyresNormalMin}
                onChange={(e) => handleChange('tyresNormalMin', Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tyres Normal Max (₹)
              </label>
              <input
                type="number"
                value={charges.tyresNormalMax}
                onChange={(e) => handleChange('tyresNormalMax', Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Tires New */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tyres New (₹)
            </label>
            <input
              type="number"
              value={charges.tyresNew}
              onChange={(e) => handleChange('tyresNew', Number(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Car Damage */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Car Damage (Description)
            </label>
            <textarea
              value={charges.carDamage}
              onChange={(e) => handleChange('carDamage', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 resize-none"
              rows={3}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-gray-200 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
