'use client'
import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { userAPI, notificationAPI } from '../lib/api'
import { useAuth } from '../lib/AuthContext'

const Profile = () => {
  const { user } = useAuth();
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

  const ph = profile?.phone || user?.phone || '';
    const maskedPhone = ph.length >= 8 ? `${ph.slice(0, 4)}****${ph.slice(-3)}` : '****';
    const tickerItems = notifications.length > 0
        ? notifications.map((item) => item.message || item.title || 'Notification')
        : ['No recent notifications'];
    const menuItemClass = 'flex items-center justify-between border border-[#ebe3d2] bg-white px-4 py-3 ';

  
  return (    
        <div className="mx-auto min-h-screen w-full max-w-[430px] bg-[#ffffff] pt-2">
            <main className="mx-auto w-full max-w-[420px]">
                <div className="flex items-center justify-between px-2 py-1 ">
                    <div className="back-btn">
                        <Link href="/home">
                            <img src="/images/back-btn.png" alt="Back" className="h-5 w-5" />
                        </Link>
                    </div>
                    <div className="flex items-center gap-4">
                        <Link href="/">
                            <img alt="customer" width={24} height={24} src="/images/notification.png" />
                        </Link>
                        <Link href="/setting">
                            <img alt="setting" width={24} height={24} src="/images/settings.webp" />
                        </Link>
                    </div>
                </div>

                <section className="mt-4">
                    <div className="bg-white  py-2 text-center">
                        <div className="mx-auto flex h-20 w-20 items-center justify-center overflow-hidden">
                            <img src="/images/user-pic.png" alt="User" className="h-full w-full object-cover" />
                        </div>
                        <h3 className="mt-3 text-base font-black text-[#111]">{maskedPhone}</h3>
                        {profile?.name && <p className="mt-1 text-sm text-[#333]">{profile.name}</p>}
                    </div>

                    
                        <div className="grid grid-cols-3 bg-[#ffffff]">
                            {[
                                { href: '/deposit', icon: '/images/card.png', label: 'Deposit' },
                                { href: '/withdraw', icon: '/images/trans-money.png', label: 'Withdraw' },
                                { href: '/', icon: '/images/envlope.png', label: 'Invite' },
                            ].map((item) => (
                                <Link key={item.label} href={item.href} className="bg-white px-3 py-3.5 text-center ">
                                    <div className="mx-auto flex h-11 w-11 items-center justify-center bg-[#fff4d6]">
                                        <img src={item.icon} alt={item.label} className="h-5 w-5 object-contain" />
                                    </div>
                                    <p className="mt-3 text-xs font-black uppercase tracking-[0.08em] text-[#111]">{item.label}</p>
                                </Link>
                            ))}
                        </div>

                        <div className="flex items-center justify-between gap-3 bg-[#111] px-4 py-3 text-white ">
                            <div className="flex min-w-0 items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center bg-[#1f1f1f]">
                                    <img src="/images/notify.png" alt="Notice" className="h-4.5 w-4.5 object-contain" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#ffd26a]">Notifications</p>
                                    <p className="truncate text-xs text-white/90" aria-live="polite" key={tickerIndex}>{tickerItems[tickerIndex]}</p>
                                </div>
                            </div>
                            <img src="/images/right-arw.png" alt="Open" className="h-4 w-4 object-contain" />
                        </div>
                    

                    <div >
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
                        <Link href="/" className={menuItemClass}>
                            <div className="flex items-center gap-3 text-sm font-semibold text-[#111]">
                                <img src="/images/ref-icon3.png" alt="Bonus Rules" className="h-9 w-9 object-cover" />
                                <span>Bonus Rules</span>
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
            </main>
    </div>
  )
}

export default Profile