import React from 'react'

function renderWaitIcon() {
  return <img src="/images/d.gif" alt="wait icon" height={24} width={24} className="inline-block" />;
}

function renderYearlyCell(cell) {
  if (!cell) {
    return '';
  }

  if (typeof cell === 'object' && !Array.isArray(cell)) {
    if (cell.has_result && !cell.result_visible) {
      return renderWaitIcon();
    }

    return cell.result_number || '';
  }

  return cell;
}

const YearlyChart = ({ data, year }) => {
    const months = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
    const days = Array.from({ length: 31 }, (_, i) => i + 1);
    const displayYear = year || new Date().getFullYear();

    // data can be { chart: { day: { month_index: result } } } or { results: [...] } or similar
    const lookup = {};

    if (data?.chart && typeof data.chart === 'object' && !Array.isArray(data.chart)) {
      // API returns { chart: { day: [jan,feb,...,dec] } } or { chart: { day: { month: result } } }
      Object.entries(data.chart).forEach(([day, val]) => {
        if (Array.isArray(val)) {
          val.forEach((res, monthIdx) => {
            if (res && (typeof res !== 'object' || res.has_result || res.result_number || res.result_visible === false)) {
              lookup[`${day}-${monthIdx + 1}`] = res;
            }
          });
        } else if (val && typeof val === 'object') {
          Object.entries(val).forEach(([m, res]) => {
            if (res && (typeof res !== 'object' || res.has_result || res.result_number || res.result_visible === false)) {
              lookup[`${day}-${parseInt(m) + 1}`] = res;
            }
          });
        }
      });
    } else {
      const results = Array.isArray(data?.results) ? data.results : (Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []));
      results.forEach(r => {
        const d = r.day || new Date(r.result_date || r.date).getDate();
        const m = r.month != null ? r.month : new Date(r.result_date || r.date).getMonth() + 1;
        lookup[`${d}-${m}`] = r.result_number;
      });
    }

  return (
    <div className="mx-auto w-full max-w-[430px] ">
        <div className="bg-[linear-gradient(94deg,#b6842d,#ebda8d_55%,#b7862f)] px-4 py-2.5 text-center text-[#111]"><h2 className="text-sm font-semibold uppercase tracking-[0.08em]"><b>Yearly Chart {displayYear}</b></h2></div>

        <div className='overflow-x-auto border border-t-0 border-[#d6b774] bg-white shadow-[0_12px_28px_rgba(79,52,10,0.08)]'>
          <div className='min-w-max'>
          <table className="w-full border-collapse text-center text-xs text-[#111]">
                    <thead>
                        <tr>
              <th className="border-b border-r border-[#ead8ab] bg-[#f7f0e3] px-3 py-2 font-semibold">{displayYear}</th>
                        {months.map((month, index) => (
                <th key={index} className="border-b border-r border-[#ead8ab] bg-[#f7f0e3] px-3 py-2 font-semibold last:border-r-0">{month}</th>
                        ))}
                        </tr>
                    </thead>

                    <tbody>
                        {days.map((day) => (
                        <tr key={day}>
                <td className="border-b border-r border-[#f0e3c6] px-3 py-2 font-medium">{day}</td>
                            {months.map((_, monthIndex) => (
                <td key={monthIndex} className="border-b border-r border-[#f0e3c6] px-3 py-2 last:border-r-0">
                              {renderYearlyCell(lookup[`${day}-${monthIndex + 1}`])}
                            </td>
                            ))}
                        </tr>
                        ))}
                    </tbody>
                    </table>
                </div>
            </div>
    </div>
  )
}

export default YearlyChart
