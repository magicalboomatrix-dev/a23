'use client'
import React, { useState, useEffect } from 'react'
import Header from '../components/Header';
import HomeHeroBanner from '../components/HomeHeroBanner';
import HomeNewLaunch from '../components/HomeNewLaunch';
import Link from 'next/link';
import Footer from '../components/Footer';
import MonthlyChart from '../components/MonthlyChart';
import DepositWithdrawBtns from '../components/DepositWithdrawBtns';
import { gameAPI, resultAPI } from '../lib/api';

function parseTimeParts(timeValue) {
  const parts = String(timeValue || '').split(':').map(Number);
  return { hours: parts[0] || 0, minutes: parts[1] || 0 };
}

function getGameWindow(timeOpen, timeClose, referenceDate = new Date()) {
  const openParts = parseTimeParts(timeOpen);
  const closeParts = parseTimeParts(timeClose);
  const isOvernight = closeParts.hours < openParts.hours ||
    (closeParts.hours === openParts.hours && closeParts.minutes < openParts.minutes);

  const openTime = new Date(referenceDate);
  openTime.setHours(openParts.hours, openParts.minutes, 0, 0);

  const closeTime = new Date(referenceDate);
  closeTime.setHours(closeParts.hours, closeParts.minutes, 0, 0);

  if (isOvernight) {
    if (referenceDate.getHours() > closeParts.hours ||
        (referenceDate.getHours() === closeParts.hours && referenceDate.getMinutes() >= closeParts.minutes)) {
      openTime.setDate(openTime.getDate() - 1);
    } else {
      closeTime.setDate(closeTime.getDate() + 1);
    }
  }

  return { openTime, closeTime };
}

function getGameAvailability(game, referenceDate = new Date()) {
  const { openTime, closeTime } = getGameWindow(game.open_time, game.close_time, referenceDate);

  if (referenceDate < openTime) {
    return {
      canPlay: false,
      label: `Opens ${openTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })}`,
    };
  }

  if (referenceDate >= closeTime) {
    return {
      canPlay: false,
      label: 'Closed',
    };
  }

  return {
    canPlay: true,
    label: 'PLAY NOW',
  };
}

const HomePage = () => {
  const [games, setGames] = useState([]);
  const [liveResults, setLiveResults] = useState([]);
  const [clock, setClock] = useState('');
  const [monthlyData, setMonthlyData] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState((new Date().getMonth() + 1).toString());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

  useEffect(() => {
    gameAPI.list().then(d => {
      const list = d.games || [];
      setGames(list);
    }).catch(() => {});
    resultAPI.live().then(d => setLiveResults(d.results || [])).catch(() => {});

    const interval = setInterval(() => {
      setClock(new Date().toLocaleString('en-US', { year:'numeric', month:'long', day:'numeric', hour:'numeric', minute:'2-digit', second:'2-digit', hour12: true }));
    }, 1000);
    setClock(new Date().toLocaleString('en-US', { year:'numeric', month:'long', day:'numeric', hour:'numeric', minute:'2-digit', second:'2-digit', hour12: true }));
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    resultAPI.monthly({ year: selectedYear, month: selectedMonth }).then(setMonthlyData).catch(() => {});
  }, [selectedMonth, selectedYear]);

  const getResultForGame = (gameName) => {
    const r = liveResults.find(lr => lr.name === gameName);
    return r ? r.result_number : null;
  };

  const fetchMonthlyChart = async () => {
    try {
      const res = await resultAPI.monthly({ year: selectedYear, month: selectedMonth });
      setMonthlyData(res);
    } catch {}
  };

  const monthOptions = [
    { value: '1', label: 'January' },
    { value: '2', label: 'February' },
    { value: '3', label: 'March' },
    { value: '4', label: 'April' },
    { value: '5', label: 'May' },
    { value: '6', label: 'June' },
    { value: '7', label: 'July' },
    { value: '8', label: 'August' },
    { value: '9', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' },
  ];

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
                  <div id="clockbox">{clock}</div>
                </div>
                <p className="hintext" style={{ padding: 0 }}>
                  हा भाई यही आती हे सबसे पहले खबर रूको और देखो
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Live Results */}
      {liveResults.map((r, i) => (
      <section className="circlebox2" key={i}>
        <div>
          <div className="sattaname">
            <p style={{ margin: 0 }}>{r.name}</p>
          </div>
          <div className="sattaresult">
            <p style={{ margin: 0, padding: 0 }}>
              <span style={{ letterSpacing: 4 }}>
                {r.result_number || <img src="/images/d.gif" alt="wait icon" height={50} width={50} />}
              </span>
            </p>
            <p style={{ margin: "5px 0px 0px", fontSize: 14, fontWeight: "bold" }}>
              <small style={{ color: "white" }}>{r.declared_at ? new Date(r.declared_at).toLocaleTimeString('en-US', {hour:'numeric', minute:'2-digit', hour12:true}) : 'Pending'}</small>
            </p>
          </div>
        </div>
      </section>
      ))}

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
                    {games.map((game) => (
                    (() => {
                      const availability = getGameAvailability(game, new Date());
                      return (
                    <div className='gm-row' key={game.id}>
                      <div className='top'>
                        <div className='icon'><img alt="icon" src="/images/dic.jpg" /></div>
                        <div className='gm-name-time'>
                          <div className='gm-name'><h2><i className="fa fa-gamepad"></i> {game.name} </h2><span className='point'></span></div>
                          <div className='gm-time'>Bet Opening <span className='time'>{game.open_time?.substring(0,5)}</span> / Bet Closing <span className='time'>{game.close_time?.substring(0,5)}</span></div>
                        </div>
                      </div>
                      <div className='bottom-info'>
                        <div className='dt-info light-blue'>{game.result_number || '-'}</div>
                        <div className='dt-info light-pink'>{getResultForGame(game.name) || '-'}</div>
                        <div className='play-now-btn'>
                          {availability.canPlay ? (
                            <Link href={`/game-page?id=${game.id}&name=${encodeURIComponent(game.name)}`}>
                              PLAY NOW <img src="/images/play-btn.png" className='icon' alt="Play" />
                            </Link>
                          ) : (
                            <div className='opacity-70 pointer-events-none' style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: '100%' }}>
                              {availability.label}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                      );
                    })()
                    ))}

                    {games.length === 0 && <p style={{textAlign:'center',padding:'20px',color:'#666'}}>Loading games...</p>}
                  </div>
                </div>              
            </div>
      </section>

      <div className="head-title topround text-center" style={{borderRadius:0}}><h2 className="title-text"><b>SATTA KING RECORD CHART</b></h2></div>

      <div className="select-opts">
          <select className="select-dropdown first" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}>
            {monthOptions.map(month => <option key={month.value} value={month.value}>{month.label}</option>)}
          </select>
          <select className="select-dropdown" value={selectedYear} onChange={e => setSelectedYear(e.target.value)}>
              <option>2024</option>
              <option>2025</option>
              <option>2026</option>
          </select>
          <button className="header_btn" type="button" onClick={fetchMonthlyChart}>
              Check <span className="arw">→</span>
          </button>
      </div>

        <MonthlyChart data={monthlyData}></MonthlyChart>

      

     
    </div>
  )
}

export default HomePage