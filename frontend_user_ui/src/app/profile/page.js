'use client'
import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import styles from "../page.module.css";
import { userAPI, notificationAPI } from '../lib/api'
import { useAuth } from '../lib/AuthContext'

import dynamic from "next/dynamic";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

const Slider = dynamic(() => import("react-slick"), { ssr: false });

const Profile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [notifications, setNotifications] = useState([]);
  
  const settings = {
    vertical: true,
    arrows: false,
    autoplay: true,
    autoplaySpeed: 3000,
    infinite: true,
    slidesToShow: 1,
    slidesToScroll: 1,
    pauseOnHover: false,
  };

  useEffect(() => {
    userAPI.getProfile().then(res => setProfile(res.user || res)).catch(() => {});
    notificationAPI.recent().then(res => setNotifications(res.notifications || [])).catch(() => {});
  }, []);

  const ph = profile?.phone || user?.phone || '';
  const maskedPhone = ph.length >= 10 ? `+91 ${ph.substring(0,3)}****${ph.substring(7)}` : '+91 ****';

  
  return (    
    <div>
      <div className='profile-page-wrap'>
            <main className={styles.pagenotcenter}>
                <div className="page-wrappers profile-page">
                    <div className="rw-flex">    
                     <div className="back-btn">
                        <Link href="/home">
                            <img src="/images/back-btn.png" />
                        </Link>
                    </div>
                    <div className="icon-div" style={{ position: "relative" }}>
                        <div className="left" />
                        <div className="right">
                            <Link href="/">
                            <img alt="customer" width={24} height={24} src="/images/notification.png" />
                            </Link>
                            <Link className="setting" href="/setting">
                            <img alt="setting" width={24} height={24} src="/images/settings.webp" />
                            </Link>
                        </div>
                        </div>
                    </div>
                    
                    <section className="section-1">
                    <div className="userpro">
                        <div className="pic">
                        <img src="/images/user-pic.png" />
                        </div>
                        <h3>{maskedPhone}</h3>
                        {profile?.name && <p style={{textAlign:'center',color:'#333',margin:'4px 0'}}>{profile.name}</p>}
                    </div>

                    <div className='protbs'>
                        <div className="deposit" >
                            <div className='bx-flex'>
                            <div className="bx">
                                <Link href="/deposit">
                                <div className="icon">
                                    <img src="/images/card.png" />
                                </div>
                                <p>Deposit</p>
                                </Link>
                            </div>

                            <div className="bx">
                                <Link href="/withdraw">
                                <div className="icon">
                                    <img src="/images/trans-money.png" />
                                </div>
                                <p>Withdraw</p>
                                </Link>
                            </div>

                            <div className="bx">
                                <Link href="/">
                                <div className="icon">
                                    <img src="/images/envlope.png" />
                                </div>
                                <p>Invite</p>
                                </Link>
                            </div>
                            </div>
                        </div>

                        <div className="notify">
                            <div className="lefts">
                                <div className="icon">
                                <img src="/images/notify.png" />
                                </div>
                                <div className="spr">|</div>
                                <Slider {...settings} className="text-sl">
                                {notifications.length > 0 ? notifications.map((n, i) => (
                                  <p className="text" key={i}>{n.message || n.title}</p>
                                )) : (
                                  <>
                                  <p className="text">Welcome to A23 Satta!</p>
                                  <p className="text">Place bets and win big!</p>
                                  </>
                                )}
                                </Slider>
                            </div>

                            <div className="rights">
                                <div className="icon right">
                                <img src="/images/right-arw.png" />
                                </div>
                            </div>
                        </div>

                       

                    </div>

                 <ul className="menu">
                            <li>
                                <a className="dropdownitem" href="/account-statement">
                                <div className='lft'>
                                <img src="/images/ref-icon1.png"/>
                                Account Statement
                                </div>
                                <div className="arw"><img src="/images/right-arw.png"/></div>
                                </a>
                            </li>
                            <li>
                                <a className="dropdownitem" href="/profit-loss">
                                <div className='lft'>
                                <img src="/images/ref-icon2.png"/>
                                Betting Profit &amp; Loss
                                </div>
                                <div className="arw"><img src="/images/right-arw.png"/></div>
                                </a>
                            </li>
                            <li>
                                <a className="dropdownitem" href="/">
                                <div className='lft'>
                                <img src="/images/ref-icon3.png"/>
                                Bonus Rules
                                </div>
                                <div className="arw"><img src="/images/right-arw.png"/></div>
                                </a>
                            </li>
                            <li>
                                <a className="dropdownitem" href="/bind-bank-card">
                                <div className='lft'>
                                <img src="/images/ref-icon4.png"/>
                                Bank Account
                                </div>
                                <div className="arw"><img src="/images/right-arw.png"/></div>
                                </a>
                            </li>
                            </ul>
                        
                    </section>

        </div>
        

        </main>
        </div>
    </div>
  )
}

export default Profile