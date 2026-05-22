import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Terminal, 
  ShieldCheck, 
  RefreshCw, 
  Key, 
  Info, 
  CheckCircle, 
  Lock, 
  Zap, 
  User, 
  Flame,
  Check
} from 'lucide-react';

interface BKashGatewaySimProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  tutorName: string;
  onPaymentSuccess: (transactionId: string, walletNumber: string) => void;
}

type CheckoutStep = 'number' | 'otp' | 'pin' | 'processing' | 'success';

interface TerminalLog {
  timestamp: string;
  type: 'incoming' | 'outgoing' | 'success' | 'info';
  method: 'POST' | 'GET' | 'SYSTEM';
  url: string;
  payload: string;
}

export default function BKashGatewaySim({
  isOpen,
  onClose,
  amount,
  tutorName,
  onPaymentSuccess
}: BKashGatewaySimProps) {
  const [step, setStep] = useState<CheckoutStep>('number');
  const [walletNumber, setWalletNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [pin, setPin] = useState('');
  const [otpSentCode, setOtpSentCode] = useState('123456');
  const [resendTimer, setResendTimer] = useState(59);
  const [agreedTerms, setAgreedTerms] = useState(true);
  
  // Interactive logs shown in the Developer terminal window
  const [logs, setLogs] = useState<TerminalLog[]>([]);
  const logsContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs to bottom
  useEffect(() => {
    if (logsContainerRef.current) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
    }
  }, [logs]);

  // Otp timer countdown
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === 'otp' && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, resendTimer]);

  const addLog = (
    type: 'incoming' | 'outgoing' | 'success' | 'info',
    method: 'POST' | 'GET' | 'SYSTEM',
    url: string,
    payload: any
  ) => {
    const newLog: TerminalLog = {
      timestamp: new Date().toLocaleTimeString(),
      type,
      method,
      url,
      payload: typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2)
    };
    setLogs(prev => [...prev, newLog]);
  };

  // Initialize sandbox token when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('number');
      setWalletNumber('');
      setOtp('');
      setPin('');
      setResendTimer(59);
      
      const sessionInvoice = `INV-REF-${Date.now().toString().slice(-6)}`;
      
      // Seed initial developer logs
      setLogs([
        {
          timestamp: new Date().toLocaleTimeString(),
          type: 'info',
          method: 'SYSTEM',
          url: 'bKash Gateway Intializing...',
          payload: 'TutorLink bKash Sandbox integration environment online.'
        }
      ]);

      setTimeout(() => {
        addLog('outgoing', 'POST', 'https://tokenized.sandbox.bka.sh/v1.2.0-beta/tokenized/checkout/token/grant', {
          app_key: 'sandbox_u_87fksdf89y213',
          app_secret: 'sandbox_s_902hjashda89hf912hnasq',
          username: 'TutorLink_Sandbox_Merchant',
          password: '••••••••••••••••'
        });

        setTimeout(() => {
          addLog('incoming', 'SYSTEM', 'TOKEN_GRANTED_200_OK', {
            statusCode: '0000',
            statusMessage: 'Successful',
            idToken: 'eyJhbGciOiJSUzI1NiIsImtpZCI6InNhbmRib3gtbWh...' ,
            refreshToken: 'r_eyJhbGciOiJSUzI1NiIsImtpZCI6InNhbmRib...' ,
            expiresIn: 3600
          });
          
          addLog('outgoing', 'POST', 'https://tokenized.sandbox.bka.sh/v1.2.0-beta/tokenized/checkout/create', {
            mode: '0011',
            payerReference: 'TutorLink_Student',
            callbackURL: window.location.origin,
            amount: amount,
            currency: 'BDT',
            intent: 'sale',
            merchantInvoiceNumber: sessionInvoice
          });

          addLog('incoming', 'SYSTEM', 'PAYMENT_CREATED_200_OK', {
            paymentID: `BK${Math.floor(1000000 + Math.random() * 9000000)}`,
            createTime: new Date().toISOString(),
            orgLogo: 'https://cdn.sandbox.bka.sh/logos/tutorlink.png',
            orgName: 'TutorLink Merchant Sandbox',
            transactionStatus: 'Initiated',
            amount: amount.toString(),
            currency: 'BDT',
            intent: 'sale',
            merchantInvoiceNumber: sessionInvoice
          });
        }, 600);
      }, 300);
    }
  }, [isOpen]);

  const handleWalletSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletNumber || walletNumber.length < 11) return;
    
    addLog('outgoing', 'SYSTEM', 'CLIENT_ACTION_WALLET_SUBMITTED', {
      walletNumber,
      validation: 'Regex matches Bangladeshi Mobile (01XXXXXXXXX)',
      consentToTerms: agreedTerms
    });

    setStep('processing');

    setTimeout(() => {
      // Simulate sending OTP from SMS gateway
      const mockOtp = Math.floor(100000 + Math.random() * 900000).toString();
      setOtpSentCode(mockOtp);
      setResendTimer(59);

      addLog('outgoing', 'POST', 'https://tokenized.sandbox.bka.sh/v1.2.0-beta/tokenized/checkout/payment/status', {
        step: 'OTP_REQUEST',
        recipient: walletNumber
      });

      addLog('incoming', 'SYSTEM', 'OTP_SENT_VIA_SMS_GATEWAY_SIMULATOR', {
        status: 'Success',
        sid: `sms_sid_${Math.random().toString(36).substring(7).toUpperCase()}`,
        simulatedSMS: `Your TutorLink payment verification code is ${mockOtp}. Do not share this OTP with anyone.`,
        note: 'This is the Sandbox Simulation SMS portal. See field simulatedSMS for testing.'
      });

      setStep('otp');
    }, 1200);
  };

  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length < 4) return;

    addLog('outgoing', 'SYSTEM', 'CLIENT_ACTION_OTP_SUBMITTED', {
      enteredOtp: otp,
      verificationMatch: 'Sandbox Mock: Accepting as matched for interactive tests'
    });

    setStep('processing');

    setTimeout(() => {
      addLog('outgoing', 'POST', 'https://tokenized.sandbox.bka.sh/v1.2.0-beta/tokenized/checkout/payment/status', {
        step: 'PIN_REQUEST',
        id_token_validated: true
      });

      addLog('incoming', 'SYSTEM', 'PROMPT_PIN_REQUIRED', {
        success: true,
        message: 'Enter 5-digit PIN of bKash account number to execute checkout contract.'
      });

      setStep('pin');
    }, 1000);
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin || pin.length < 4) return;

    addLog('outgoing', 'SYSTEM', 'CLIENT_ACTION_PIN_SUBMITTED', {
      maskedPin: '•••••',
      isTestingMode: true
    });

    setStep('processing');

    // Simulate Payment Execution endpoint
    setTimeout(() => {
      const simulatedTrx = `BK${Math.random().toString(36).substring(2, 11).toUpperCase()}`;

      addLog('outgoing', 'POST', 'https://tokenized.sandbox.bka.sh/v1.2.0-beta/tokenized/checkout/execute', {
        paymentID: `BK${Math.floor(1000000 + Math.random() * 9000000)}`,
        auth_pin_hashed: 'sim_pbkdf2_sha256_e4374c71'
      });

      addLog('incoming', 'SYSTEM', 'PAYMENT_EXECUTED_200_SUCCESS', {
        statusCode: '0000',
        statusMessage: 'Successful',
        paymentID: `BK${Math.floor(1000000 + Math.random() * 9000000)}`,
        trxID: simulatedTrx,
        transactionStatus: 'Completed',
        amount: amount.toString(),
        payerReference: walletNumber,
        updateTime: new Date().toISOString()
      });

      addLog('success', 'SYSTEM', 'PERSISTENCE_COMPLETE', {
        action: 'Write checkout data to TutorLink backend database',
        status: 'Ok',
        trxId: simulatedTrx,
        sender: walletNumber
      });

      setStep('success');

      // Call success props callback
      setTimeout(() => {
        onPaymentSuccess(simulatedTrx, walletNumber);
      }, 1500);

    }, 2000);
  };

  if (!isOpen) return null;

  return (
    <div id="bkash-checkout-overlay" className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-sm bg-white rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden relative border border-slate-200">
        
        {/* Absolute visual elements */}
        <div className="absolute top-0 left-0 w-64 h-64 bg-[#E51275]/5 blur-3xl rounded-full pointer-events-none -z-10"></div>
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-cyan-500/5 blur-3xl rounded-full pointer-events-none -z-10"></div>
        
        {/* Real-Like Interactive bKash App Merchant Checkout Portal */}
        <div className="w-full bg-slate-50 flex flex-col relative">
          
          {/* bKash Header Panel */}
          <div className="bg-[#E51275] p-6 text-white flex flex-col gap-1 shrink-0 select-none">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[#E51275] font-black italic shadow-inner select-none">
                  bK
                </div>
                <span className="font-sans font-black tracking-widest text-[#FFF] text-lg uppercase">bKash</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="bg-white/25 px-2.5 py-1 rounded-full text-[8px] font-black tracking-wider uppercase flex items-center gap-1 border border-white/20 select-none">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></div>
                  Sandbox
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-full transition-all cursor-pointer"
                  aria-label="Close"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-0.5 border-t border-white/10 pt-4">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-white/80 font-bold uppercase tracking-wider">Merchant</span>
                <span className="text-[10px] text-white font-black uppercase tracking-wider">TUTORLINK MERCH_SANDBOX</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-white/80 font-bold uppercase tracking-wider">Invoice Ref</span>
                <span className="text-[10px] text-white/90 font-mono font-medium">INV-SEC-{amount}X</span>
              </div>
              <div className="flex justify-between items-end mt-1">
                <span className="text-xs text-white/90 font-bold uppercase tracking-widest">Amount to Pay</span>
                <span className="text-xl font-sans font-black tracking-tight">৳{amount}.00</span>
              </div>
            </div>
          </div>

          {/* Interactive Step Content Container */}
          <div className="flex-grow p-6 flex flex-col justify-between min-h-[360px] max-h-[460px] overflow-y-auto">
            
            <AnimatePresence mode="wait">
              {step === 'number' && (
                <motion.form 
                  key="step-number"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  onSubmit={handleWalletSubmit}
                  className="flex-grow flex flex-col justify-between min-h-[300px]"
                >
                  <div className="space-y-4 pt-2">
                    <div className="bg-pink-50 border border-pink-100 p-3.5 rounded-2xl flex gap-3">
                      <Info className="w-5 h-5 text-[#E51275] shrink-0 mt-0.5" />
                      <p className="text-[10px] font-bold text-[#E51275] uppercase tracking-wider leading-relaxed">
                        SANDBOX TESTING: Enter your mobile number starting with 01 to trigger SMS OTP codes!
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">
                        Your bKash Account Number
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          value={walletNumber}
                          onChange={(e) => setWalletNumber(e.target.value.replace(/[^0-9]/g, ''))}
                          maxLength={11}
                          placeholder="e.g. 017XXXXXXXX"
                          className="w-full bg-white border-2 border-slate-200 focus:border-[#E51275] rounded-2xl px-4 py-4 text-sm font-black text-slate-800 tracking-widest outline-none transition-all placeholder:font-normal placeholder:tracking-normal placeholder:text-slate-300"
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-[#E51275] bg-pink-50 border border-pink-100 px-2 py-1 rounded">
                          01-PREFIX
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 pt-2">
                      <input 
                        type="checkbox" 
                        id="agree-terms" 
                        checked={agreedTerms}
                        onChange={(e) => setAgreedTerms(e.target.checked)}
                        className="mt-1 h-3.5 w-3.5 rounded-lg border-slate-300Accent text-[#E51275] focus:ring-[#E51275] accent-[#E51275]"
                      />
                      <label htmlFor="agree-terms" className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-loose select-none">
                        I agree to the terms and conditions in respect to my sandbox profile simulation check.
                      </label>
                    </div>
                  </div>

                  <div className="flex gap-4 pt-6 mt-8">
                    <button
                      type="button"
                      onClick={onClose}
                      className="w-1/2 bg-slate-200 hover:bg-slate-300 text-slate-600 font-black uppercase text-[10px] tracking-widest py-4 rounded-2xl transition-all"
                    >
                      Close
                    </button>
                    <button
                      type="submit"
                      disabled={!agreedTerms || walletNumber.length < 11}
                      className="w-1/2 bg-[#E51275] hover:bg-[#c20d61] disabled:opacity-50 text-white font-black uppercase text-[10px] tracking-widest py-4 rounded-2xl transition-all shadow-md shadow-[#E51275]/20"
                    >
                      Confirm
                    </button>
                  </div>
                </motion.form>
              )}

              {step === 'otp' && (
                <motion.form 
                  key="step-otp"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  onSubmit={handleOtpSubmit}
                  className="flex-grow flex flex-col justify-between min-h-[300px]"
                >
                  <div className="space-y-4 pt-2">
                    <div className="bg-pink-50 border border-pink-100 p-4 rounded-2xl space-y-2">
                      <div className="flex gap-2 items-center text-[#E51275] font-black uppercase tracking-wider text-[10px]">
                        <Flame className="w-4 h-4 text-amber-500" />
                        Simulated SMS Inbox Code
                      </div>
                      <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest leading-relaxed">
                        bKash Verification Code has been simulated sent to <span className="text-slate-800 font-black">{walletNumber}</span>.
                      </p>
                      <div className="bg-white border border-pink-100 rounded-xl px-4 py-2 flex items-center justify-between">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">SMS OTP Hint</span>
                        <span className="text-xs font-black font-mono tracking-widest text-[#E51275] bg-pink-50 border border-pink-100/50 px-2 py-0.5 rounded select-all hover:bg-pink-100/50 cursor-pointer">
                          {otpSentCode}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">
                        Enter bKash OTP Code
                      </label>
                      <input
                        type="text"
                        required
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                        maxLength={6}
                        placeholder="e.g. 123456"
                        className="w-full bg-white border-2 border-slate-200 focus:border-[#E51275] rounded-2xl px-4 py-4 text-sm font-black text-slate-800 tracking-widest outline-none transition-all placeholder:font-normal placeholder:tracking-normal placeholder:text-slate-300 text-center"
                      />
                    </div>

                    <div className="flex items-center justify-between px-1">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        Don't receive?
                      </span>
                      {resendTimer > 0 ? (
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                          Resend Code ({resendTimer}s)
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            const code = Math.floor(100000 + Math.random() * 900000).toString();
                            setOtpSentCode(code);
                            setResendTimer(59);
                            addLog('incoming', 'SYSTEM', 'OTP_RESENT_REQUESTED', {
                              newOtp: code,
                              timestamp: new Date().toISOString()
                            });
                          }}
                          className="text-[9px] font-black text-[#E51275] hover:underline uppercase tracking-widest"
                        >
                          Send Code Again
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-4 pt-6 mt-8">
                    <button
                      type="button"
                      onClick={() => setStep('number')}
                      className="w-1/2 bg-slate-200 hover:bg-slate-300 text-slate-600 font-black uppercase text-[10px] tracking-widest py-4 rounded-2xl transition-all"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={otp.length < 4}
                      className="w-1/2 bg-[#E51275] hover:bg-[#c20d61] disabled:opacity-50 text-white font-black uppercase text-[10px] tracking-widest py-4 rounded-2xl transition-all shadow-md shadow-[#E51275]/20"
                    >
                      Confirm
                    </button>
                  </div>
                </motion.form>
              )}

              {step === 'pin' && (
                <motion.form 
                  key="step-pin"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  onSubmit={handlePinSubmit}
                  className="flex-grow flex flex-col justify-between min-h-[300px]"
                >
                  <div className="space-y-4 pt-2">
                    <div className="bg-pink-50 border border-pink-100 p-4 rounded-2xl flex gap-3">
                      <Lock className="w-5 h-5 text-[#E51275] shrink-0 mt-0.5" />
                      <div>
                        <h5 className="text-[10px] font-black text-[#E51275] uppercase tracking-wider mb-1">Secure PIN Sandbox Check</h5>
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
                          For sandbox test, you can enter any dummy 5-digit credentials PIN (e.g. 12345) to successfully authorize simulation checkout.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">
                        Enter bKash Account PIN
                      </label>
                      <input
                        type="password"
                        required
                        value={pin}
                        onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ''))}
                        maxLength={5}
                        placeholder="•••••"
                        className="w-full bg-white border-2 border-slate-200 focus:border-[#E51275] rounded-2xl px-4 py-4 text-base font-black text-slate-800 tracking-[0.5em] outline-none transition-all placeholder:font-normal placeholder:tracking-normal placeholder:text-slate-300 text-center"
                      />
                    </div>
                  </div>

                  <div className="flex gap-4 pt-6 mt-8">
                    <button
                      type="button"
                      onClick={() => setStep('otp')}
                      className="w-1/2 bg-slate-200 hover:bg-slate-300 text-slate-600 font-black uppercase text-[10px] tracking-widest py-4 rounded-2xl transition-all"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={pin.length < 4}
                      className="w-1/2 bg-[#E51275] hover:bg-[#c20d61] disabled:opacity-50 text-white font-black uppercase text-[10px] tracking-widest py-4 rounded-2xl transition-all shadow-md shadow-[#E51275]/20"
                    >
                      Confirm
                    </button>
                  </div>
                </motion.form>
              )}

              {step === 'processing' && (
                <motion.div 
                  key="step-processing"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-grow flex flex-col items-center justify-center min-h-[300px] text-center"
                >
                  <div className="relative">
                    <div className="w-16 h-16 border-4 border-pink-200 border-t-[#E51275] rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center font-bold text-[8px] uppercase tracking-wider text-[#E51275] animate-pulse">
                      bKash
                    </div>
                  </div>
                  <h4 className="text-sm font-black text-slate-800 uppercase italic tracking-wider mt-6">Processing Transaction</h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2 px-6">
                    Communicating with secure staging sandbox servers. Please do not close or reload.
                  </p>
                </motion.div>
              )}

              {step === 'success' && (
                <motion.div 
                   key="step-success"
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="flex-grow flex flex-col items-center justify-center min-h-[300px] text-center"
                >
                  <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-green-500/20">
                    <Check className="w-8 h-8 stroke-[3]" />
                  </div>
                  <h4 className="text-sm font-black text-emerald-600 uppercase italic tracking-wider mt-6">Payment Transferred</h4>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2 px-6">
                    Successfully verified, billed, and dispatched! Closing payment simulator gateway...
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer banner */}
          <div className="bg-slate-200 px-6 py-4 flex items-center justify-center gap-2 text-slate-500 shrink-0 border-t border-slate-300/30">
            <Lock className="w-3.5 h-3.5" />
            <span className="text-[8px] font-black uppercase tracking-widest">
              Staged Sandbox Environment • Secured by SSL
            </span>
          </div>

        </div>
      </div>
    </div>
  );
}
