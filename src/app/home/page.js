'use client'
import React from 'react'
import Header from '../components/Header';
import HomeHeroBanner from '../components/HomeHeroBanner';
import HomeNewLaunch from '../components/HomeNewLaunch';
import Link from 'next/link';
import Footer from '../components/Footer';
import YearlyChart from '../components/YearlyChart';
import MonthlyChart from '../components/MonthlyChart';
import DepositWithdrawBtns from '../components/DepositWithdrawBtns';

const HomePage = () => {
  return (
    <div style={{paddingBottom:'100px'}}>
      <Header></Header>
      
      <DepositWithdrawBtns></DepositWithdrawBtns>

      <HomeHeroBanner></HomeHeroBanner>
      <HomeNewLaunch></HomeNewLaunch>

      <section className="circlebox">
        <div className="container">
          <div className="row">
            <div className="col-md-12 text-center">
              <div className="liveresult">
                <div id="clockbox">
                  <div id="clockbox">March 7, 2026 at 4:26:37 PM</div>
                </div>
                <p className="hintext" style={{ padding: 0 }}>
                  हा भाई यही आती हे सबसे पहले खबर रूको और देखो
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="circlebox2">
        <div>
          <div className="sattaname">
            <p style={{ margin: 0 }}>SARAFA BAZAR</p>
          </div>
          <div className="sattaresult">
            <p style={{ margin: 0, padding: 0 }}>
              <span style={{ letterSpacing: 4 }}>
                <img src="/images/d.gif" alt="wait icon" height={50} width={50} />
              </span>
            </p>
            <p style={{ margin: "5px 0px 0px", fontSize: 14, fontWeight: "bold" }}>
              <small style={{ color: "white" }}>5:15 PM</small>
            </p>
          </div>
        </div>
      </section>

      <section className="circlebox2">
        <div>
          <div className="sattaname">
            <p style={{ margin: 0 }}>DELHI BAZAR</p>
          </div>
          <div className="sattaresult">
            <p style={{ margin: 0, padding: 0 }}>
              <span style={{ letterSpacing: 4 }}>
                57
              </span>
            </p>
            <p style={{ margin: "5px 0px 0px", fontSize: 14, fontWeight: "bold" }}>
              <small style={{ color: "white" }}>5:15 PM</small>
            </p>
          </div>
        </div>
      </section>

    {/*<section className='mundarashi'>
     <div className="table-inner">
      <div className='card-body-wrap'>
        <div className="rows">
          <div className="card-body notification munda">
            <h2>
              <b>मुंडा 01 से 100 नम्बरो तक की राशि/फैमिली</b>
            </h2>
            <Link className="btnlink header_btn blck" href="/"> Check <span className="arw">→</span></Link>
          </div>
        </div>
       </div>
       </div>
    </section>*/}

      <section className='playtable'>      
      <div className="head-title topround d-flex" style={{borderRadius:0}}>
        <div className='left'><span className="title-text"><i className="fa fa-play-circle"></i> IN PLAY</span></div>
        <div className='right'><span className="title-btn"><i className="fa fa-plus"></i> LIVE</span></div>
      </div>

        <div className='table-responsive'>   

                <div className='resTable'>
                  <div className='tablebtn'>
                    <div className='lbls'><p>YESTERDAY</p></div>
                    <div className='lbls active'><p>TODAY</p></div>
                    <div className='lbls'><p>PLAY NOW</p></div>
                  </div>

                  <div className='games-tb'>
                    <div className='gm-row'>
                      <div className='top'>
                        <div className='icon'><img alt="icon" src="/images/dic.jpg" /></div>
                        <div className='gm-name-time'>
                          <div className='gm-name'><h2><i className="fa fa-gamepad"></i> DISAWAR </h2><span className='point'></span></div>
                          <div className='gm-time'>Bet Opening <span className='time'>14:20</span> / Bet Closing <span className='time'>09:20</span></div>
                        </div>
                      </div>
                      <div className='bottom-info'>
                        <div className='dt-info light-blue'>-</div>
                        <div className='dt-info light-pink'>-</div>
                        <div className='play-now-btn'><Link href="/game-page">PLAY NOW <img src="/images/play-btn.png" className='icon' alt="Winbuzz" /></Link></div>
                      </div>
                    </div>

                    <div className='gm-row'>
                      <div className='top'>
                        <div className='icon'><img alt="icon" src="/images/dic.jpg" /></div>
                        <div className='gm-name-time'>
                          <div className='gm-name'><h2><i className="fa fa-gamepad"></i> DISAWAR </h2><span className='point'></span></div>
                          <div className='gm-time'>Bet Opening <span className='time'>14:20</span> / Bet Closing <span className='time'>09:20</span></div>
                        </div>
                      </div>
                      <div className='bottom-info'>
                        <div className='dt-info light-blue'>-</div>
                        <div className='dt-info light-pink'>-</div>
                        <div className='play-now-btn'><Link href="/game-page">PLAY NOW <img src="/images/play-btn.png" className='icon' alt="Winbuzz" /></Link></div>
                      </div>
                    </div>

                    <div className='gm-row'>
                      <div className='top'>
                        <div className='icon'><img alt="icon" src="/images/dic.jpg" /></div>
                        <div className='gm-name-time'>
                          <div className='gm-name'><h2><i className="fa fa-gamepad"></i> DISAWAR </h2><span className='point'></span></div>
                          <div className='gm-time'>Bet Opening <span className='time'>14:20</span> / Bet Closing <span className='time'>09:20</span></div>
                        </div>
                      </div>
                      <div className='bottom-info'>
                        <div className='dt-info light-blue'>-</div>
                        <div className='dt-info light-pink'>- <div className='locked'><img src="/images/lock.png" className='icon' alt="Winbuzz" /></div></div>
                        <div className='play-now-btn'><Link href="/game-page">PLAY NOW <img src="/images/play-btn.png" className='icon' alt="Winbuzz" /></Link></div>
                      </div>
                    </div>
                  </div>

                  <div className="head-title topround d-flex" style={{borderRadius:0,marginTop:"10px"}}>
                    <div className='left'><span className="title-text"><i className="fa fa-play-circle"></i> IN PLAY</span></div>
                    <div className='right'><span className="title-btn"><i className="fa fa-plus"></i> LIVE</span></div>
                  </div>
                  <div className='tablebtn'>
                    <div className='lbls'><p>YESTERDAY</p></div>
                    <div className='lbls active'><p>TODAY</p></div>
                    <div className='lbls'><p>PLAY NOW</p></div>
                  </div>
                  <div className='games-tb'>
                    <div className='gm-row'>
                      <div className='top'>
                        <div className='icon'><img alt="icon" src="/images/dic.jpg" /></div>
                        <div className='gm-name-time'>
                          <div className='gm-name'><h2><i className="fa fa-gamepad"></i> DISAWAR </h2><span className='point'></span></div>
                          <div className='gm-time'>Bet Opening <span className='time'>14:20</span> / Bet Closing <span className='time'>09:20</span></div>
                        </div>
                      </div>
                      <div className='bottom-info'>
                        <div className='dt-info light-blue'>-</div>
                        <div className='dt-info light-pink'>-</div>
                        <div className='play-now-btn'><Link href="/game-page">PLAY NOW <img src="/images/play-btn.png" className='icon' alt="Winbuzz" /></Link></div>
                      </div>
                    </div>

                    <div className='gm-row'>
                      <div className='top'>
                        <div className='icon'><img alt="icon" src="/images/dic.jpg" /></div>
                        <div className='gm-name-time'>
                          <div className='gm-name'><h2><i className="fa fa-gamepad"></i> DISAWAR </h2><span className='point'></span></div>
                          <div className='gm-time'>Bet Opening <span className='time'>14:20</span> / Bet Closing <span className='time'>09:20</span></div>
                        </div>
                      </div>
                      <div className='bottom-info'>
                        <div className='dt-info light-blue'>-</div>
                        <div className='dt-info light-pink'>-</div>
                        <div className='play-now-btn'><Link href="/game-page">PLAY NOW <img src="/images/play-btn.png" className='icon' alt="Winbuzz" />  <div className='locked'><img src="/images/lock.png" className='icon' alt="Winbuzz" /></div></Link></div>
                      </div>
                    </div>

                    <div className='gm-row'>
                      <div className='top'>
                        <div className='icon'><img alt="icon" src="/images/dic.jpg" /></div>
                        <div className='gm-name-time'>
                          <div className='gm-name'><h2><i className="fa fa-gamepad"></i> DISAWAR </h2><span className='point'></span></div>
                          <div className='gm-time'>Bet Opening <span className='time'>14:20</span> / Bet Closing <span className='time'>09:20</span></div>
                        </div>
                      </div>
                      <div className='bottom-info'>
                        <div className='dt-info light-blue'>-</div>
                        <div className='dt-info light-pink'>-</div>
                        <div className='play-now-btn'><Link href="/game-page">PLAY NOW <img src="/images/play-btn.png" className='icon' alt="Winbuzz" /></Link></div>
                      </div>
                    </div>
                  </div>
                </div>             

               {/* <div className='table-inner'>
                <table className="table chart-table">
                    <thead>
                        <tr>
                            <th>सट्टा का नाम</th>
                            <th>कल आया था</th>
                            <th>आज का रिज़ल्ट</th>
                        </tr>
                        </thead>

                        <tbody>
                            <tr>
                                <td className='blankdata dark-gray'><span className='gamename'>DISAWAR</span> <br/><span className='gametime'>10:50</span></td>
                                <td className='blankdata light-blue'>- <div className='locked'><img src="/images/lock.png" className='icon' alt="Winbuzz" /></div></td>
                                <td><Link href="/" className='gameicon'><img src="/images/game-play1.png" className='icon' alt="Winbuzz" /></Link></td>            
                            </tr>

                        </tbody>
                </table>
                </div>*/}


              
            </div>
      </section>

      <div className="head-title topround text-center" style={{borderRadius:0}}><h2 className="title-text"><b>SATTA KING RECORD CHART</b></h2></div>

      <div className="select-opts">
          <select className="select-dropdown first">
              <option value="AGRA">AGRA</option>
              <option value="ALIGARH">ALIGARH</option>
              <option value="ALWAR">ALWAR</option>
              <option value="DISAWAR">DISAWAR</option>
              <option value="DWARKA">DWARKA</option>
              <option value="Delhi Bazar">Delhi Bazar</option>
              <option value="FARIDABAD">FARIDABAD</option>
          </select>
          <select className="select-dropdown">
              <option>2024</option>
              <option>2025</option>
              <option>2026</option>
          </select>
          <button className="header_btn" type="button">
              Check <span className="arw">→</span>
          </button>
      </div>

      <MonthlyChart></MonthlyChart>

      

     
    </div>
  )
}

export default HomePage