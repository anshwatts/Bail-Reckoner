import React, { useState } from 'react';
import { Scale, FileText, CheckCircle2, AlertTriangle, XCircle, FileSignature, ArrowRight } from 'lucide-react';
import CaseForm from './CaseForm.jsx';
import DocumentUpload from './DocumentUpload.jsx';
import Timeline from './Timeline.jsx';
import StatusBadge from './StatusBadge.jsx';
import PetitionView from './PetitionView.jsx';

export default function Dashboard() {
  const [caseData, setCaseData] = useState({
    accusedName: '',
    firNumber: '',
    policeStation: '',
    district: '',
    arrestDate: '',
    remandDate: '',
    chargesheetDate: '',
    isFirstTimeOffender: true,
    hasMultipleCases: false,
    chargesheetFiled: false,
    offenses: []
  });

  const [eligibilityResult, setEligibilityResult] = useState(null);
  const [evaluating, setEvaluating] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [petition, setPetition] = useState(null);
  const [drafting, setDrafting] = useState(false);

  const handleExtractionSuccess = ({ extractedData, matchedOffenses }) => {
    setCaseData((prev) => ({
      ...prev,
      accusedName: extractedData.accusedName || prev.accusedName,
      firNumber: extractedData.firNumber || prev.firNumber,
      policeStation: extractedData.policeStation || prev.policeStation,
      district: extractedData.district || prev.district,
      arrestDate: extractedData.arrestDate || prev.arrestDate,
      remandDate: extractedData.remandDate || prev.remandDate || extractedData.arrestDate,
      chargesheetDate: extractedData.chargesheetDate || prev.chargesheetDate,
      offenses: matchedOffenses?.length > 0 ? matchedOffenses : prev.offenses
    }));
  };

  const handleCalculate = async () => {
    setEvaluating(true);
    setErrorMsg(null);
    setPetition(null);

    const payload = {
      caseNumber: caseData.firNumber || 'UNASSIGNED',
      arrestDate: caseData.arrestDate,
      calculationDate: new Date().toISOString().split('T')[0],
      isFirstTimeOffender: Boolean(caseData.isFirstTimeOffender),
      hasMultipleCases: Boolean(caseData.hasMultipleCases),
      chargesheetFiled: Boolean(caseData.chargesheetFiled),
      chargesheetDate: caseData.chargesheetDate || null,
      offenses: (caseData.offenses || []).map((o) => ({
        section: o.section,
        act: o.act || o.code,
        code: o.code || o.act,
        isBailable: Boolean(o.isBailable),
        maxSentenceMonths: Number(o.maxSentenceMonths || o.maxMonths || 0),
        maxMonths: Number(o.maxMonths || o.maxSentenceMonths || 0),
        carriesLifeImprisonment: Boolean(o.carriesLifeImprisonment || o.isLife),
        isLife: Boolean(o.isLife || o.carriesLifeImprisonment),
        carriesDeathPenalty: Boolean(o.carriesDeathPenalty || o.isDeath),
        isDeath: Boolean(o.isDeath || o.carriesDeathPenalty)
      }))
    };

    try {
      const res = await fetch('/api/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to evaluate bail eligibility');
      }

      const result = await res.json();
      setEligibilityResult(result);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setEvaluating(false);
    }
  };

  const handleDraftPetition = async () => {
    if (!eligibilityResult) return;
    setDrafting(true);

    try {
      const payload = {
        caseData: {
          ...caseData,
          state: caseData.district?.split(',')[1]?.trim() || 'State'
        },
        eligibilityResult,
        courtDetails: {
          courtName: 'COURT OF CHIEF JUDICIAL MAGISTRATE',
          district: caseData.district?.split(',')[0]?.trim() || caseData.district || 'District',
          state: caseData.district?.split(',')[1]?.trim() || 'State'
        }
      };

      const res = await fetch('/api/petition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error('Failed to generate bail application petition');
      }

      const generated = await res.json();
      setPetition(generated);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setDrafting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-lg shadow-sm">
              <Scale className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Undertrial Bail Tracker</h1>
              <p className="text-xs text-slate-400">Statutory Relief Engine • BNSS 2023 & CrPC 1973</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-950 text-indigo-300 border border-indigo-800">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Offline Statutory Engine</span>
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {errorMsg && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-sm flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <p>{errorMsg}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-6 space-y-6">
            <DocumentUpload onExtractionSuccess={handleExtractionSuccess} />
            <CaseForm
              caseData={caseData}
              setCaseData={setCaseData}
              onCalculate={handleCalculate}
              loading={evaluating}
            />
          </div>

          <div className="lg:col-span-6 space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Bail Eligibility Determination</h2>
                  <p className="text-xs text-slate-500">Statutory analysis based on judicial standards</p>
                </div>
                <StatusBadge result={eligibilityResult} />
              </div>

              <Timeline result={eligibilityResult} />

              {eligibilityResult && (
                <div className="space-y-3 pt-2">
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-2">
                    <div className="flex items-center justify-between font-bold text-slate-900">
                      <span>Grounds Assessment</span>
                      <span className={eligibilityResult.isEligibleForBail ? 'text-emerald-700' : 'text-slate-600'}>
                        {eligibilityResult.isEligibleForBail ? 'Bail Available' : 'No Statutory Grounds'}
                      </span>
                    </div>

                    <div className="space-y-1 text-slate-700">
                      <div className="flex items-center gap-2">
                        {eligibilityResult.bailable?.isBailableAsOfRight ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        )}
                        <span>{eligibilityResult.bailable?.details}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {eligibilityResult.section479?.eligible ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        )}
                        <span>{eligibilityResult.section479?.details}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {eligibilityResult.defaultBail?.eligible ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        )}
                        <span>{eligibilityResult.defaultBail?.details}</span>
                      </div>
                    </div>
                  </div>

                  {eligibilityResult.isEligibleForBail && (
                    <button
                      type="button"
                      onClick={handleDraftPetition}
                      disabled={drafting}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-lg shadow-sm transition-colors"
                    >
                      <FileSignature className="w-4 h-4" />
                      <span>{drafting ? 'Drafting Application...' : 'Draft Court-Ready Bail Application'}</span>
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {petition && <PetitionView petition={petition} />}
          </div>
        </div>
      </main>
    </div>
  );
}
