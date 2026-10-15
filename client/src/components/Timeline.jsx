import React from 'react';
import { Calendar, Check, Clock, AlertCircle } from 'lucide-react';

export default function Timeline({ result }) {
  if (!result) {
    return (
      <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm text-center text-slate-500">
        <Clock className="w-8 h-8 mx-auto text-slate-400 mb-2" />
        <p className="text-sm">Enter case details and run eligibility check to view the statutory timeline.</p>
      </div>
    );
  }

  const daysServed =
    result.section479?.daysServed ?? result.defaultBail?.daysServed ?? 0;

  const thresholdMonths = result.section479?.thresholdMonths ?? 0;
  const thresholdDays = Math.round(thresholdMonths * 30.417);
  const fraction = result.section479?.thresholdFraction || '1/3';
  const isSec479Eligible = Boolean(result.section479?.eligible);

  const defaultBailStatutoryDays = result.defaultBail?.statutoryPeriodDays || 60;
  const isDefaultBailEligible = Boolean(result.defaultBail?.eligible);

  const maxTimelineDays = Math.max(120, daysServed + 30, thresholdDays + 30);
  const progressPercent = Math.min(100, Math.round((daysServed / maxTimelineDays) * 100));

  const day60Pos = Math.round((60 / maxTimelineDays) * 100);
  const day90Pos = Math.round((90 / maxTimelineDays) * 100);
  const sec479Pos = thresholdDays > 0 ? Math.min(96, Math.round((thresholdDays / maxTimelineDays) * 100)) : null;

  return (
    <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Custody & Statutory Timeline</h3>
          <p className="text-xs text-slate-500">Tracking Section 479 & Section 187 BNSS milestones</p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 border border-indigo-200 rounded-lg text-indigo-700 text-xs font-semibold">
          <Calendar className="w-3.5 h-3.5" />
          <span>{daysServed} Days in Custody</span>
        </div>
      </div>

      <div className="relative pt-8 pb-10">
        <div className="w-full h-3.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
          <div
            className={`h-full transition-all duration-500 rounded-full ${
              isSec479Eligible || isDefaultBailEligible
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                : 'bg-gradient-to-r from-blue-500 to-indigo-600'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div
          className="absolute top-1 transform -translate-x-1/2 flex flex-col items-center"
          style={{ left: `${Math.min(98, Math.max(2, progressPercent))}%` }}
        >
          <div className="w-3 h-3 bg-indigo-700 rounded-full border-2 border-white shadow ring-2 ring-indigo-300" />
          <span className="text-[10px] font-bold text-indigo-900 bg-indigo-100 px-1.5 py-0.5 rounded mt-0.5">
            Today ({daysServed}d)
          </span>
        </div>

        <div
          className="absolute top-10 transform -translate-x-1/2 flex flex-col items-center"
          style={{ left: `${day60Pos}%` }}
        >
          <div className={`w-2.5 h-2.5 rounded-full ${daysServed >= 60 ? 'bg-emerald-600' : 'bg-slate-400'}`} />
          <span className="text-[10px] font-medium text-slate-600 mt-1">Day 60</span>
          <span className="text-[9px] text-slate-400">§ 187 (60d)</span>
        </div>

        <div
          className="absolute top-10 transform -translate-x-1/2 flex flex-col items-center"
          style={{ left: `${day90Pos}%` }}
        >
          <div className={`w-2.5 h-2.5 rounded-full ${daysServed >= 90 ? 'bg-emerald-600' : 'bg-slate-400'}`} />
          <span className="text-[10px] font-medium text-slate-600 mt-1">Day 90</span>
          <span className="text-[9px] text-slate-400">§ 187 (90d)</span>
        </div>

        {sec479Pos !== null && thresholdDays > 0 && (
          <div
            className="absolute top-10 transform -translate-x-1/2 flex flex-col items-center"
            style={{ left: `${sec479Pos}%` }}
          >
            <div
              className={`w-3 h-3 rounded-full border border-white shadow ${
                isSec479Eligible ? 'bg-emerald-600 ring-2 ring-emerald-300' : 'bg-amber-500'
              }`}
            />
            <span className="text-[10px] font-bold text-slate-800 mt-1">
              § 479 ({fraction})
            </span>
            <span className="text-[9px] text-slate-500 font-medium">
              ~{thresholdDays} Days
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-slate-100">
        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
          <div className="flex items-center gap-2 mb-1">
            {isSec479Eligible ? (
              <Check className="w-4 h-4 text-emerald-600" />
            ) : (
              <Clock className="w-4 h-4 text-slate-400" />
            )}
            <span className="text-xs font-semibold text-slate-800">Section 479 BNSS Status</span>
          </div>
          <p className="text-xs text-slate-600">
            {isSec479Eligible
              ? `Completed ${daysServed} days. Crosses ${fraction} threshold (${thresholdMonths} months). Mandatory relief accrued.`
              : result.section479?.disqualificationReason ||
                `Served ${daysServed} days of required ~${thresholdDays} days (${fraction} statutory maximum).`}
          </p>
        </div>

        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
          <div className="flex items-center gap-2 mb-1">
            {isDefaultBailEligible ? (
              <Check className="w-4 h-4 text-emerald-600" />
            ) : (
              <Clock className="w-4 h-4 text-slate-400" />
            )}
            <span className="text-xs font-semibold text-slate-800">Default Bail Status (§ 187)</span>
          </div>
          <p className="text-xs text-slate-600">
            {isDefaultBailEligible
              ? `Statutory limit (${defaultBailStatutoryDays} days) expired without chargesheet. Indefeasible right accrued.`
              : result.defaultBail?.chargesheetFiled
              ? `Chargesheet filed on schedule. Default statutory bail closed.`
              : `${Math.max(0, defaultBailStatutoryDays - daysServed)} days remaining before default bail accrual.`}
          </p>
        </div>
      </div>
    </div>
  );
}
