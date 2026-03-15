import React from 'react'

const YearlyChart = () => {
    const tableData = {
    year: 2026,
    months: [
      "JAN","FEB","MAR","APR","MAY","JUN",
      "JUL","AUG","SEP","OCT","NOV","DEC"
    ],
    data: {
      1:  [23,34,43,53,36,87,"","","","","",""],
      2:  [34,54,65,76,23,45,"","","","","",""],
      3:  [84,74,96,42,65,65,"","","","","",""],
      4:  [63,67,43,87,36,23,"","","","","",""],
      5:  [23,34,76,23,57,56,"","","","","",""],
    }
  };
  const days = Array.from({ length: 31 }, (_, i) => i + 1);

  return (
    <div>
      
            <div className="head-title topround text-center"><h2 className="title-text"><b>MONTHLY CHART 2026</b></h2></div>

            <div className='table-responsive'>
                <div className='table-inner'>
                <table className="table chart-table chart-table-oth">
                    <thead>
                        <tr>
                        <th>{tableData.year}</th>

                        {tableData.months.map((month, index) => (
                            <th key={index}>{month}</th>
                        ))}

                        </tr>
                    </thead>

                    <tbody>
                        {days.map((day) => (
                        <tr key={day}>
                            <td>{day}</td>

                            {tableData.months.map((_, monthIndex) => (
                            <td key={monthIndex}>
                                {tableData.data[day]?.[monthIndex] ?? ""}
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
