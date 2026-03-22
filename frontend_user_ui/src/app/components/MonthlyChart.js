import React from 'react'

const MonthlyChart = ({ data }) => {
  // data can be: { chart: { day: { gameName: result } } } or { results: [...] } or []
  let gameNames = [];
  let dateMap = {};

  if (data?.chart && typeof data.chart === 'object' && !Array.isArray(data.chart)) {
    // API returns { chart: { 1: { DISAWAR: '05', ... }, 2: { ... } } }
    const chart = data.chart;
    const nameSet = new Set();
    Object.entries(chart).forEach(([day, games]) => {
      if (games && typeof games === 'object') {
        Object.keys(games).forEach(g => nameSet.add(g));
        dateMap[day] = games;
      }
    });
    gameNames = [...nameSet];
  } else {
    // Fallback: array of results
    const results = Array.isArray(data?.results) ? data.results : (Array.isArray(data) ? data : []);
    gameNames = [...new Set(results.map(r => r.game_name).filter(Boolean))];
    results.forEach(r => {
      const d = r.result_date || r.date;
      const dateStr = d ? new Date(d).toLocaleDateString('en-GB', {day:'2-digit', month:'2-digit'}) : '-';
      if (!dateMap[dateStr]) dateMap[dateStr] = {};
      dateMap[dateStr][r.game_name] = r.result_number;
    });
  }
  const dates = Object.keys(dateMap);

  return (
    <div>
            <div className="head-title topround text-center"><h2 className="title-text"><b>SATTA KING MONTHLY CHART</b></h2></div>

            <div className='table-responsive'>
                <div className='table-inner'>
                <table className="table chart-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            {gameNames.length > 0 ? gameNames.map(g => <th key={g}>{g}</th>) : 
                              <><th>DISAWAR</th><th>DELHI BAZAR</th><th>SHRI GANESH</th><th>FARIDABAD</th><th>GHAZIABAD</th><th>GALI</th></>
                            }
                        </tr>
                    </thead>
                    <tbody>
                        {dates.length > 0 ? dates.map(date => (
                            <tr key={date}>
                                <td>{date}</td>
                                {gameNames.map(g => <td key={g}>{dateMap[date]?.[g] || '-'}</td>)}
                            </tr>
                        )) : (
                            <tr><td colSpan={gameNames.length + 1 || 7} style={{textAlign:'center'}}>No data available</td></tr>
                        )}
                    </tbody>
                </table>
                </div>
            </div>
    </div>
  )
}

export default MonthlyChart
