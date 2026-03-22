'use client'
import React, { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import styles from "../page.module.css";
import { authAPI } from '../lib/api';
import { useAuth } from '../lib/AuthContext';

// Steps: phone → otp → profile → setMpin → mpin → forgotMpin → resetOtp → resetMpin
const STEPS = {
  PHONE: 'phone',
  OTP: 'otp',
  PROFILE: 'profile',
  SET_MPIN: 'setMpin',
  MPIN: 'mpin',
  FORGOT_MPIN: 'forgotMpin',
  RESET_OTP: 'resetOtp',
  RESET_MPIN: 'resetMpin',
};

function PinInput({ length, value, onChange, autoFocus }) {
  const refs = useRef([]);

  useEffect(() => {
    if (autoFocus && refs.current[0]) refs.current[0].focus();
  }, [autoFocus]);

  const handleChange = useCallback((idx, e) => {
    const val = e.target.value.replace(/\D/g, '');
    if (!val) return;
    const char = val[val.length - 1];
    const arr = (value || '').split('');
    arr[idx] = char;
    const newVal = arr.join('').slice(0, length);
    onChange(newVal);
    if (idx < length - 1 && refs.current[idx + 1]) {
      refs.current[idx + 1].focus();
    }
  }, [value, onChange, length]);

  const handleKeyDown = useCallback((idx, e) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const arr = (value || '').split('');
      if (arr[idx]) {
        arr[idx] = '';
        onChange(arr.join(''));
      } else if (idx > 0) {
        arr[idx - 1] = '';
        onChange(arr.join(''));
        refs.current[idx - 1]?.focus();
      }
    }
  }, [value, onChange]);

  const handlePaste = useCallback((e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    onChange(pasted);
    const focusIdx = Math.min(pasted.length, length - 1);
    refs.current[focusIdx]?.focus();
  }, [onChange, length]);

  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', margin: '15px 0' }}>
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={el => refs.current[i] = el}
          type="tel"
          inputMode="numeric"
          maxLength={1}
          value={(value || '')[i] || ''}
          onChange={e => handleChange(i, e)}
          onKeyDown={e => handleKeyDown(i, e)}
          onPaste={handlePaste}
          style={{
            width: length === 4 ? 52 : 44,
            height: length === 4 ? 56 : 48,
            textAlign: 'center',
            fontSize: 22,
            fontWeight: 'bold',
            border: '2px solid #ccc',
            borderRadius: 10,
            outline: 'none',
            background: '#fafafa',
            caretColor: '#1d1c20',
            transition: 'border-color 0.2s',
          }}
          onFocus={e => e.target.style.borderColor = '#1d1c20'}
          onBlur={e => e.target.style.borderColor = '#ccc'}
        />
      ))}
    </div>
  );
}

const LoginAccountPage = () => {
  const router = useRouter();
  const { login } = useAuth();

  const [step, setStep] = useState(STEPS.PHONE);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [mpin, setMpin] = useState('');
  const [mpinConfirm, setMpinConfirm] = useState('');
  const [name, setName] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [tempToken, setTempToken] = useState(null);
  const [otpPurpose, setOtpPurpose] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1: Check user after phone entry
  const handleCheckUser = async () => {
    if (!phone || !/^[6-9]\d{9}$/.test(phone)) {
      setError('Enter a valid 10-digit mobile number');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const data = await authAPI.checkUser(phone);
      if (!data.exists) {
        // New user → send OTP for registration
        await authAPI.sendOTP(phone, 'register');
        setOtpPurpose('register');
        setStep(STEPS.OTP);
      } else if (!data.mpinSet) {
        // Existing user without MPIN → send OTP so they can set one
        await authAPI.sendOTP(phone, 'reset_mpin');
        setOtpPurpose('reset_mpin');
        setStep(STEPS.OTP);
      } else {
        // Existing user with MPIN → show MPIN login
        setStep(STEPS.MPIN);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP (registration or reset)
  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      setError('Enter a valid 6-digit OTP');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const data = await authAPI.verifyOTP(phone, otp, otpPurpose);
      setTempToken(data.tempToken);

      if (data.isNewUser) {
        setStep(STEPS.PROFILE);
      } else if (data.resetMpin) {
        setStep(STEPS.RESET_MPIN);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Complete profile (new user)
  const handleCompleteProfile = async () => {
    if (!name || name.trim().length < 2) {
      setError('Name must be at least 2 characters');
      return;
    }
    setError('');
    setStep(STEPS.SET_MPIN);
  };

  // Step 4: Set MPIN during registration
  const handleSetMpinRegister = async () => {
    if (!mpin || !/^\d{4}$/.test(mpin)) {
      setError('MPIN must be exactly 4 digits');
      return;
    }
    if (mpin !== mpinConfirm) {
      setError('MPINs do not match');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const data = await authAPI.completeProfile(name.trim(), referralCode, mpin, tempToken);
      login(data.token, data.user);
      router.push('/home');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // MPIN Login
  const handleMpinLogin = async () => {
    if (!mpin || !/^\d{4}$/.test(mpin)) {
      setError('Enter your 4-digit MPIN');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const data = await authAPI.loginMpin(phone, mpin);
      login(data.token, data.user);
      router.push('/home');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Forgot MPIN → send OTP for reset
  const handleForgotMpin = async () => {
    setError('');
    setLoading(true);
    try {
      await authAPI.sendOTP(phone, 'reset_mpin');
      setOtpPurpose('reset_mpin');
      setOtp('');
      setStep(STEPS.RESET_OTP);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Verify OTP for MPIN reset
  const handleVerifyResetOTP = async () => {
    if (!otp || otp.length !== 6) {
      setError('Enter a valid 6-digit OTP');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const data = await authAPI.verifyOTP(phone, otp, 'reset_mpin');
      setTempToken(data.tempToken);
      setMpin('');
      setMpinConfirm('');
      setStep(STEPS.RESET_MPIN);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Reset MPIN
  const handleResetMpin = async () => {
    if (!mpin || !/^\d{4}$/.test(mpin)) {
      setError('MPIN must be exactly 4 digits');
      return;
    }
    if (mpin !== mpinConfirm) {
      setError('MPINs do not match');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await authAPI.resetMpin(mpin, tempToken);
      // Now login with the new MPIN
      const data = await authAPI.loginMpin(phone, mpin);
      login(data.token, data.user);
      router.push('/home');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    switch (step) {
      case STEPS.PHONE: return 'Login to A23 Satta';
      case STEPS.OTP: return 'Verify OTP';
      case STEPS.PROFILE: return 'Complete Your Profile';
      case STEPS.SET_MPIN: return 'Set Your MPIN';
      case STEPS.MPIN: return 'Enter MPIN';
      case STEPS.FORGOT_MPIN: return 'Forgot MPIN';
      case STEPS.RESET_OTP: return 'Verify OTP';
      case STEPS.RESET_MPIN: return 'Set New MPIN';
      default: return 'Login to A23 Satta';
    }
  };

  const getSubtitle = () => {
    switch (step) {
      case STEPS.PHONE: return 'Enter your mobile number to continue.';
      case STEPS.OTP: return `We sent a 6-digit code to ${phone}`;
      case STEPS.PROFILE: return 'Tell us your name to get started.';
      case STEPS.SET_MPIN: return 'Create a 4-digit MPIN for quick login.';
      case STEPS.MPIN: return `Welcome back! Enter your MPIN for ${phone}`;
      case STEPS.RESET_OTP: return `We sent a verification code to ${phone}`;
      case STEPS.RESET_MPIN: return 'Create a new 4-digit MPIN.';
      default: return '';
    }
  };

  const handleBack = () => {
    setError('');
    setMpin('');
    setMpinConfirm('');
    switch (step) {
      case STEPS.OTP: setOtp(''); setOtpPurpose(null); setStep(STEPS.PHONE); break;
      case STEPS.PROFILE: setStep(STEPS.OTP); break;
      case STEPS.SET_MPIN: setStep(STEPS.PROFILE); break;
      case STEPS.MPIN: setStep(STEPS.PHONE); break;
      case STEPS.RESET_OTP: setOtp(''); setOtpPurpose(null); setStep(STEPS.MPIN); break;
      case STEPS.RESET_MPIN: setStep(STEPS.RESET_OTP); break;
      default: break;
    }
  };

  return (
    <div className='loginaccountPage'>
      <main className={styles.pagenotcenter}>
        <div className="page-wrappers">
          <div className="page-wrapper-login"></div>
          <div className="back-btn">
            {step === STEPS.PHONE ? (
              <Link href="/login"><img src="/images/back-btn.png" alt="Back" /></Link>
            ) : (
              <a onClick={handleBack} style={{ cursor: 'pointer' }}><img src="/images/back-btn.png" alt="Back" /></a>
            )}
          </div>

          <section className="section-1">
            <h3 className="title"><b>{getTitle()}</b></h3>
            <h4 style={{ fontWeight: 'normal', fontSize: 14, paddingBottom: 10, color: 'rgb(105,105,105)' }}>
              {getSubtitle()}
            </h4>

            {error && (
              <p style={{
                color: '#d32f2f', background: '#fdecea', padding: '8px 12px',
                fontSize: 13, borderRadius: 8, margin: '0 0 10px'
              }}>{error}</p>
            )}

            <div className="form-bx">

              {/* STEP: PHONE */}
              {step === STEPS.PHONE && (
                <>
                  <div className="form-rw">
                    <label className="text">Mobile Number</label>
                    <input
                      placeholder="Enter your 10-digit number"
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      value={phone}
                      onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                    />
                  </div>
                  <div className="login-bx mb-0 text-left">
                    <p className="btntext">
                      First time login will register a new account for you.
                    </p>
                  </div>
                  <button type="button" className="login-btn" onClick={handleCheckUser} disabled={loading}>
                    {loading ? 'Checking...' : 'Continue'}
                  </button>
                </>
              )}

              {/* STEP: OTP (registration) */}
              {step === STEPS.OTP && (
                <>
                  <label className="text" style={{ display: 'block', textAlign: 'center', marginTop: 10, fontWeight: 500 }}>
                    Enter 6-digit OTP
                  </label>
                  <PinInput length={6} value={otp} onChange={setOtp} autoFocus />
                  <button type="button" className="login-btn" onClick={handleVerifyOTP} disabled={loading}>
                    {loading ? 'Verifying...' : 'Verify OTP'}
                  </button>
                </>
              )}

              {/* STEP: PROFILE (new user) */}
              {step === STEPS.PROFILE && (
                <>
                  <div className="form-rw">
                    <label className="text">Full Name</label>
                    <input placeholder="Enter your name" type="text" value={name} onChange={e => setName(e.target.value)} />
                  </div>
                  <div className="form-rw">
                    <label className="text">Referral Code (Optional)</label>
                    <input placeholder="Enter referral code" type="text" value={referralCode} onChange={e => setReferralCode(e.target.value)} />
                  </div>
                  <button type="button" className="login-btn" onClick={handleCompleteProfile} disabled={loading}>
                    {loading ? 'Please wait...' : 'Continue'}
                  </button>
                </>
              )}

              {/* STEP: SET MPIN (new user registration) */}
              {step === STEPS.SET_MPIN && (
                <>
                  <label className="text" style={{ display: 'block', textAlign: 'center', marginTop: 10, fontWeight: 500 }}>
                    Create 4-Digit MPIN
                  </label>
                  <PinInput length={4} value={mpin} onChange={setMpin} autoFocus />
                  <label className="text" style={{ display: 'block', textAlign: 'center', marginTop: 10, fontWeight: 500 }}>
                    Confirm MPIN
                  </label>
                  <PinInput length={4} value={mpinConfirm} onChange={setMpinConfirm} />
                  <button type="button" className="login-btn" onClick={handleSetMpinRegister} disabled={loading}>
                    {loading ? 'Creating Account...' : 'Create Account'}
                  </button>
                </>
              )}

              {/* STEP: MPIN LOGIN */}
              {step === STEPS.MPIN && (
                <>
                  <label className="text" style={{ display: 'block', textAlign: 'center', marginTop: 10, fontWeight: 500 }}>
                    Enter 4-Digit MPIN
                  </label>
                  <PinInput length={4} value={mpin} onChange={setMpin} autoFocus />
                  <button type="button" className="login-btn" onClick={handleMpinLogin} disabled={loading}>
                    {loading ? 'Logging in...' : 'Login'}
                  </button>
                  <p
                    onClick={handleForgotMpin}
                    style={{
                      textAlign: 'center', marginTop: 15, color: '#1d1c20',
                      cursor: 'pointer', fontSize: 13, textDecoration: 'underline',
                      fontWeight: 500
                    }}
                  >
                    Forgot MPIN?
                  </p>
                </>
              )}

              {/* STEP: RESET OTP (forgot MPIN) */}
              {step === STEPS.RESET_OTP && (
                <>
                  <label className="text" style={{ display: 'block', textAlign: 'center', marginTop: 10, fontWeight: 500 }}>
                    Enter 6-digit OTP
                  </label>
                  <PinInput length={6} value={otp} onChange={setOtp} autoFocus />
                  <button type="button" className="login-btn" onClick={handleVerifyResetOTP} disabled={loading}>
                    {loading ? 'Verifying...' : 'Verify OTP'}
                  </button>
                </>
              )}

              {/* STEP: RESET MPIN (after OTP verification) */}
              {step === STEPS.RESET_MPIN && (
                <>
                  <label className="text" style={{ display: 'block', textAlign: 'center', marginTop: 10, fontWeight: 500 }}>
                    New 4-Digit MPIN
                  </label>
                  <PinInput length={4} value={mpin} onChange={setMpin} autoFocus />
                  <label className="text" style={{ display: 'block', textAlign: 'center', marginTop: 10, fontWeight: 500 }}>
                    Confirm MPIN
                  </label>
                  <PinInput length={4} value={mpinConfirm} onChange={setMpinConfirm} />
                  <button type="button" className="login-btn" onClick={handleResetMpin} disabled={loading}>
                    {loading ? 'Resetting...' : 'Reset MPIN & Login'}
                  </button>
                </>
              )}

            </div>
          </section>
        </div>
      </main>
    </div>
  )
}

export default LoginAccountPage
