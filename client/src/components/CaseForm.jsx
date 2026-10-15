import React, { useState, useEffect } from 'react';
import { Search, Plus, Trash2, Scale, Calculator, ShieldCheck, AlertCircle } from 'lucide-react';

export default function CaseForm({ caseData, setCaseData, onCalculate, loading }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/offenses?q=${encodeURIComponent(searchQuery)}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data);
        }
      } catch (err) {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleChange = (field, value) => {
    setCaseData((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddOffense = (offense) => {
    const exists = (caseData.offenses || []).some(
      (o) => (o.code === offense.code || o.act === offense.code) && o.section === offense.section
    );
    if (!exists) {
      setCaseData((prev) => ({
        ...prev,
        offenses: [
          ...(prev.offenses || []),
          {
            section: offense.section,
            act: offense.code,
            code: offense.code,
            title: offense.title,
            maxSentenceMonths: offense.maxMonths ?? 0,
            maxMonths: offense.maxMonths ?? 0,
            isBailable: offense.isBailable,
            carriesLifeImprisonment: offense.isLife ?? false,
            isLife: offense.isLife ?? false,
            carriesDeathPenalty: offense.isDeath ?? false,
            isDeath: offense.isDeath ?? false
          }
        ]
      }));
    }
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleRemoveOffense = (index) => {
    setCaseData((prev) => ({
      ...prev,
      offenses: prev.offenses.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Case Information</h2>
          <p className="text-xs text-slate-500">Enter undertrial case details or load via FIR document upload</p>
        </div>
        <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
          <Scale className="w-5 h-5 text-indigo-600" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Accused Full Name</label>
          <input
            type="text"
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="e.g. Ramesh Kumar"
            value={caseData.accusedName || ''}
            onChange={(e) => handleChange('accusedName', e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">FIR Number</label>
          <input
            type="text"
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="e.g. 101/2026"
            value={caseData.firNumber || ''}
            onChange={(e) => handleChange('firNumber', e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Police Station</label>
          <input
            type="text"
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="e.g. Kotwali"
            value={caseData.policeStation || ''}
            onChange={(e) => handleChange('policeStation', e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">District & State</label>
          <input
            type="text"
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="e.g. Central, Delhi"
            value={caseData.district || ''}
            onChange={(e) => handleChange('district', e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Arrest Date *</label>
          <input
            type="date"
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={caseData.arrestDate || ''}
            onChange={(e) => handleChange('arrestDate', e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Remand Date</label>
          <input
            type="date"
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={caseData.remandDate || ''}
            onChange={(e) => handleChange('remandDate', e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Chargesheet Date</label>
          <input
            type="date"
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={caseData.chargesheetDate || ''}
            onChange={(e) => handleChange('chargesheetDate', e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-6 pt-2">
        <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
            checked={Boolean(caseData.isFirstTimeOffender)}
            onChange={(e) => handleChange('isFirstTimeOffender', e.target.checked)}
          />
          <span>First-time offender (1/3 threshold under § 479)</span>
        </label>

        <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
            checked={Boolean(caseData.hasMultipleCases)}
            onChange={(e) => handleChange('hasMultipleCases', e.target.checked)}
          />
          <span>Multiple pending cases (disqualifies § 479)</span>
        </label>

        <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
            checked={Boolean(caseData.chargesheetFiled)}
            onChange={(e) => handleChange('chargesheetFiled', e.target.checked)}
          />
          <span>Chargesheet filed</span>
        </label>
      </div>

      <div className="space-y-3 pt-3 border-t border-slate-100">
        <label className="block text-xs font-semibold text-slate-700">Add Charged Offenses (§ BNS / IPC)</label>
        <div className="relative">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Search section number or offense name (e.g., 303(2), theft, 420, cheating)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {searchResults.length > 0 && (
            <div className="absolute z-20 left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-white rounded-lg border border-slate-200 shadow-lg divide-y divide-slate-100">
              {searchResults.map((offense) => (
                <button
                  key={`${offense.code}-${offense.section}`}
                  type="button"
                  className="w-full text-left px-3 py-2 text-xs hover:bg-indigo-50 flex items-center justify-between transition-colors"
                  onClick={() => handleAddOffense(offense)}
                >
                  <div>
                    <span className="font-bold text-indigo-900 mr-2">
                      {offense.code} § {offense.section}
                    </span>
                    <span className="text-slate-700">{offense.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${offense.isBailable ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                      {offense.isBailable ? 'Bailable' : 'Non-Bailable'}
                    </span>
                    <Plus className="w-3.5 h-3.5 text-indigo-600" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2">
          {(caseData.offenses || []).length === 0 ? (
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>At least one offense must be added to evaluate bail eligibility.</span>
            </div>
          ) : (
            (caseData.offenses || []).map((o, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              >
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  <span className="font-bold text-slate-900">
                    {o.code || o.act} § {o.section}
                  </span>
                  <span className="text-slate-600">({o.title})</span>
                  <span className="text-[10px] text-slate-400">Max: {o.maxSentenceMonths || o.maxMonths}m</span>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                      o.isBailable ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {o.isBailable ? 'Bailable' : 'Non-Bailable'}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveOffense(idx)}
                    className="text-slate-400 hover:text-rose-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
        <button
          type="button"
          onClick={onCalculate}
          disabled={loading || (caseData.offenses || []).length === 0 || !caseData.arrestDate}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
        >
          <Calculator className="w-4 h-4" />
          <span>{loading ? 'Evaluating...' : 'Check Bail Eligibility'}</span>
        </button>
      </div>
    </div>
  );
}
