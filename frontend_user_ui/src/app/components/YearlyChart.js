import React from 'react'

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
          val.forEach((res, monthIdx) => { if (res) lookup[`${day}-${monthIdx + 1}`] = res; });
        } else if (val && typeof val === 'object') {
          Object.entries(val).forEach(([m, res]) => { if (res) lookup[`${day}-${parseInt(m) + 1}`] = res; });
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
    <div>
      
            <div className="head-title topround text-center"><h2 className="title-text"><b>YEARLY CHART {displayYear}</b></h2></div>

            <div className='table-responsive'>
                <div className='table-inner'>
                <table className="table chart-table chart-table-oth">
                    <thead>
                        <tr>
                        <th>{displayYear}</th>
                        {months.map((month, index) => (
                            <th key={index}>{month}</th>
                        ))}
                        </tr>
                    </thead>

                    <tbody>
                        {days.map((day) => (
                        <tr key={day}>
                            <td>{day}</td>
                            {months.map((_, monthIndex) => (
                            <td key={monthIndex}>
                                {lookup[`${day}-${monthIndex + 1}`] ?? ""}
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
