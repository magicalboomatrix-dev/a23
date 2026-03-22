'use client'
import React, { useState, useEffect } from 'react'
import Header from '../components/Header';
import YearlyChart from '../components/YearlyChart';
import { resultAPI, gameAPI } from '../lib/api'

const ChartPage = () => {
  const [games, setGames] = useState([]);
  const [selectedGame, setSelectedGame] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [yearlyData, setYearlyData] = useState(null);

  useEffect(() => {
    gameAPI.list().then(res => {
      const g = res.games || [];
      setGames(g);
      if (g.length > 0) setSelectedGame(g[0].name);
    }).catch(() => {});
  }, []);

  const fetchChart = async () => {
    try {
      const res = await resultAPI.yearly({ city: selectedGame, year: selectedYear });
      setYearlyData(res);
    } catch {}
  };

  useEffect(() => { if (selectedGame) fetchChart(); }, [selectedGame, selectedYear]);

  return (
    <div style={{paddingBottom:'100px'}}>
        <Header></Header>

        <div className='page-wrapper0 lr-padding' style={{background:'#fff'}}>
        
        <div className='page-wrapper-inners' style={{marginTop: '5px'}}>
            <div className="head-title topround text-center"><h2 className="title-text"><b>SATTA RECORD CHART {selectedYear}</b></h2></div>

            <div className="select-opts">
                <select className="select-dropdown first" value={selectedGame} onChange={e => setSelectedGame(e.target.value)}>
                    {games.map(g => <option key={g.id} value={g.name}>{g.name}</option>)}
                </select>
                <select className="select-dropdown" value={selectedYear} onChange={e => setSelectedYear(e.target.value)}>
                    <option>2024</option>
                    <option>2025</option>
                    <option>2026</option>
                </select>
                <button className="header_btn" type="button" onClick={fetchChart}>
                    Check <span className="arw">→</span>
                </button>
            </div>

            <YearlyChart data={yearlyData} year={selectedYear}></YearlyChart>

        </div>
        </div>
      
    </div>
  )
}

export default ChartPage
