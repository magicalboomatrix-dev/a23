'use client'
import React from 'react'
import Link from 'next/link'
import styles from "../page.module.css";

import dynamic from "next/dynamic";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

const Slider = dynamic(() => import("react-slick"), { ssr: false });

const Profile = () => {
  
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

  
  return (    
    <div>
      <div className='profile-page-wrap'>
            <main className={styles.pagenotcenter}>
                <div className="page-wrappers profile-page">
                    <div className="rw-flex">    
                     <div className="back-btn">
                        <Link href="/login">
                            <img src="/images/back-btn.png" />
                        </Link>
                    </div>
                    <div className="icon-div" style={{ position: "relative" }}>
                        <div className="left" />
                        <div className="right">
                            <Link href="/">
                            <img
                                alt="customer"
                                width={24}
                                height={24}
                                src="/images/notification.png"
                            />
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
                        <h3>+91 782****173</h3>
                    </div>

                    {/*<div className='avail-amount text-center'>
                        <h4>Available Amount</h4>
                        <div className='amount'><i className='fa fa-inr'></i>100</div>
                    </div>*/}

                    <div className='protbs'>
                        <div className="deposit" >
                            {/*<div className='bgimage'><img src='../images/card-bg.png' /></div>*/}
                            <div className='bx-flex'>
                            <div className="bx">
                                <Link href="/">
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
                                <p className="text">9856****8021 • Delhi Bazaar • Haruf Ander → ₹34800</p>
                                <p className="text">9811****7065 • Shree Ganesh • Haruf Bahar → ₹97000</p>
                                <p className="text">9877****0001 • Disawar • Jodi → ₹57000</p>
                                <p className="text">9816****7771 • Disawar • Haruf Ander → ₹14800</p>
                                <p className="text">9811****7065 • Shree Ganesh • Haruf Ander → ₹87000</p>
                                <p className="text">9817****8821 • Ghaziabad • Jodi → ₹77800</p>
                                <p className="text">9823****7005 • Gali • Haruf Ander → ₹12700</p>
                                <p className="text">9833****1110 • Ghaziabad • Haruf Bahar → ₹27800</p>
                                <p className="text">9815****5678 • Faridabad • Haruf Ander → ₹19700</p>
                                <p className="text">9888****8888 • Shree Ganesh • Jodi → ₹88000</p>
                                <p className="text">9778****7788 • Faridabad • Jodi → ₹12500</p>                                
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