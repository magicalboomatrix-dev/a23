'use client'
import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { userAPI, notificationAPI } from '../lib/api'
import { useAuth } from '../lib/AuthContext'

const Profile = () => {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [tickerIndex, setTickerIndex] = useState(0);

  useEffect(() => {
    userAPI.getProfile().then(res => setProfile(res.user || res)).catch(() => {});
    notificationAPI.recent().then(res => setNotifications(res.notifications || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (notifications.length <= 1) {
      setTickerIndex(0);
      return;
    }
    const intervalId = window.setInterval(() => {
      setTickerIndex((current) => (current + 1) % notifications.length);
    }, 3000);
    return () => window.clearInterval(intervalId);
  }, [notifications]);

  const phone = profile?.phone || user?.phone || '';
  const displayName = profile?.name || phone;

  const tickerItems = notifications.length > 0
    ? notifications.map((item) => item.message || item.title || 'Notification')
    : ['No recent notifications'];

  const menuItemClass = 'flex items-center justify-between border border-[#ebe3d2] bg-white px-4 py-3';

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <div className="mx-auto min-h-screen w-full max-w-[430px] bg-[#f6f7fa] pb-8">
      {/* Header */}
      <header className="relative flex items-center justify-between bg-white px-4 py-3 shadow-sm">
        <Link href="/home">
          <img src="/images/back-btn.png" alt="Back" className="h-5 w-5" />
        </Link>
        <h1 className="absolute left-1/2 -translate-x-1/2 text-lg font-black text-[#333]">Profile</h1>
        <div className="h-5 w-5" />
      </header>

      <main className="mx-auto w-full max-w-[430px] space-y-4 px-4 pt-4">
        {/* Profile Header Card */}
      <section className="flex items-center bg-white px-4 py-6 shadow-sm gap-4 rounded-xl">
  
  <div className="flex h-20 w-20 items-center justify-center overflow-hidden">
  <img
    src="/images/user-pic.jpg"
    alt="User"
    className="h-full w-full object-contain"
  />
</div>

  <div className="flex flex-col">
    <h2 className="text-base font-black text-[#111] text-xl">{displayName}</h2>
    <h3 className="text-sm text-gray-600">+91 {phone}</h3>
  </div>

</section>

        {/* Notifications Ticker */}
        <div className="flex items-center justify-between gap-3 bg-[#111] px-4 py-3 text-white">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center bg-[#1f1f1f]">
              <img src="/images/notify.png" alt="Notice" className="h-4 w-4 object-contain" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#ffd26a]">Notifications</p>
              <p className="truncate text-xs text-white/90" aria-live="polite" key={tickerIndex}>{tickerItems[tickerIndex]}</p>
            </div>
          </div>
          <img src="/images/right-arw.png" alt="Open" className="h-4 w-4 object-contain" />
        </div>

       

        {/* My Account */}
        <section>
          <h3 className="mb-2 px-1 text-xs font-black uppercase tracking-[0.12em] text-[#777]">My Account</h3>
          <div className="divide-y divide-[#f0ece3]">
            <Link href="/account-statement" className={menuItemClass}>
              <div className="flex items-center gap-3 text-sm font-semibold text-[#111]">
                <img src="/images/ref-icon1.png" alt="Account Statement" className="h-9 w-9 object-cover" />
                <span>Account Statement</span>
              </div>
              <img src="/images/right-arw.png" alt="Arrow" className="h-4 w-4 object-contain" />
            </Link>
            <Link href="/profit-loss" className={menuItemClass}>
              <div className="flex items-center gap-3 text-sm font-semibold text-[#111]">
                <img src="/images/ref-icon2.png" alt="Betting Profit and Loss" className="h-9 w-9 object-cover" />
                <span>Betting Profit &amp; Loss</span>
              </div>
              <img src="/images/right-arw.png" alt="Arrow" className="h-4 w-4 object-contain" />
            </Link>
            <Link href="/bank-accounts" className={menuItemClass}>
              <div className="flex items-center gap-3 text-sm font-semibold text-[#111]">
                <img src="/images/ref-icon4.png" alt="Bank Account" className="h-9 w-9 object-cover" />
                <span>Bank Account</span>
              </div>
              <img src="/images/right-arw.png" alt="Arrow" className="h-4 w-4 object-contain" />
            </Link>
          </div>
        </section>

        {/* Information */}
        <section>
          <h3 className="mb-2 px-1 text-xs font-black uppercase tracking-[0.12em] text-[#777]">Information</h3>
          <div className="divide-y divide-[#f0ece3]">
            <Link href="/privacy-policy" className={menuItemClass}>
              <div className="flex items-center gap-3 text-sm font-semibold text-[#111]">
                <div className="flex h-9 w-9 items-center justify-center bg-[#fff4d6]">
                  <i className="fa-solid fa-shield-halved text-[#c8960c]" />
                </div>
                <span>Privacy Policy</span>
              </div>
              <img src="/images/right-arw.png" alt="Arrow" className="h-4 w-4 object-contain" />
            </Link>
            <Link href="/terms-and-conditions" className={menuItemClass}>
              <div className="flex items-center gap-3 text-sm font-semibold text-[#111]">
                <div className="flex h-9 w-9 items-center justify-center bg-[#fff4d6]">
                  <i className="fa-solid fa-file-lines text-[#c8960c]" />
                </div>
                <span>Terms &amp; Conditions</span>
              </div>
              <img src="/images/right-arw.png" alt="Arrow" className="h-4 w-4 object-contain" />
            </Link>
            <Link href="/disclaimer" className={menuItemClass}>
              <div className="flex items-center gap-3 text-sm font-semibold text-[#111]">
                <div className="flex h-9 w-9 items-center justify-center bg-[#fff4d6]">
                  <i className="fa-solid fa-circle-info text-[#c8960c]" />
                </div>
                <span>Disclaimer</span>
              </div>
              <img src="/images/right-arw.png" alt="Arrow" className="h-4 w-4 object-contain" />
            </Link>
          </div>
        </section>

        {/* Logout */}
        <button
          className="w-full bg-[#111] px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-white"
          onClick={handleLogout}
        >
          Logout
        </button>
      </main>
    </div>
  );
};

export default Profile