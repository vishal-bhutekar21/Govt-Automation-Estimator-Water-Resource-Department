import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { CalculationModal } from '../../../components/common/CalculationModal';
import {
  MeasurementGroup,
  MeasurementItem,
  MeasurementDeduction,
  ValuationCase,
  CalculationType,
} from '../../../types';
import {
  Ruler,
  Plus,
  Trash2,
  HelpCircle,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  ArrowLeft,
  MinusCircle,
} from 'lucide-react';

interface MeasurementStepProps {
  caseData: ValuationCase;
  onPrev: () => void;
  onNext: () => void;
}

export const MeasurementStep: React.FC<MeasurementStepProps> = ({ caseData, onPrev, onNext }) => {
  const [groups, setGroups] = useState<MeasurementGroup[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [activeDeductionItem, setActiveDeductionItem] = useState<string | null>(null);

  // New Group Modal State
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [newGroupTitle, setNewGroupTitle] = useState('');
  const [newGroupUnit, setNewGroupUnit] = useState('Cum');

  // New Line Item State for a specific group
  const [activeAddLineGroup, setActiveAddLineGroup] = useState<string | null>(null);
  const [newLineDesc, setNewLineDesc] = useState('');
  const [newLineType, setNewLineType] = useState<CalculationType>('VOLUME');
  const [newLineNo, setNewLineNo] = useState<number>(1);
  const [newLineL, setNewLineL] = useState<number>(0);
  const [newLineB, setNewLineB] = useState<number>(0);
  const [newLineD, setNewLineD] = useState<number>(0);

  // New Deduction State
  const [newDedCode, setNewDedCode] = useState('D1');
  const [newDedDesc, setNewDedDesc] = useState('Door Opening');
  const [newDedNo, setNewDedNo] = useState<number>(1);
  const [newDedL, setNewDedL] = useState<number>(0.90);
  const [newDedB, setNewDedB] = useState<number>(0.23);
  const [newDedH, setNewDedH] = useState<number>(2.10);

  // Calculation Modal State
  const [calcModalData, setCalcModalData] = useState<any | null>(null);

  const fetchMeasurements = async () => {
    try {
      setIsLoading(true);
      const res = await api.get<{ groups: MeasurementGroup[] }>(`/v1/cases/${caseData.id}/measurements`);
      setGroups(res.data.groups);

      // Expand first 3 groups by default
      const initialExpanded: Record<string, boolean> = {};
      res.data.groups.slice(0, 3).forEach((g) => {
        initialExpanded[g.id] = true;
      });
      setExpandedGroups(initialExpanded);
    } catch (err) {
      console.error('Failed to fetch measurements:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMeasurements();
  }, [caseData.id]);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  // Add Measurement Line
  const handleAddMeasurementItem = async (groupId: string) => {
    if (!newLineDesc) return;
    try {
      await api.post(`/v1/cases/${caseData.id}/measurements/items`, {
        groupId,
        description: newLineDesc,
        calculationType: newLineType,
        numberCount: newLineNo,
        length: newLineL,
        breadth: newLineB,
        depthOrHeight: newLineD,
      });

      setNewLineDesc('');
      setNewLineNo(1);
      setNewLineL(0);
      setNewLineB(0);
      setNewLineD(0);
      setActiveAddLineGroup(null);

      fetchMeasurements();
    } catch (err) {
      console.error('Failed to add measurement item:', err);
    }
  };

  // Delete Measurement Line
  const handleDeleteMeasurementItem = async (itemId: string) => {
    try {
      await api.delete(`/v1/cases/measurements/items/${itemId}`);
      fetchMeasurements();
    } catch (err) {
      console.error('Failed to delete item:', err);
    }
  };

  // Add Deduction
  const handleAddDeduction = async (itemId: string) => {
    try {
      await api.post(`/v1/cases/measurements/items/${itemId}/deductions`, {
        code: newDedCode,
        description: newDedDesc,
        numberCount: newDedNo,
        length: newDedL,
        breadth: newDedB,
        depthOrHeight: newDedH,
      });

      setActiveDeductionItem(null);
      fetchMeasurements();
    } catch (err) {
      console.error('Failed to add deduction:', err);
    }
  };

  // Delete Deduction
  const handleDeleteDeduction = async (deductionId: string) => {
    try {
      await api.delete(`/v1/cases/measurements/deductions/${deductionId}`);
      fetchMeasurements();
    } catch (err) {
      console.error('Failed to delete deduction:', err);
    }
  };

  // Create Measurement Group
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupTitle) return;
    try {
      await api.post(`/v1/cases/${caseData.id}/measurements/groups`, {
        title: newGroupTitle,
        unit: newGroupUnit,
      });
      setNewGroupTitle('');
      setIsGroupModalOpen(false);
      fetchMeasurements();
    } catch (err) {
      console.error('Failed to create group:', err);
    }
  };

  // Explainability Breakdown
  const handleExplainItem = (item: MeasurementItem, groupTitle: string) => {
    const inputs: Record<string, number | string> = {
      Number: item.numberCount,
      'Length (m)': item.length,
      'Breadth (m)': item.breadth,
      'Depth/Ht (m)': item.depthOrHeight,
    };

    const deductionsBreakdown = item.deductions.map((d) => ({
      code: d.code,
      description: d.description,
      qty: d.deductionQuantity,
      formula: `${d.numberCount} × ${d.length} × ${d.breadth} × ${d.depthOrHeight} = ${d.deductionQuantity} ${item.unit}`,
    }));

    let formulaText = '';
    if (item.calculationType === 'VOLUME') {
      formulaText = `Gross = ${item.numberCount} × ${item.length}m × ${item.breadth}m × ${item.depthOrHeight}m = ${item.grossQuantity} ${item.unit}`;
    } else if (item.calculationType === 'AREA') {
      formulaText = `Gross = ${item.numberCount} × ${item.length}m × ${item.depthOrHeight || item.breadth}m = ${item.grossQuantity} ${item.unit}`;
    } else if (item.calculationType === 'RUNNING_LENGTH') {
      formulaText = `Gross = ${item.numberCount} × ${item.length}m = ${item.grossQuantity} ${item.unit}`;
    } else {
      formulaText = `Gross = ${item.numberCount} No. = ${item.grossQuantity} ${item.unit}`;
    }

    if (item.deductions.length > 0) {
      formulaText += `\nNet = Gross (${item.grossQuantity}) - Deductions (${item.deductionQuantity}) = ${item.netQuantity} ${item.unit}`;
    }

    setCalcModalData({
      title: `Measurement Calculation: ${item.description}`,
      itemDescription: `Group: ${groupTitle}`,
      formulaType: item.calculationType,
      inputs,
      deductions: deductionsBreakdown,
      formulaText,
      result: item.netQuantity,
      unit: item.unit,
      notes: 'Authoritative server-side evaluation with 2 decimal precision (ROUND_HALF_UP).',
    });
  };

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <span className="text-xs font-bold text-gov-navy uppercase tracking-wider">
            Step 4 of 10 • Valuation Workflow
          </span>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Detailed Measurement Sheets & Deductions
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setIsGroupModalOpen(true)}
          >
            Add Work Item Group
          </Button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-gov-md bg-white border border-slate-200/80 shadow-soft-xs">
          <div className="text-[10px] font-bold text-slate-500 uppercase">Work Item Groups</div>
          <div className="text-xl font-bold text-gov-navy">{groups.length} Items</div>
        </div>

        <div className="p-3.5 rounded-gov-md bg-white border border-slate-200/80 shadow-soft-xs">
          <div className="text-[10px] font-bold text-slate-500 uppercase">Foundation Excavation</div>
          <div className="text-xl font-bold text-gov-teal font-mono">
            {groups.find((g) => g.itemNumber === 1)?.totalQuantity ?? 12.20} Cum
          </div>
        </div>

        <div className="p-3.5 rounded-gov-md bg-white border border-slate-200/80 shadow-soft-xs">
          <div className="text-[10px] font-bold text-slate-500 uppercase">Superstructure Masonry</div>
          <div className="text-xl font-bold text-gov-navy font-mono">
            {groups.find((g) => g.itemNumber === 5)?.totalQuantity ?? 7.94} Cum
          </div>
        </div>

        <div className="p-3.5 rounded-gov-md bg-white border border-slate-200/80 shadow-soft-xs">
          <div className="text-[10px] font-bold text-slate-500 uppercase">Roofing CGI Cover</div>
          <div className="text-xl font-bold text-slate-900 font-mono">
            {groups.find((g) => g.itemNumber === 10)?.totalQuantity ?? 73.01} Sqm
          </div>
        </div>
      </div>

      {/* Measurement Groups Accordion */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="py-12 text-center text-slate-400 text-xs animate-pulse">
            Loading measurement dimensions and deductions...
          </div>
        ) : groups.length ? (
          groups.map((group) => {
            const isExpanded = !!expandedGroups[group.id];

            return (
              <Card key={group.id} className="p-0 overflow-hidden border-slate-200 shadow-soft-xs">
                {/* Group Accordion Header */}
                <div
                  onClick={() => toggleGroup(group.id)}
                  className="p-4 bg-slate-50/90 hover:bg-slate-100/80 transition-colors flex items-center justify-between cursor-pointer border-b border-slate-200 select-none"
                >
                  <div className="flex items-center gap-3">
                    <button className="text-slate-400 hover:text-slate-600">
                      {isExpanded ? <ChevronDown className="w-4 h-4 text-gov-navy" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-gov-navy-50 text-gov-navy border border-gov-navy-200">
                      Item {group.itemNumber}
                    </span>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900">{group.title}</h3>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 font-mono text-xs bg-white px-3 py-1 rounded-gov-md border border-slate-200 shadow-inner">
                      <span className="text-slate-500 font-sans text-[11px]">Net Qty:</span>
                      <strong className="text-gov-teal font-extrabold text-sm">{group.totalQuantity}</strong>
                      <span className="text-slate-500 text-[11px] font-sans">{group.unit}</span>
                    </div>
                  </div>
                </div>

                {/* Expanded Content with Guaranteed Width and No Element Clipping */}
                {isExpanded && (
                  <div className="p-4 space-y-4 bg-white">
                    <div className="overflow-x-auto scrollbar-thin">
                      <table className="w-full text-left border-collapse text-xs min-w-[860px]">
                        <thead>
                          <tr className="gov-table-header">
                            <th className="py-2.5 px-3 w-12 text-center">Sub</th>
                            <th className="py-2.5 px-4 min-w-[200px]">Description of Part</th>
                            <th className="py-2.5 px-3 w-28">Type</th>
                            <th className="py-2.5 px-3 w-14 text-center">No.</th>
                            <th className="py-2.5 px-3 w-20 text-center">Length (m)</th>
                            <th className="py-2.5 px-3 w-20 text-center">Breadth (m)</th>
                            <th className="py-2.5 px-3 w-20 text-center">Depth/Ht (m)</th>
                            <th className="py-2.5 px-3 w-24 text-right">Gross Qty</th>
                            <th className="py-2.5 px-3 w-24 text-right">Deduction</th>
                            <th className="py-2.5 px-3 w-24 text-right">Net Qty</th>
                            <th className="py-2.5 px-3 w-28 text-center">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {group.items.map((item) => (
                            <React.Fragment key={item.id}>
                              <tr className="gov-table-row">
                                <td className="py-2.5 px-3 font-mono font-bold text-slate-500 text-center">
                                  {item.itemSubSequence})
                                </td>
                                <td className="py-2.5 px-4 font-medium text-slate-900">
                                  {item.description}
                                </td>
                                <td className="py-2.5 px-3">
                                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                                    {item.calculationType}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-center font-mono font-semibold text-slate-800">
                                  {item.numberCount}
                                </td>
                                <td className="py-2.5 px-3 text-center font-mono text-slate-700">
                                  {item.length ? item.length.toFixed(2) : '-'}
                                </td>
                                <td className="py-2.5 px-3 text-center font-mono text-slate-700">
                                  {item.breadth ? item.breadth.toFixed(2) : '-'}
                                </td>
                                <td className="py-2.5 px-3 text-center font-mono text-slate-700">
                                  {item.depthOrHeight ? item.depthOrHeight.toFixed(2) : '-'}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                                  {item.grossQuantity}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono">
                                  {item.deductionQuantity > 0 ? (
                                    <span className="text-rose-600 font-bold">- {item.deductionQuantity}</span>
                                  ) : (
                                    <span className="text-slate-300">-</span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono font-bold text-gov-teal">
                                  {item.netQuantity} {item.unit}
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => handleExplainItem(item, group.title)}
                                      className="p-1 rounded text-gov-navy hover:bg-gov-navy-50"
                                      title="View Formula Derivation"
                                    >
                                      <HelpCircle className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setActiveDeductionItem(activeDeductionItem === item.id ? null : item.id)}
                                      className="p-1 rounded text-gov-teal hover:bg-gov-teal-50"
                                      title="Add/View Deductions"
                                    >
                                      <MinusCircle className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteMeasurementItem(item.id)}
                                      className="p-1 rounded text-rose-500 hover:bg-rose-50"
                                      title="Delete Measurement Line"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>

                              {/* Deductions Nested Sub-View */}
                              {item.deductions.length > 0 && (
                                <tr className="bg-rose-50/20 border-b border-rose-100">
                                  <td colSpan={11} className="py-2 px-8">
                                    <div className="space-y-1.5">
                                      <div className="text-[10px] font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1">
                                        <span>Deductions Applied ({item.deductions.length})</span>
                                      </div>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                                        {item.deductions.map((d) => (
                                          <div
                                            key={d.id}
                                            className="p-2 rounded bg-white border border-rose-200 flex items-center justify-between text-[11px]"
                                          >
                                            <div>
                                              <span className="font-bold text-rose-700">{d.code}: </span>
                                              <span className="text-slate-600">{d.description}</span>
                                              <div className="font-mono text-slate-500 text-[10px]">
                                                {d.numberCount} × {d.length} × {d.breadth} × {d.depthOrHeight} = <strong>{d.deductionQuantity}</strong> {d.unit}
                                              </div>
                                            </div>
                                            <button
                                              type="button"
                                              onClick={() => handleDeleteDeduction(d.id)}
                                              className="text-rose-400 hover:text-rose-600 p-1"
                                              title="Remove Deduction"
                                            >
                                              <Trash2 className="w-3 h-3" />
                                            </button>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}

                              {/* Add Deduction Inline Form */}
                              {activeDeductionItem === item.id && (
                                <tr className="bg-slate-50 border-b border-slate-200">
                                  <td colSpan={11} className="p-3">
                                    <div className="space-y-2 max-w-2xl bg-white p-3 rounded-gov-md border border-slate-200">
                                      <div className="font-bold text-slate-800 text-xs">
                                        Add Opening Deduction to: {item.description}
                                      </div>
                                      <div className="grid grid-cols-6 gap-2 text-xs">
                                        <input
                                          type="text"
                                          placeholder="Code (e.g. D1, W1)"
                                          value={newDedCode}
                                          onChange={(e) => setNewDedCode(e.target.value)}
                                          className="px-2 py-1 border rounded"
                                        />
                                        <input
                                          type="text"
                                          placeholder="Description"
                                          value={newDedDesc}
                                          onChange={(e) => setNewDedDesc(e.target.value)}
                                          className="px-2 py-1 border rounded col-span-2"
                                        />
                                        <input
                                          type="number"
                                          placeholder="No."
                                          value={newDedNo}
                                          onChange={(e) => setNewDedNo(Number(e.target.value))}
                                          className="px-2 py-1 border rounded"
                                        />
                                        <input
                                          type="number"
                                          step="0.01"
                                          placeholder="L"
                                          value={newDedL}
                                          onChange={(e) => setNewDedL(Number(e.target.value))}
                                          className="px-2 py-1 border rounded"
                                        />
                                        <input
                                          type="number"
                                          step="0.01"
                                          placeholder="H/D"
                                          value={newDedH}
                                          onChange={(e) => setNewDedH(Number(e.target.value))}
                                          className="px-2 py-1 border rounded"
                                        />
                                      </div>
                                      <div className="flex justify-end gap-2 pt-1">
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => setActiveDeductionItem(null)}
                                        >
                                          Cancel
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="secondary"
                                          onClick={() => handleAddDeduction(item.id)}
                                        >
                                          Confirm Deduction
                                        </Button>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Add Line Form or Button */}
                    {activeAddLineGroup === group.id ? (
                      <div className="p-3.5 rounded-gov-md bg-slate-50 border border-slate-200 space-y-3">
                        <div className="font-bold text-slate-800 text-xs uppercase">
                          New Measurement Line for {group.title}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-6 gap-2 text-xs">
                          <input
                            type="text"
                            placeholder="Description of Part"
                            value={newLineDesc}
                            onChange={(e) => setNewLineDesc(e.target.value)}
                            className="px-2.5 py-1.5 border rounded col-span-2"
                          />
                          <select
                            value={newLineType}
                            onChange={(e) => setNewLineType(e.target.value as CalculationType)}
                            className="px-2.5 py-1.5 border rounded bg-white"
                          >
                            <option value="VOLUME">Volume (L×B×D)</option>
                            <option value="AREA">Area (L×D)</option>
                            <option value="RUNNING_LENGTH">Length (L)</option>
                            <option value="COUNT">Count (No.)</option>
                          </select>
                          <input
                            type="number"
                            placeholder="No."
                            value={newLineNo}
                            onChange={(e) => setNewLineNo(Number(e.target.value))}
                            className="px-2.5 py-1.5 border rounded"
                          />
                          <input
                            type="number"
                            step="0.01"
                            placeholder="Length (m)"
                            value={newLineL}
                            onChange={(e) => setNewLineL(Number(e.target.value))}
                            className="px-2.5 py-1.5 border rounded"
                          />
                          <input
                            type="number"
                            step="0.01"
                            placeholder="Breadth (m)"
                            value={newLineB}
                            onChange={(e) => setNewLineB(Number(e.target.value))}
                            className="px-2.5 py-1.5 border rounded"
                          />
                          <input
                            type="number"
                            step="0.01"
                            placeholder="Depth/Ht (m)"
                            value={newLineD}
                            onChange={(e) => setNewLineD(Number(e.target.value))}
                            className="px-2.5 py-1.5 border rounded"
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => setActiveAddLineGroup(null)}>
                            Cancel
                          </Button>
                          <Button size="sm" variant="primary" onClick={() => handleAddMeasurementItem(group.id)}>
                            Save Measurement Line
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        leftIcon={<Plus className="w-3.5 h-3.5" />}
                        onClick={() => setActiveAddLineGroup(group.id)}
                      >
                        Add Measurement Line to Item {group.itemNumber}
                      </Button>
                    )}
                  </div>
                )}
              </Card>
            );
          })
        ) : (
          <div className="py-12 text-center text-slate-400">No measurement items created yet.</div>
        )}
      </div>

      {/* New Group Modal */}
      {isGroupModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-gov-lg max-w-md w-full p-6 space-y-4 shadow-soft-lg border border-slate-200">
            <h3 className="text-base font-bold text-slate-900">Create New Measurement Group</h3>
            <form onSubmit={handleCreateGroup} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Item Title / Particulars *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Uncoursed Rubble Masonry in foundation"
                  value={newGroupTitle}
                  onChange={(e) => setNewGroupTitle(e.target.value)}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Unit of Measurement *</label>
                <select
                  value={newGroupUnit}
                  onChange={(e) => setNewGroupUnit(e.target.value)}
                  className="w-full px-3 py-2 border rounded bg-white"
                >
                  <option value="Cum">Cum (Cubic Metre)</option>
                  <option value="Sqm">Sqm (Square Metre)</option>
                  <option value="Rmt">Rmt (Running Metre)</option>
                  <option value="No.">No. (Number/Count)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" size="sm" variant="outline" onClick={() => setIsGroupModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" variant="primary">
                  Create Group
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Explainability Popup Modal */}
      {calcModalData && (
        <CalculationModal
          isOpen={!!calcModalData}
          onClose={() => setCalcModalData(null)}
          {...calcModalData}
        />
      )}

      {/* Action Toolbar */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
        <Button type="button" variant="outline" size="md" onClick={onPrev} leftIcon={<ArrowLeft className="w-4 h-4" />}>
          Back to Structure Details
        </Button>

        <Button type="button" variant="primary" size="md" onClick={onNext} rightIcon={<ArrowRight className="w-4 h-4" />}>
          Save & Proceed to Abstract Estimate (Step 5)
        </Button>
      </div>
    </div>
  );
};
