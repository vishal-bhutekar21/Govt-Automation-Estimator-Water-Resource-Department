import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { RateItem, RateSchedule } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { BookOpenCheck, Plus, Search, Filter, Edit, CheckCircle2, Building } from 'lucide-react';

export const RateManagementView: React.FC = () => {
  const { isAdmin } = useAuth();
  const [rates, setRates] = useState<RateItem[]>([]);
  const [schedules, setSchedules] = useState<RateSchedule[]>([]);
  const [search, setSearch] = useState('');
  const [unitFilter, setUnitFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Edit / Add Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<RateItem | null>(null);
  const [itemCode, setItemCode] = useState('');
  const [itemNumber, setItemNumber] = useState('');
  const [description, setDescription] = useState('');
  const [unit, setUnit] = useState('Cum');
  const [rateValue, setRateValue] = useState<number>(0);
  const [scheduleYear, setScheduleYear] = useState('2014-15');
  const [referenceSource, setReferenceSource] = useState('');

  const fetchRates = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('q', search);
      if (unitFilter) params.append('unit', unitFilter);

      const res = await api.get<{ rates: RateItem[] }>(`/v1/rates?${params.toString()}`);
      setRates(res.data.rates);
    } catch (err) {
      console.error('Failed to fetch rates:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSchedules = async () => {
    try {
      const res = await api.get<{ schedules: RateSchedule[] }>('/v1/rates/schedules');
      setSchedules(res.data.schedules);
    } catch (err) {
      console.error('Failed to fetch schedules:', err);
    }
  };

  useEffect(() => {
    fetchRates();
    fetchSchedules();
  }, [unitFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchRates();
  };

  const openAddModal = () => {
    setEditingRate(null);
    setItemCode(`PWD-CSR-${rates.length + 1}`);
    setItemNumber(`Item ${rates.length + 1}`);
    setDescription('');
    setUnit('Cum');
    setRateValue(0);
    setScheduleYear('2014-15');
    setReferenceSource('PWD CSR 2014-15');
    setIsModalOpen(true);
  };

  const openEditModal = (item: RateItem) => {
    setEditingRate(item);
    setItemCode(item.itemCode);
    setItemNumber(item.itemNumber);
    setDescription(item.description);
    setUnit(item.unit);
    setRateValue(item.rate);
    setScheduleYear(item.scheduleYear);
    setReferenceSource(item.referenceSource);
    setIsModalOpen(true);
  };

  const handleSaveRate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingRate) {
        await api.put(`/v1/rates/${editingRate.id}`, {
          description,
          unit,
          rate: rateValue,
          referenceSource,
        });
      } else {
        await api.post('/v1/rates', {
          itemCode,
          itemNumber,
          description,
          unit,
          rate: rateValue,
          scheduleYear,
          referenceSource,
        });
      }
      setIsModalOpen(false);
      fetchRates();
    } catch (err) {
      console.error('Failed to save rate:', err);
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <div className="text-xs font-bold text-gov-navy uppercase tracking-wider">
            Public Works & Irrigation Schedule of Rates (CSR)
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            PWD / WRD Rate Database
          </h1>
        </div>
        {isAdmin && (
          <Button
            variant="primary"
            size="md"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={openAddModal}
          >
            Add New CSR Rate Item
          </Button>
        )}
      </div>

      {/* Filter Bar */}
      <Card className="p-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by code, description (e.g. teak, masonry, plaster, excavation)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs border rounded-gov-md focus:ring-2 focus:ring-gov-navy outline-none"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <select
              value={unitFilter}
              onChange={(e) => setUnitFilter(e.target.value)}
              className="px-3 py-2 rounded-gov-md border border-slate-300 text-xs focus:ring-2 focus:ring-gov-navy outline-none bg-white"
            >
              <option value="">All Units</option>
              <option value="Cum">Cum</option>
              <option value="Sqm">Sqm</option>
              <option value="Rmt">Rmt</option>
              <option value="No.">No.</option>
            </select>

            <Button type="submit" variant="secondary" size="sm">
              Search
            </Button>
          </div>
        </form>
      </Card>

      {/* Rates Table */}
      <Card className="p-0 overflow-hidden shadow-soft-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="gov-table-header">
                <th className="py-3 px-4 text-center">Item No.</th>
                <th className="py-3 px-4">CSR Code</th>
                <th className="py-3 px-6">Description of Construction Item</th>
                <th className="py-3 px-3 text-center">Unit</th>
                <th className="py-3 px-4 text-right">Approved Rate (₹)</th>
                <th className="py-3 px-4">Schedule / Source</th>
                {isAdmin && <th className="py-3 px-4 text-center">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Loading rate catalog...
                  </td>
                </tr>
              ) : rates.length ? (
                rates.map((r) => (
                  <tr key={r.id} className="gov-table-row">
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-gov-navy">
                      {r.itemNumber}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-500">
                      {r.itemCode}
                    </td>
                    <td className="py-3.5 px-6">
                      <div className="font-semibold text-slate-900 leading-snug">{r.description}</div>
                    </td>
                    <td className="py-3.5 px-3 text-center font-semibold">
                      <Badge variant="teal">{r.unit}</Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-gov-navy text-sm">
                      ₹ {r.rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                      {r.referenceSource}
                    </td>
                    {isAdmin && (
                      <td className="py-3.5 px-4 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(r)}
                          leftIcon={<Edit className="w-3.5 h-3.5" />}
                        >
                          Edit
                        </Button>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No rate items found matching the search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add / Edit Rate Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-gov-lg max-w-lg w-full p-6 space-y-4 shadow-soft-lg border border-slate-200">
            <h3 className="text-base font-bold text-slate-900">
              {editingRate ? `Edit Rate Item: ${editingRate.itemNumber}` : 'Add New Approved CSR Rate Item'}
            </h3>

            <form onSubmit={handleSaveRate} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase">Item Code *</label>
                  <input
                    type="text"
                    required
                    disabled={!!editingRate}
                    value={itemCode}
                    onChange={(e) => setItemCode(e.target.value)}
                    className="w-full px-3 py-2 border rounded font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase">Item Number *</label>
                  <input
                    type="text"
                    required
                    disabled={!!editingRate}
                    value={itemNumber}
                    onChange={(e) => setItemNumber(e.target.value)}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 uppercase">Description *</label>
                <textarea
                  rows={2}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase">Unit of Measurement *</label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full px-3 py-2 border rounded bg-white"
                  >
                    <option value="Cum">Cum</option>
                    <option value="Sqm">Sqm</option>
                    <option value="Rmt">Rmt</option>
                    <option value="No.">No.</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase">Approved Rate (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={rateValue}
                    onChange={(e) => setRateValue(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded font-mono font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 uppercase">Reference Schedule & Page *</label>
                <input
                  type="text"
                  required
                  value={referenceSource}
                  onChange={(e) => setReferenceSource(e.target.value)}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button type="button" size="sm" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" variant="primary">
                  Save Rate Item
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
