'use client'
import React, { useState, useEffect } from 'react'
import Header from '../components/Header';
import YearlyChart from '../components/YearlyChart';
import { resultAPI, gameAPI } from '../lib/api'

const ChartPage = () => {
  const [games, setGames] = useState([]);
  const [selectedGame, setSelectedGame] = useState('');
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());
  const [yearlyData, setYearlyData] = useState(null);
  const yearOptions = Array.from({ length: 3 }, (_, index) => String(currentYear - 2 + index));

  const fetchChart = async (gameName = selectedGame, yearValue = selectedYear) => {
    if (!gameName) {
      return;
    }

    try {
      const res = await resultAPI.yearly({ city: gameName, year: yearValue });
      setYearlyData(res);
    } catch {}
  };

  useEffect(() => {
    gameAPI.list().then(res => {
      const g = res.games || [];
      setGames(g);
      if (g.length > 0) setSelectedGame(g[0].name);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedGame) {
      return;
    }

    fetchChart(selectedGame, selectedYear);

    const intervalId = setInterval(() => {
      fetchChart(selectedGame, selectedYear);
    }, 30000);

    return () => clearInterval(intervalId);
  }, [selectedGame, selectedYear]);

  return (
    <div>
        <Header></Header>

      <div className='bg-white ext'>
        
      <div className='mx-auto w-full max-w-[430px] '>
        <div className="bg-[linear-gradient(94deg,#b6842d,#ebda8d_55%,#b7862f)] px-4 py-2.5 text-center text-[#111]"><h2 className="text-sm font-semibold uppercase tracking-[0.08em]"><b>Satta Record Chart {selectedYear}</b></h2></div>

        <div className="border border-t-0 border-[#d6b774] bg-white  shadow-[0_12px_28px_rgba(79,52,10,0.08)] p-3">
         <div className="flex gap-1">
  <select
    className="h-9 flex-1 border border-[#d8d1c4] bg-[#faf7f0] px-2 text-sm font-medium text-[#111] outline-none"
    value={selectedGame}
    onChange={e => setSelectedGame(e.target.value)}
  >
    {games.map(g => (
      <option key={g.id} value={g.name}>{g.name}</option>
    ))}
  </select>

  <select
    className="h-9flex-1 border border-[#d8d1c4] bg-[#faf7f0] px-2 text-sm font-medium text-[#111] outline-none"
    value={selectedYear}
    onChange={e => setSelectedYear(e.target.value)}
  >
    {yearOptions.map(year => (
      <option key={year} value={year}>{year}</option>
    ))}
  </select>

  <button
    className="h-9 flex-1 bg-[#111] text-sm font-semibold text-[#ebda8d]"
    type="button"
    onClick={() => fetchChart(selectedGame, selectedYear)}
  >
    Check →
  </button>
</div>
            </div>

                <YearlyChart data={yearlyData} year={selectedYear}></YearlyChart>

        </div>
        </div>
      
    </div>
  )
}

export default ChartPage
