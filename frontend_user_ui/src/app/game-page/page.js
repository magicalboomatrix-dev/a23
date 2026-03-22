'use client'
import React, { useState, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Header from '../components/Header'
import { betAPI } from '../lib/api'

function GamePageInner() {
  const searchParams = useSearchParams();
  const gameId = searchParams.get('id');
  const gameName = searchParams.get('name') || 'Game';

  const [activeTab, setActiveTab] = useState("tab-1");
  const [showPopup, setShowPopup] = useState(false);
  const [amount, setAmount] = useState("");
  const [activeSlot, setActiveSlot] = useState(null);
  const [savedAmounts, setSavedAmounts] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Haruf state
  const [harufAndar, setHarufAndar] = useState({});
  const [harufBahar, setHarufBahar] = useState({});
  const [harufPopup, setHarufPopup] = useState(false);
  const [harufSlot, setHarufSlot] = useState(null);
  const [harufType, setHarufType] = useState('andar');

  // Crossing state
  const [crossDigits, setCrossDigits] = useState('');
  const [crossAmount, setCrossAmount] = useState('');
  const [crossIncludeJodi, setCrossIncludeJodi] = useState(true); 
  const [crossCombos, setCrossCombos] = useState([]);

  const jodiNumbers = Array.from({length: 100}, (_, i) => String(i).padStart(2, '0'));
  const harufDigits = ['0','1','2','3','4','5','6','7','8','9'];

  const handleNumericInput = (val, setter) => {
    const cleanVal = val.replace(/\D/g, '');
    setter(cleanVal);
  };

  // --- Jodi Logic ---
  const openPopup = (num) => {
    setActiveSlot(num);
    setAmount(savedAmounts[num] || "");
    setShowPopup(true);
  };

  const saveAmount = (e) => {
    e.preventDefault();
    if (!amount || parseInt(amount) <= 0) return;
    setSavedAmounts(prev => ({ ...prev, [activeSlot]: amount }));
    setShowPopup(false);
  };

  const removeCurrentJodi = () => {
    setSavedAmounts(prev => {
      const copy = {...prev};
      delete copy[activeSlot];
      return copy;
    });
    setShowPopup(false);
  };

  // --- Haruf Logic ---
  const openHarufPopup = (digit, type) => {
    setHarufSlot(digit);
    setHarufType(type);
    const existing = type === 'andar' ? harufAndar[digit] : harufBahar[digit];
    setAmount(existing || '');
    setHarufPopup(true);
  };

  const saveHaruf = (e) => {
    e.preventDefault();
    if (!amount || parseInt(amount) <= 0) return;
    if (harufType === 'andar') {
      setHarufAndar(prev => ({ ...prev, [harufSlot]: amount }));
    } else {
      setHarufBahar(prev => ({ ...prev, [harufSlot]: amount }));
    }
    setHarufPopup(false);
  };

  const removeCurrentHaruf = () => {
    if (harufType === 'andar') {
      setHarufAndar(prev => { const c = {...prev}; delete c[harufSlot]; return c; });
    } else {
      setHarufBahar(prev => { const c = {...prev}; delete c[harufSlot]; return c; });
    }
    setHarufPopup(false);
  };

  // --- Crossing Logic ---
  const generateCrossCombos = () => {
    const raw = crossDigits.replace(/\D/g, '').slice(0, 7); 
    const amt = parseInt(crossAmount);
    if (!raw || raw.length < 2 || !amt) return;

    const uniqueDigits = [...new Set(raw.split(''))];
    const combos = [];

    for (let i = 0; i < uniqueDigits.length; i++) {
      for (let j = 0; j < uniqueDigits.length; j++) {
        const d1 = uniqueDigits[i];
        const d2 = uniqueDigits[j];
        if (!crossIncludeJodi && d1 === d2) continue;
        combos.push({ number: d1 + d2, amount: amt });
      }
    }
    setCrossCombos(combos);
  };

  const getTotal = useCallback(() => {
    let total = 0;
    Object.values(savedAmounts).forEach(v => total += parseInt(v) || 0);
    Object.values(harufAndar).forEach(v => total += parseInt(v) || 0);
    Object.values(harufBahar).forEach(v => total += parseInt(v) || 0);
    crossCombos.forEach(c => total += parseInt(c.amount) || 0);
    return total;
  }, [savedAmounts, harufAndar, harufBahar, crossCombos]);

  const placeBet = async () => {
    if (!gameId) return;
    setError('');
    setSuccess('');

    const groupedNumbers = {
      jodi: Object.entries(savedAmounts).map(([n, a]) => ({ number: n, amount: parseInt(a) })),
      haruf_andar: Object.entries(harufAndar).map(([n, a]) => ({ number: n, amount: parseInt(a) })),
      haruf_bahar: Object.entries(harufBahar).map(([n, a]) => ({ number: n, amount: parseInt(a) })),
      crossing: crossCombos.map((c) => ({ number: c.number, amount: parseInt(c.amount) })),
    };

    const requests = Object.entries(groupedNumbers)
      .filter(([, numbers]) => numbers.length > 0)
      .map(([type, numbers]) => ({ type, numbers }));

    if (requests.length === 0) {
      setError('Select at least one number before playing.');
      return;
    }

    setLoading(true);
    try {
      for (const request of requests) {
        await betAPI.place({
          game_id: parseInt(gameId),
          type: request.type,
          numbers: request.numbers,
        });
      }
      setSuccess('Bet placed successfully.');
      setSavedAmounts({}); setHarufAndar({}); setHarufBahar({}); setCrossCombos([]);
      setCrossDigits('');
      setCrossAmount('');
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  // --- Styles ---
  const inputStyle = {
    width: '100%',
    padding: '8px',
    fontSize: '20px',
    fontWeight: '600',
    color: '#1a1a1a',
    backgroundColor: '#ffffff',
    border: '2px solid #e0e0e0',
    borderRadius: '8px',
    outline: 'none',
    textAlign: 'center',
    marginBottom: '8px',
    boxSizing: 'border-box'
  };

  const btnPrimary = {
    width: '100%',
    padding: '12px',
    backgroundColor: '#000',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontWeight: '700',
    fontSize: '16px',
    cursor: 'pointer'
  };

  return (
    <div style={{ position: 'relative' }}>
      <Header />
      <section>
        <div className="head-title text-center" style={{marginTop:"5px"}}>
          <h2 className="title-text"><b>{decodeURIComponent(gameName)}</b></h2>
        </div>
        {error && <div style={{ color: '#b91c1c', textAlign: 'center', marginTop: '8px', fontWeight: '600' }}>{error}</div>}
        {success && <div style={{ color: '#15803d', textAlign: 'center', marginTop: '8px', fontWeight: '600' }}>{success}</div>}

        <div className='tabs-panel'>
          <ul className="tabs">
            <li className={`tab-link ${activeTab === "tab-1" ? "current" : ""}`} onClick={() => setActiveTab("tab-1")}>Jodi</li>
            <li className={`tab-link ${activeTab === "tab-2" ? "current" : ""}`} onClick={() => setActiveTab("tab-2")}>Haruf</li>
            <li className={`tab-link ${activeTab === "tab-3" ? "current" : ""}`} onClick={() => setActiveTab("tab-3")}>Crossing</li>
          </ul>

          <div id="tab-1" className={`tab-content ${activeTab === "tab-1" ? "current" : ""}`}>
            <div className='tabsin' style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px', padding: '10px' }}>
                {jodiNumbers.map((num) => (
                  <div key={num} className={`tbbx box ${savedAmounts[num] ? "active" : ""}`} onClick={() => openPopup(num)} style={{ cursor: 'pointer', border: '1px solid #ddd', borderRadius: '4px', textAlign: 'center', padding: '10px 0' }}>
                    <div className='num' style={{fontWeight: '600'}}>{num}</div>
                    {savedAmounts[num] && <div style={{fontSize: '10px', color: 'red'}}>₹{savedAmounts[num]}</div>}
                  </div>
                ))}
            </div>
          </div>

          <div id="tab-2" className={`tab-content ${activeTab === "tab-2" ? "current" : ""}`}>
            <div className='heading' style={{padding: '10px', fontWeight: 'bold', color:'#000'}}>Andar</div>
            <div className='tabsin' style={{display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px', padding: '0 10px'}}>
                  {harufDigits.map(d => (
                    <div key={`a${d}`} className={`tbbx ${harufAndar[d] ? 'active' : ''}`} onClick={() => openHarufPopup(d, 'andar')} style={{ cursor: 'pointer', border: '1px solid #ddd', borderRadius: '4px', textAlign: 'center', padding: '10px 0' }}>
                      {d} {harufAndar[d] && <div style={{fontSize: '10px', color: 'red'}}>₹{harufAndar[d]}</div>}
                    </div>
                  ))}
            </div>
            <div className='heading' style={{padding: '10px', fontWeight: 'bold', color:"#000"}}>Bahar</div>
            <div className='tabsin' style={{display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px', padding: '0 10px'}}>
                  {harufDigits.map(d => (
                    <div key={`b${d}`} className={`tbbx ${harufBahar[d] ? 'active' : ''}`} onClick={() => openHarufPopup(d, 'bahar')} style={{ cursor: 'pointer', border: '1px solid #ddd', borderRadius: '4px', textAlign: 'center', padding: '10px 0' }}>
                      {d} {harufBahar[d] && <div style={{fontSize: '10px', color: 'red'}}>₹{harufBahar[d]}</div>}
                    </div>
                  ))}
            </div>
          </div>

          <div id="tab-3" className={`tab-content ${activeTab === "tab-3" ? "current" : ""}`}>
            <div className='crossing-number'>
                <input 
                  type="text" 
                  inputMode="numeric"
                  placeholder="Enter Numbers" 
                  value={crossDigits} 
                  onChange={e => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 7);
                    setCrossDigits(val);
                  }} 
                  style={inputStyle}
                />
                <input 
                  type="text" 
                  inputMode="numeric"
                  placeholder="Amount" 
                  value={crossAmount} 
                  onChange={e => handleNumericInput(e.target.value, setCrossAmount)} 
                  style={inputStyle}
        
                />
                
                <div style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input type="checkbox" id="cj" checked={crossIncludeJodi} onChange={() => setCrossIncludeJodi(!crossIncludeJodi)} />
                  <label htmlFor="cj" style={{ fontWeight: 'bold', color: '#000' }}>with jodi</label>
                </div>

                <button type="button" onClick={generateCrossCombos} style={btnPrimary}>Generate Crossing</button>

                {crossCombos.length > 0 && (
                  <div style={{ marginTop: '20px', backgroundColor: '#000', borderRadius: '12px', overflow: 'hidden' }}>
                    <div style={{ backgroundColor: '#e63946', color: 'white', padding: '10px 20px', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                      <span>No.</span>
                      <span>Value</span>
                    </div>
                    <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                      {crossCombos.map((item, index) => (
                        <div key={index} style={{ color: 'white', padding: '12px 20px', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                          <span>{item.number}</span>
                          <span>{item.amount}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          </div>
        </div>
      </section>

      {/* RESTORED POPUP DESIGN (JODI) */}
      {showPopup && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 99999, display: 'flex', justifyContent: 'center', alignItems: 'center' }} onClick={() => setShowPopup(false)}>
          <div style={{ background: '#fff', padding: '24px', borderRadius: '16px', width: '320px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }} onClick={(e) => e.stopPropagation()}>
            <div style={{textAlign: 'center', marginBottom: '15px'}}>
               <span style={{fontSize: '14px', color: '#666', textTransform: 'uppercase', letterSpacing: '1px'}}>Set Price for</span>
               <h2 style={{margin: '5px 0', fontSize: '28px', color: '#000'}}>Number {activeSlot}</h2>
            </div>
            <form onSubmit={saveAmount}>
              <input autoFocus type="text" inputMode="numeric" value={amount} onChange={(e) => handleNumericInput(e.target.value, setAmount)} placeholder="0" style={inputStyle} />
              <button type="submit" style={btnPrimary}>SAVE </button>
            </form>
            <div style={{display: 'flex', gap: '10px', marginTop: '10px'}}>
                <button onClick={removeCurrentJodi} style={{ flex: 1, padding: '10px', background: '#fff', color: '#ff4d4d', border: '1px solid #ff4d4d', borderRadius: '8px', fontWeight: '600' }}>Remove</button>
                <button onClick={() => setShowPopup(false)} style={{ flex: 1, padding: '10px', background: '#f0f0f0', color: '#666', border: 'none', borderRadius: '8px', fontWeight: '600' }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* RESTORED POPUP DESIGN (HARUF) */}
      {harufPopup && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 99999, display: 'flex', justifyContent: 'center', alignItems: 'center' }} onClick={() => setHarufPopup(false)}>
          <div style={{ background: '#fff', padding: '24px', borderRadius: '16px', width: '320px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }} onClick={(e) => e.stopPropagation()}>
            <div style={{textAlign: 'center', marginBottom: '15px'}}>
               <span style={{fontSize: '14px', color: '#666', textTransform: 'uppercase', letterSpacing: '1px'}}>{harufType} Side</span>
               <h2 style={{margin: '5px 0', fontSize: '28px', color: '#000'}}>Digit {harufSlot}</h2>
            </div>
            <form onSubmit={saveHaruf}>
              <input autoFocus type="text" inputMode="numeric" value={amount} onChange={(e) => handleNumericInput(e.target.value, setAmount)} placeholder="0" style={inputStyle} />
              <button type="submit" style={btnPrimary}>SAVE </button>
            </form>
            <div style={{display: 'flex', gap: '10px', marginTop: '10px'}}>
                <button onClick={removeCurrentHaruf} style={{ flex: 1, padding: '10px', background: '#fff', color: '#ff4d4d', border: '1px solid #ff4d4d', borderRadius: '8px', fontWeight: '600' }}>Remove</button>
                <button onClick={() => setHarufPopup(false)} style={{ flex: 1, padding: '10px', background: '#f0f0f0', color: '#666', border: 'none', borderRadius: '8px', fontWeight: '600' }}>Close</button>
            </div>
          </div>
        </div>
      )}

      <div className='payfooter' style={{ position: 'fixed', bottom: 0, width: '100%', background: '#fff', padding: '15px', borderTop: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxSizing: 'border-box' }}>
          <div style={{ padding: '10px 20px', background: '#000', color: '#fff', borderRadius: '8px', fontWeight: 'bold' }}>Total: ₹{getTotal()}</div>
          <button onClick={placeBet} disabled={loading} style={{ padding: '10px 30px', background: '#000', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>{loading ? '...' : 'PLAY'}</button>
      </div>
    </div>
  )
}

const GamePage = () => (
  <Suspense fallback={<div>Loading...</div>}>
    <GamePageInner />
  </Suspense>
)

export default GamePage;