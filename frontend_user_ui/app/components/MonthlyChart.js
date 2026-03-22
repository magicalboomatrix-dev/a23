import React from 'react'

function renderWaitIcon() {
  return <img src="/images/d.gif" alt="wait icon" height={24} width={24} className="inline-block" />;
}

function renderChartCell(cell) {
  if (!cell) {
    return '-';
  }

  if (typeof cell === 'object' && !Array.isArray(cell)) {
    if (cell.has_result && !cell.result_visible) {
      return renderWaitIcon();
    }

    return cell.result_number || '-';
  }

  return cell || '-';
}

const MonthlyChart = ({ data, gameNames: providedGameNames = [] }) => {
  // data can be: { chart: { day: { gameName: result } } } or { results: [...] } or []
  let gameNames = [];
  const dateMap = {};

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
  if (gameNames.length === 0 && providedGameNames.length > 0) {
    gameNames = providedGameNames;
  }

  const year = Number(data?.year) || new Date().getFullYear();
  const month = Number(data?.month) || (new Date().getMonth() + 1);
  const now = new Date();
  const isCurrentMonth = year === now.getFullYear() && month === (now.getMonth() + 1);
  const lastDayOfMonth = new Date(year, month, 0).getDate();
  const maxDay = isCurrentMonth ? now.getDate() : lastDayOfMonth;
  const dates = Array.from({ length: maxDay }, (_, index) => String(index + 1));
  const todayDay = isCurrentMonth ? String(now.getDate()) : null;

  const formatDateLabel = (day) => {
    const safeDay = String(day).padStart(2, '0');
    return `${safeDay}/${String(month).padStart(2, '0')}`;
  };

  return (
    <div className=" w-full max-w-[430px]">
        <div className="bg-[linear-gradient(94deg,#b6842d,#ebda8d_55%,#b7862f)] px-4 py-2.5 text-center text-[#111]"><h2 className="text-sm font-semibold uppercase tracking-[0.08em]"><b>Satta King Monthly Chart</b></h2></div>

        <div className='overflow-x-auto border border-t-0 border-[#d6b774] bg-white shadow-[0_12px_28px_rgba(79,52,10,0.08)]'>
          <div className='min-w-max'>
          <table className="w-full border-collapse text-center text-xs text-[#111]">
                    <thead>
                        <tr>
                <th className="border-b border-r border-[#ead8ab] bg-[#f7f0e3] px-3 py-2 font-semibold">Date</th>
                {gameNames.map(g => <th key={g} className="border-b border-r border-[#ead8ab] bg-[#f7f0e3] px-3 py-2 font-semibold last:border-r-0">{g}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {dates.length > 0 ? dates.map(date => (
                          <tr key={date} style={todayDay === date ? { backgroundColor: '#fff3cd', fontWeight: 700 } : undefined}>
                <td className="border-b border-r border-[#f0e3c6] px-3 py-2 font-medium">{formatDateLabel(date)}</td>
                            {gameNames.map(g => (
                  <td key={g} className="border-b border-r border-[#f0e3c6] px-3 py-2 last:border-r-0" style={todayDay === date ? { backgroundColor: '#ffe8a3' } : undefined}>{renderChartCell(dateMap[date]?.[g])}</td>
                            ))}
                            </tr>
                        )) : (
                <tr><td className="px-3 py-6 text-center" colSpan={gameNames.length + 1 || 7}>No data available</td></tr>
                        )}
                    </tbody>
                </table>
                </div>
            </div>
    </div>
  )
}

export default MonthlyChart
