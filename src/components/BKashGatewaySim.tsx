import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  ShieldCheck,
  Info,
  Lock,
  Check,
  AlertCircle,
  FileCheck2,
  FlaskConical,
} from 'lucide-react';

interface BKashGatewaySimProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  tutorName: string;
  onPaymentSuccess: (transactionId: string, walletNumber: string) => void;
}

type PaymentMode = 'manual_trx' | 'sandbox_test';

export default function BKashGatewaySim({
  isOpen,
  onClose,
  amount,
  tutorName,
  onPaymentSuccess,
}: BKashGatewaySimProps) {
  const [mode, setMode] = useState<PaymentMode>('manual_trx');
  const [walletNumber, setWalletNumber] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [agreedTerms, setAgreedTerms] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setMode('manual_trx');
      setWalletNumber('');
      setTransactionId('');
      setSubmitting(false);
      setSubmitted(false);
      setErrorMsg('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isValidBdPhone = /^01[3-9]\d{8}$/.test(walletNumber.trim());
  const isValidTrxId = /^[A-Z0-9]{8,12}$/.test(transactionId.trim().toUpperCase());

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!isValidBdPhone) {
      setErrorMsg('Please enter a valid 11-digit Bangladesh bKash number (01XXXXXXXXX).');
      return;
    }
    if (!isValidTrxId) {
      setErrorMsg('Please enter a valid 8 to 12 character bKash Transaction ID (TrxID), e.g., BKA8291XYZ.');
      return;
    }

    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
      setTimeout(() => {
        onPaymentSuccess(transactionId.trim().toUpperCase(), walletNumber.trim());
      }, 1000);
    }, 600);
  };

  const handleSandboxSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!isValidBdPhone) {
      setErrorMsg('Please enter a valid 11-digit test wallet number (01XXXXXXXXX).');
      return;
    }

    setSubmitting(true);
    const sandboxTrxId = `SANDBOX-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
      setTimeout(() => {
        onPaymentSuccess(sandboxTrxId, walletNumber.trim());
      }, 1000);
    }, 600);
  };

  return (
    <AnimatePresence>
      <div
        id="bkash-checkout-overlay"
        className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="bkash-modal-title"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-md bg-white dark:bg-[#111A2E] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800"
        >
          {/* Header Panel */}
          <div className="bg-[#D12053] p-5 text-white flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-[#D12053] font-bold text-sm">
                  bK
                </div>
                <div>
                  <h2 id="bkash-modal-title" className="font-bold text-white text-sm tracking-wide">
                    bKash Tuition Payment Verification
                  </h2>
                  <p className="text-[11px] text-white/80">
                    Beneficiary Tutor: {tutorName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors cursor-pointer"
                aria-label="Close payment window"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-white/15">
              <span className="text-xs text-white/90 font-medium">Amount to Record</span>
              <span className="text-xl font-mono font-bold tabular-nums">৳{amount.toLocaleString()} BDT</span>
            </div>
          </div>

          {/* Mode Selector Tabs */}
          <div className="grid grid-cols-2 bg-slate-100 dark:bg-slate-900 p-1.5 border-b border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                setMode('manual_trx');
                setErrorMsg('');
              }}
              className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                mode === 'manual_trx'
                  ? 'bg-white dark:bg-[#111A2E] text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <FileCheck2 className="w-3.5 h-3.5 text-[#D12053]" />
              <span>Submit bKash TrxID</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('sandbox_test');
                setErrorMsg('');
              }}
              className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                mode === 'sandbox_test'
                  ? 'bg-white dark:bg-[#111A2E] text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <FlaskConical className="w-3.5 h-3.5 text-amber-500" />
              <span>Sandbox Test Mode</span>
            </button>
          </div>

          {/* Body */}
          <div className="p-6">
            {submitted ? (
              <div className="py-8 text-center space-y-3">
                <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 mx-auto">
                  <Check className="w-7 h-7 stroke-[2.5]" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Payment Record Submitted for Verification
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
                  Your transaction has been recorded with status <strong>Pending Verification</strong>. Once verified by EduTrack Finance, the tutor's wallet and your statement will be updated.
                </p>
              </div>
            ) : mode === 'manual_trx' ? (
              <form onSubmit={handleManualSubmit} className="space-y-4">
                <div className="bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 p-3.5 rounded-xl flex gap-2.5">
                  <Info className="w-4 h-4 text-[#D12053] shrink-0 mt-0.5" />
                  <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Send <strong>৳{amount.toLocaleString()}</strong> via bKash to the official EduTrack merchant wallet, then enter your sender number and the official bKash <strong>TrxID</strong> below for administrative verification.
                  </div>
                </div>

                {errorMsg && (
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Sender bKash Number (11 Digits) *
                  </label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    required
                    value={walletNumber}
                    onChange={(e) => setWalletNumber(e.target.value.replace(/[^0-9]/g, '').slice(0, 11))}
                    placeholder="017XXXXXXXX"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-mono text-slate-900 dark:text-white focus:border-[#D12053] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    bKash Transaction ID (TrxID) *
                  </label>
                  <input
                    type="text"
                    required
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12))}
                    placeholder="e.g. BKA948271X"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-mono uppercase text-slate-900 dark:text-white focus:border-[#D12053] outline-none"
                  />
                </div>

                <label className="flex items-start gap-2.5 pt-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreedTerms}
                    onChange={(e) => setAgreedTerms(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-[#D12053]"
                  />
                  <span className="text-xs text-slate-600 dark:text-slate-400 leading-snug">
                    I confirm this bKash TrxID is genuine. Receipts are unlocked once verified by an administrator.
                  </span>
                </label>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-1/2 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!agreedTerms || submitting}
                    className="w-1/2 py-2.5 px-4 rounded-xl bg-[#D12053] hover:bg-[#b51946] disabled:opacity-50 text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    {submitting ? 'Recording...' : 'Submit for Verification'}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleSandboxSubmit} className="space-y-4">
                <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 p-3.5 rounded-xl flex gap-2.5">
                  <FlaskConical className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
                    <strong>Sandbox Test Environment:</strong> Creates a clearly prefixed <code className="font-mono">SANDBOX-*</code> test record in pending state for testing the administrative approval workflow. No real funds are charged.
                  </div>
                </div>

                {errorMsg && (
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Test Sender Mobile Number (11 Digits) *
                  </label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    required
                    value={walletNumber}
                    onChange={(e) => setWalletNumber(e.target.value.replace(/[^0-9]/g, '').slice(0, 11))}
                    placeholder="01700000000"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-mono text-slate-900 dark:text-white"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-1/2 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-1/2 py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    {submitting ? 'Submitting...' : 'Create Sandbox Record'}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Footer */}
          <div className="bg-slate-50 dark:bg-slate-900/90 px-6 py-3 flex items-center justify-between text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800 text-[11px]">
            <span className="flex items-center gap-1.5 font-medium">
              <Lock className="w-3.5 h-3.5 text-emerald-600" />
              Admin-Audited Ledger
            </span>
            <span className="flex items-center gap-1 font-mono">
              <ShieldCheck className="w-3.5 h-3.5 text-[#0D5BFF]" />
              EduTrack Finance
            </span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
