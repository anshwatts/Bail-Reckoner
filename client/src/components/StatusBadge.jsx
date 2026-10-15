import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, ShieldAlert } from 'lucide-react';

export default function StatusBadge({ result }) {
  if (!result) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-300">
        <span>Awaiting Calculation</span>
      </div>
    );
  }

  const isSec479 = Boolean(result.section479?.eligible);
  const isBailableRight = Boolean(result.bailable?.isBailableAsOfRight);
  const isDisqualified = Boolean(
    result.section479?.isDisqualified || result.flags?.carriesCapitalOrLifeOffense
  );
  const isDefaultBail = Boolean(result.defaultBail?.eligible);
  const hasMultipleCases = Boolean(result.flags?.hasMultipleCases);

  if (isDisqualified) {
    return (
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 shadow-sm">
        <XCircle className="w-4 h-4 text-rose-600" />
        <span>Disqualified: Capital / Life Offense</span>
      </div>
    );
  }

  if (isSec479) {
    return (
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm">
        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
        <span>Mandatory Bail: § 479 BNSS Eligible</span>
      </div>
    );
  }

  if (isBailableRight) {
    return (
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm">
        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
        <span>Bail as of Right (All Bailable)</span>
      </div>
    );
  }

  if (isDefaultBail) {
    return (
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 shadow-sm">
        <AlertTriangle className="w-4 h-4 text-amber-600" />
        <span>Default Bail Accrued: § 187 BNSS</span>
      </div>
    );
  }

  if (hasMultipleCases) {
    return (
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 shadow-sm">
        <AlertTriangle className="w-4 h-4 text-amber-600" />
        <span>Multiple Cases Warning (§ 479 Excluded)</span>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300">
      <ShieldAlert className="w-4 h-4 text-slate-500" />
      <span>Custody Milestone Incomplete</span>
    </div>
  );
}
