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
  const currentYear = new Date().getFullYear();
  const [games, setGames] = useState([]);
  const [liveResults, setLiveResults] = useState([]);
  const [clock, setClock] = useState('');
  const [monthlyData, setMonthlyData] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState((new Date().getMonth() + 1).toString());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

  const loadGames = async () => {
    try {
      const d = await gameAPI.list();
      setGames(d.games || []);
    } catch {}
  };

  const loadLiveResults = async () => {
    try {
      const d = await resultAPI.live();
      setLiveResults(d.results || []);
    } catch {}
  };

  const loadMonthlyChart = async (year = selectedYear, month = selectedMonth) => {
    try {
      const res = await resultAPI.monthly({ year, month });
      setMonthlyData(res);
    } catch {}
  };

  useEffect(() => {
    loadGames();
    loadLiveResults();

    const interval = setInterval(() => {
      setClock(new Date().toLocaleString('en-US', { year:'numeric', month:'long', day:'numeric', hour:'numeric', minute:'2-digit', second:'2-digit', hour12: true }));
    }, 1000);
    const resultRefreshInterval = setInterval(() => {
      loadGames();
      loadLiveResults();
      loadMonthlyChart();
    }, 30000);
    setClock(new Date().toLocaleString('en-US', { year:'numeric', month:'long', day:'numeric', hour:'numeric', minute:'2-digit', second:'2-digit', hour12: true }));
    return () => {
      clearInterval(interval);
      clearInterval(resultRefreshInterval);
    };
  }, []);

  useEffect(() => {
    loadMonthlyChart(selectedYear, selectedMonth);
  }, [selectedMonth, selectedYear]);

  const renderWaitIcon = (size = 28) => (
    <img src="/images/d.gif" alt="wait icon" height={size} width={size} className="inline-block" />
  );

  const getResultForGame = (gameName) => {
    const r = liveResults.find(lr => lr.name === gameName);
    if (!r) {
      return renderWaitIcon(24);
    }

    return r.result_visible && r.result_number ? r.result_number : renderWaitIcon(24);
  };

  const fetchMonthlyChart = async () => {
    await loadMonthlyChart(selectedYear, selectedMonth);
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
  const yearOptions = Array.from({ length: 3 }, (_, index) => String(currentYear - 2 + index));
  const titleBarClass = 'flex items-center justify-between bg-[linear-gradient(94deg,#b6842d,#ebda8d_55%,#b7862f)] px-4 py-1 text-[#1b1403] shadow-[0_8px_18px_rgba(184,132,34,0.18)]';
  const selectClass = 'min-w-[132px] border-r border-[#d8c28f] bg-white px-4 py-2 text-xs font-semibold text-[#312200] outline-none transition focus:border-[#b88422]';

  return (
    <div className="mx-auto w-full max-w-[430px] bg-[#f6f7fa]">
      <Header></Header>
      
      <DepositWithdrawBtns></DepositWithdrawBtns>

      <HomeHeroBanner></HomeHeroBanner>
      <HomeNewLaunch></HomeNewLaunch>

      <section className="">
        <div className="bg-black  text-center shadow-[0_18px_40px_rgba(184,132,34,0.22)]">
        <div className="bg-black  text-lg font-bold tracking-[0.02em]">
  
  <span className="bg-[radial-gradient(circle_at_top,#fff4d4,#f3db9c_48%,#d0a84b)] bg-clip-text text-transparent">
    {clock}
  </span>

</div>
          <p className="mt-2.5 text-lg font-semibold text-[#ffffff]">
            हा भाई यही आती हे सबसे पहले खबर रूको और देखो
          </p>
        </div>
      </section>

      {/* Live Results */}
      {liveResults.map((r, i) => (
      <section className="" key={i}>
        <div className="overflow-hidden border border-[#d9c28d] bg-white shadow-[0_16px_32px_rgba(15,23,42,0.08)]">
          <div className="bg-[linear-gradient(94deg,#b6842d,#ebda8d_55%,#b7862f)] px-4 py-2 text-center text-xs font-bold uppercase tracking-[0.12em] text-[#241700]">
            <p>{r.name}</p>
          </div>
          <div className="bg-[#121212]  text-center text-white">
            <p className="text-[26px] font-black">
              <span>
                {r.result_visible && r.result_number ? r.result_number : renderWaitIcon(50)}
              </span>
            </p>
            <p className="mt-2 text-xs font-bold text-white/90">
              <small>
                {r.result_visible && r.declared_at
                  ? new Date(r.declared_at).toLocaleTimeString('en-US', {hour:'numeric', minute:'2-digit', hour12:true})
                  : renderWaitIcon(18)}
              </small>
            </p>
          </div>
        </div>
      </section>
      ))}

      <section className="">
        <div className="overflow-hidden border border-[#e9dcc0] bg-white shadow-[0_18px_34px_rgba(15,23,42,0.08)]">
          <div className={titleBarClass}>
            <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.16em]">
              <i className="fa fa-play-circle"></i>
              <span>In Play</span>
            </div>
            <span className="bg-[red] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-[#ffffff]">
              <i className="fa fa-plus mr-1"></i>
              Live
            </span>
          </div>

          <div className="">
            <div className="grid grid-cols-3 gap-2 bg-[#fff8e7]  text-[10px] font-black uppercase tracking-[0.1em] text-[#674600]">
              <div className="px-3 py-2 text-center">Yesterday</div>
              <div className="bg-[#111] px-3 py-2 text-center text-[#ffd26a]">Today</div>
              <div className="px-3 py-2 text-center">Play Now</div>
            </div>

            <div className="">
              {games.map((game) => (
              (() => {
                const availability = getGameAvailability(game, new Date());
                return (
              <div className="border border-[#efe1c6] bg-[#fffdfa] p-2" key={game.id}>
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 items-center justify-center overflow-hidden border border-[#ead2a1] bg-[#fff2cd]">
                    <img alt="icon" src="/images/dic.jpg" className="h-full w-full object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-black uppercase tracking-[0.06em] text-[#181818]"><i className="fa fa-gamepad mr-1 text-[#b88422]"></i>{game.name}</h2>
                      <span className="h-2.5 w-2.5 bg-[#2bc26b]"></span>
                    </div>
                    <div className="mt-2 text-[11px] font-semibold leading-5 text-[#6b5a3a]">
                      Bet Opening <span className="bg-[#fff2cd] px-2 py-1 text-[#2f2410]">{game.open_time?.substring(0,5)}</span>
                      <span className="mx-1">/</span>
                      Bet Closing <span className="bg-[#ffe4e4] px-2 py-1 text-[#6d1f1f]">{game.close_time?.substring(0,5)}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-2 grid grid-cols-[1fr_1fr_1.2fr] gap-2">
                  <div className="bg-[#e6f3ff] px-3  text-center text-sm font-black text-[#11446b]">
                    {game.yesterday_result_number || '-'}
                  </div>
                  <div className="bg-[#ffe8ef] px-3  text-center text-sm font-black text-[#8f1841]">
                    {getResultForGame(game.name)}
                  </div>
                  <div className="flex items-center justify-center bg-[#111] px-2 text-center text-[11px] font-black uppercase tracking-[0.1em] text-white">
                    {availability.canPlay ? (
                      <Link href={`/game-page?id=${game.id}&name=${encodeURIComponent(game.name)}`} className="inline-flex w-full items-center justify-center gap-2 bg-[#111] text-[#ffd26a]">
                        <span>Play Now</span>
                        <img src="/images/play-btn.png" className="h-4 w-4 object-contain" alt="Play" />
                      </Link>
                    ) : (
                      <div className="inline-flex min-w-full items-center justify-center opacity-70">
                        {availability.label}
                      </div>
                    )}
                  </div>
                </div>
              </div>
                );
              })()
              ))}

              {games.length === 0 && <p className="py-5 text-center text-sm font-medium text-[#666]">Loading games...</p>}
            </div>
          </div>
        </div>
      </section>

      <section className="">
        <div className="overflow-hidden border border-[#e9dcc0] bg-white shadow-[0_18px_34px_rgba(15,23,42,0.08)]">
          <div className={`${titleBarClass} justify-center`}><h2 className="text-xs font-black uppercase tracking-[0.14em]"><b>Satta King Record Chart</b></h2></div>

          <div className="flex justify-center items-center gap-1 ">
            <select className={selectClass} value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}>
            {monthOptions.map(month => <option key={month.value} value={month.value}>{month.label}</option>)}
            </select>
            <select className={selectClass} value={selectedYear} onChange={e => setSelectedYear(e.target.value)}>
              {yearOptions.map((year) => <option key={year} value={year}>{year}</option>)}
            </select>
            <button className="bg-[#111] px-5 py-2 text-xs font-black uppercase tracking-[0.12em] text-[#ffd26a] transition hover:opacity-90" type="button" onClick={fetchMonthlyChart}>
              Check <span className="arw">→</span>
            </button>
          </div>

          <MonthlyChart data={monthlyData} gameNames={games.map((game) => game.name)}></MonthlyChart>
        </div>
      </section>

      

     
    </div>
  )
}

export default HomePage