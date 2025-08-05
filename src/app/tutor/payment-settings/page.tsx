"use client";

export const dynamic = 'force-dynamic';

import TutorNavBar from '@/components/TutorNavBar';
import '../dashboard/dashboard-cambly.css';
import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

export default function TutorPaymentSettings() {
  const [withdrawAmount, setWithdrawAmount] = useState('800.00');
  const [paymentSettings, setPaymentSettings] = useState<any>(null);
  const [payoutSettings, setPayoutSettings] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [banks, setBanks] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/tutor/payment-settings').then(res => res.json()).then(setPaymentSettings);
    fetch('/api/tutor/payout-settings').then(res => res.json()).then(setPayoutSettings);
    fetch('/api/tutor/banks').then(res => res.json()).then(setBanks);
  }, []);

  // Merge payout settings form logic
  const handlePayoutChange = (field: string, value: any) => {
    setPayoutSettings((prev: any) => ({ ...prev, [field]: value }));
  };
  const handleBankDetailsChange = (field: string, value: string) => {
    setPayoutSettings((prev: any) => ({
      ...prev,
      bankDetails: { ...prev?.bankDetails, [field]: value }
    }));
  };
  const handleSavePayout = async (e: any) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const response = await fetch('/api/tutor/payout-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payoutSettings)
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save payout settings');
      }
      toast.success('Payout settings saved successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save payout settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-vh-100 cambly-bg d-flex flex-column">
      <TutorNavBar />
      {/* LearnVastora-style gradient bar */}
      <div className="cambly-gradient-bar d-flex flex-column flex-md-row align-items-center justify-content-between px-4 py-3 mb-4">
        <div>
          <div className="stat-label">Ready for withdrawal:</div>
          <div className="stat-value" style={{ fontSize: 28 }}>1,276.59 USD</div>
          <div className="small text-white-50">Minimum withdrawal amount: {payoutSettings?.minPayoutAmount ? payoutSettings.minPayoutAmount.toFixed(2) : '100.00'} USD</div>
        </div>
        <div className="d-none d-md-block" style={{ fontSize: 80, color: '#fff2', fontWeight: 700, letterSpacing: 2 }}>USD</div>
      </div>
      <div className="container pb-4 flex-grow-1">
        <div className="row g-4 mb-4">
          <div className="col-md-4">
            <div className="cambly-card h-100">
              <div className="d-flex align-items-center mb-2">
                <img src="/avatar.png" alt="John Hill" className="rounded-circle me-3" style={{ width: 48, height: 48, objectFit: 'cover' }} />
                <div>
                  <div className="fw-bold">John Hill</div>
                  <div className="small text-muted">New York, USA</div>
                  <div className="small text-muted">Certified English teacher with level C2 and 10 years of experience</div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="cambly-card h-100">
              <div className="d-flex align-items-center mb-2">
                <i className="bi bi-bank2 fs-2 me-3 text-warning"></i>
                <div>
                  <div className="fw-bold">Personal Bank Account</div>
                  <div className="small text-muted">{payoutSettings?.bankDetails?.accountNumber ? `**** •••• ${payoutSettings.bankDetails.accountNumber.slice(-4)}` : 'No account on file'}</div>
                  <div className="small text-muted">{payoutSettings?.bankDetails?.bankName || ''}</div>
                </div>
              </div>
              <button className="btn btn-outline-warning btn-sm mt-2">Change bank account</button>
            </div>
          </div>
          <div className="col-md-4">
            <div className="cambly-card h-100">
              <div className="row g-2">
                <div className="col-6">
                  <div className="small text-muted">Withdraw Type</div>
                  <div className="fw-bold">Custom amount</div>
                </div>
                <div className="col-6">
                  <div className="small text-muted">Preferred Method</div>
                  <div className="fw-bold">{paymentSettings?.preferredMethod || 'Bank'}</div>
                </div>
                <div className="col-6">
                  <div className="small text-muted">Specify amount</div>
                  <input className="form-control" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} />
                </div>
                <div className="col-6">
                  <div className="small text-muted">Express payment</div>
                  <div className="fw-bold">Payment withdrawal</div>
                  <div className="small text-muted">Next date: 02.10.2023</div>
                </div>
                <div className="col-12 mt-2">
                  <button className="btn btn-warning w-100">Withdraw funds</button>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Payout Settings Form */}
        <div className="row mb-4">
          <div className="col-lg-8 mx-auto">
            <div className="cambly-card">
              <h4 className="mb-3">Payout Settings</h4>
              <form onSubmit={handleSavePayout}>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Payout Method</label>
                  <div className="d-flex gap-3">
                    <div className="form-check">
                      <input className="form-check-input" type="radio" name="payoutMethod" id="bank" value="bank" checked={payoutSettings?.payoutMethod === 'bank'} onChange={e => handlePayoutChange('payoutMethod', e.target.value)} />
                      <label className="form-check-label" htmlFor="bank"><i className="bi bi-bank me-2"></i>Bank Transfer</label>
                    </div>
                    <div className="form-check">
                      <input className="form-check-input" type="radio" name="payoutMethod" id="paypal" value="paypal" checked={payoutSettings?.payoutMethod === 'paypal'} onChange={e => handlePayoutChange('payoutMethod', e.target.value)} />
                      <label className="form-check-label" htmlFor="paypal"><i className="bi bi-paypal me-2"></i>PayPal</label>
                    </div>
                  </div>
                </div>
                {payoutSettings?.payoutMethod === 'bank' && (
                  <div className="mb-3">
                    <h6 className="mb-2">Bank Account Details</h6>
                    <div className="row">
                      <div className="col-md-6 mb-2">
                        <label htmlFor="accountName" className="form-label">Account Holder Name</label>
                        <input type="text" id="accountName" className="form-control" value={payoutSettings?.bankDetails?.accountName || ''} onChange={e => handleBankDetailsChange('accountName', e.target.value)} required />
                      </div>
                      <div className="col-md-6 mb-2">
                        <label htmlFor="accountNumber" className="form-label">Account Number</label>
                        <input type="text" id="accountNumber" className="form-control" value={payoutSettings?.bankDetails?.accountNumber || ''} onChange={e => handleBankDetailsChange('accountNumber', e.target.value)} required />
                      </div>
                      <div className="col-md-6 mb-2">
                        <label htmlFor="routingNumber" className="form-label">Routing Number</label>
                        <input type="text" id="routingNumber" className="form-control" value={payoutSettings?.bankDetails?.routingNumber || ''} onChange={e => handleBankDetailsChange('routingNumber', e.target.value)} />
                      </div>
                      <div className="col-md-6 mb-2">
                        <label htmlFor="bankName" className="form-label">Bank Name</label>
                        <input type="text" id="bankName" className="form-control" value={payoutSettings?.bankDetails?.bankName || ''} onChange={e => handleBankDetailsChange('bankName', e.target.value)} />
                      </div>
                    </div>
                  </div>
                )}
                {payoutSettings?.payoutMethod === 'paypal' && (
                  <div className="mb-3">
                    <label htmlFor="paypalEmail" className="form-label">PayPal Email</label>
                    <input type="email" id="paypalEmail" className="form-control" value={payoutSettings?.paypalEmail || ''} onChange={e => handlePayoutChange('paypalEmail', e.target.value)} required />
                  </div>
                )}
                <div className="mb-3">
                  <label htmlFor="payoutSchedule" className="form-label">Payout Schedule</label>
                  <select id="payoutSchedule" className="form-select" value={payoutSettings?.payoutSchedule || 'weekly'} onChange={e => handlePayoutChange('payoutSchedule', e.target.value)}>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                <div className="mb-3">
                  <label htmlFor="minPayoutAmount" className="form-label">Minimum Payout Amount (USD)</label>
                  <input type="number" id="minPayoutAmount" className="form-control" value={payoutSettings?.minPayoutAmount || 50} onChange={e => handlePayoutChange('minPayoutAmount', e.target.value)} min={1} />
                </div>
                <button className="btn btn-warning" type="submit" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Payout Settings'}</button>
              </form>
            </div>
          </div>
        </div>
        {/* Bank grid */}
        <div className="row g-4">
          {banks.map((bank, idx) => (
            <div className="col-6 col-md-4 col-lg-3" key={bank.id}>
              <div className="cambly-card h-100 d-flex flex-column align-items-center justify-content-between text-center">
                <img src={bank.bankLogo || '/bank/default.png'} alt={bank.bankName} style={{ width: 80, height: 32, objectFit: 'contain', filter: 'grayscale(0.7)' }} className="mb-2" />
                <div className="fw-bold mb-1">{bank.bankName}</div>
                <div className="small text-muted mb-1">{bank.accountNumber ? `****${bank.accountNumber.slice(-4)}` : ''}</div>
                <div className="small text-muted mb-1">Reconcile: {bank.connected ? 'Connected' : 'Never'}</div>
                <div className="fw-bold mb-2">${bank.balance.toFixed(2)}</div>
                <div className="d-flex gap-2 w-100 justify-content-center">
                  <button className="btn btn-outline-warning btn-sm w-50">Detail</button>
                  {bank.connected ? (
                    <button className="btn btn-outline-danger btn-sm w-50">Disconnect</button>
                  ) : (
                    <button className="btn btn-warning btn-sm w-50">Connect</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Footer */}
      <footer className="bg-white border-top py-3 mt-auto small">
        <div className="container d-flex flex-wrap justify-content-between align-items-center">
          <div className="text-muted">© 2023 LearnVastora.com</div>
          <div className="d-flex gap-3">
            <a href="#" className="text-muted text-decoration-none">Affiliate</a>
            <a href="#" className="text-muted text-decoration-none">Regulations</a>
            <a href="#" className="text-muted text-decoration-none">Terms</a>
            <a href="#" className="text-muted text-decoration-none">FAQ</a>
            <a href="#" className="text-muted text-decoration-none">Docs</a>
            <a href="#" className="text-muted text-decoration-none">Contacts</a>
          </div>
        </div>
      </footer>
    </div>
  );
} 