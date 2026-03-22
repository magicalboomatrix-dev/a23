import Link from 'next/link'
import React, { useState, useEffect } from 'react'
import { useAuth } from '../lib/AuthContext'
import { walletAPI } from '../lib/api'

const NOTICE_TEXT = 'महत्वपूर्ण सूचना: हम केवल संख्याओं के अनुमान/भविष्यवाणी प्रदान करते हैं। हमारा किसी भी प्रकार के जुआ या सट्टेबाजी से कोई संबंध नहीं है। किसी भी लाभ या हानि के लिए आप स्वयं पूरी तरह से जिम्मेदार होंगे।';

const Header = () => {
  
  const [openMenu, setOpenMenu] = useState(false);
  const [usopen, setusOpen] = useState(false);
  const { isLoggedIn, logout } = useAuth();
  const defaultWallet = { balance: 0, bonus_balance: 0, exposure: 0, available_withdrawal: 0, total: 0 };
  const [wallet, setWallet] = useState(defaultWallet);
  const [noticeVisible, setNoticeVisible] = useState(true);

  const applyWallet = (data) => {
    if (data && typeof data === 'object') {
      setWallet({ ...defaultWallet, ...data, balance: parseFloat(data.balance) || 0, bonus_balance: parseFloat(data.bonus_balance) || 0, exposure: parseFloat(data.exposure) || 0, available_withdrawal: parseFloat(data.available_withdrawal) || 0, total: parseFloat(data.total) || 0 });
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      walletAPI.getInfo().then(applyWallet).catch(() => {});
    }
  }, [isLoggedIn]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNoticeVisible((current) => !current);
    }, 3500);

    return () => window.clearInterval(timer);
  }, []);

  const toggleDrawer = () => {
    setusOpen(!usopen);
    if (!usopen && isLoggedIn) {
      walletAPI.getInfo().then(applyWallet).catch(() => {});
    }
  };

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };
  
  return (
    <div className="sticky top-0 z-40 mx-auto w-full max-w-[430px] bg-black text-white shadow-[0_8px_24px_rgba(0,0,0,0.24)]">
      <header>
        <div className="flex items-center justify-between px-2 py-1.5">
          <div className="flex items-center gap-4">
            <div className="flex items-center">
              <Link href="/"><img src="/images/logo.png" alt="Winbuzz" className="h-6 w-auto" /></Link>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
           
            <div className="flex min-w-20 flex-col bg-[#b88422] px-1 py-1 text-left leading-none text-black">
              <span className="text-[10px] font-bold">Bal: {wallet.balance.toFixed(2)}</span>
              <small className="mt-1 text-[8px] font-semibold text-[#00ff66]">Exp: {wallet.exposure}</small>
            </div>
            <button type="button" className="bg-[#b88422] px-2.5 py-1.5" onClick={toggleDrawer} aria-label="Open wallet drawer">
              <img src="/images/per-icon.png" className='h-4 w-4 object-contain' alt="Profile" />
            </button>
          </div>
        </div>
      <div className="bg-[linear-gradient(94deg,#b6842d,#ebda8d_55%,#b7862f)] px-3 py-1.5 text-[12px] text-black overflow-hidden">

  <div className="flex items-center gap-4 whitespace-nowrap animate-marquee">

    <span className="bg-black px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.14em] text-[#ffd26a]">
      Notice
    </span>

    <span
      className={`text-[12px] font-semibold transition-opacity duration-300 ${
        noticeVisible ? "opacity-100" : "opacity-70"
      }`}
    >
      {NOTICE_TEXT}
    </span>

  </div>

</div>

        <div className={`fixed inset-0 z-40 bg-black/40 transition ${openMenu ? 'visible opacity-100' : 'invisible opacity-0'}`} onClick={() => setOpenMenu(false)} />
        <aside className={`fixed left-0 top-0 z-50 h-full w-72 bg-black px-5 py-6 text-white shadow-[8px_0_24px_rgba(0,0,0,0.35)] transition-transform ${openMenu ? 'translate-x-0' : '-translate-x-full'}`}>
          <button type="button" className="absolute left-4 top-4 text-xl" onClick={() => setOpenMenu(false)}>✕</button>
          <div className="mt-8 text-center">
            <Link href="/"><img src="/images/logo.png" alt="Winbuzz" className="mx-auto h-10 w-auto" /></Link>
          </div>
          <ul className="mt-8 space-y-3 text-sm font-semibold text-white/90">
            {['Multi Market', 'Cricket', 'Football', 'Tennis', 'Politics', 'Int Casino', 'Sports Book', 'Horse Racing', 'Greyhound Racing', 'Binary', 'Kabaddi', 'Basketball', 'Baseball'].map((item) => (
              <li key={item} className="border border-white/10 px-4 py-3">{item}</li>
            ))}
          </ul>
        </aside>

        <div className={`fixed inset-0 z-40 bg-black/40 transition ${usopen ? 'visible opacity-100' : 'invisible opacity-0'}`} onClick={() => setusOpen(false)} />
        <div className={`absolute right-4 top-full z-50 mt-3 w-55 bg-[rgba(255,255,255,0.95)] p-3 text-black shadow-[0_16px_32px_rgba(0,0,0,0.25)] transition ${usopen ? 'visible translate-y-0 opacity-100' : 'invisible -translate-y-2 opacity-0'}`}>
          <div className="border border-[#b88831] bg-[#f1f1f1] px-3 py-2">
            <div className="mb-3 flex items-start justify-between gap-3 text-[13px] leading-4">
              <span>Wallet Amount <br/><small>(Inclusive bonus)</small></span>
              <strong>{wallet.total?.toFixed(2) || '0.00'}</strong>
            </div>
            <div className="mb-3 flex items-center justify-between text-[13px] leading-4"><span>Net Exposure</span><strong>{wallet.exposure?.toFixed(2) || '0.00'}</strong></div>
            <div className="mb-3 flex items-center justify-between text-[13px] leading-4"><span>Bonus</span><strong>{wallet.bonus_balance?.toFixed(2) || '0.00'}</strong></div>
            <div className="flex items-center justify-between text-[13px] leading-4"><span>Available Withdrawal</span><strong>{wallet.available_withdrawal?.toFixed(2) || '0.00'}</strong></div>
          </div>
          <button type="button" className="my-3 block w-full bg-[#c9972b] px-4 py-2 text-sm font-semibold text-white">Refer and Earn</button>
          <ul className="border-t border-[#b88831] pt-2 text-sm font-semibold">
            <li><Link href="/account-statement" className='flex items-center gap-2 border-b border-[#eee] px-2 py-2'><i className="fa fa-university"></i> Account Statement</Link></li>
            <li><Link href="/profit-loss" className='flex items-center gap-2 border-b border-[#eee] px-2 py-2'><i className="fa fa-cog"></i> Betting Profit & Loss</Link></li>
            <li><Link href="/" className='flex items-center gap-2 border-b border-[#eee] px-2 py-2'><i className="fa fa-gavel"></i> Bonus Rules</Link></li>
            {isLoggedIn ? (
              <li><button onClick={handleLogout} className='flex w-full items-center gap-2 px-2 py-2 text-left'><i className="fa fa-sign-out"></i> Logout</button></li>
            ) : (
              <li><Link href="/login" className='flex items-center gap-2 px-2 py-2'><i className="fa fa-sign-out"></i> Login</Link></li>
            )}
          </ul>
        </div>
      </header>

    </div>

  
  )
}

export default Header
