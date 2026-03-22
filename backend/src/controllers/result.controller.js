const pool = require('../config/database');

exports.getMonthlyResults = async (req, res, next) => {
  try {
    const { year, month } = req.query;
    const y = parseInt(year) || new Date().getFullYear();
    const m = parseInt(month) || new Date().getMonth() + 1;

    const [results] = await pool.query(`
      SELECT DAYOFMONTH(gr.result_date) as result_day, gr.result_number, g.name as game_name
      FROM game_results gr
      JOIN games g ON gr.game_id = g.id
      WHERE YEAR(gr.result_date) = ? AND MONTH(gr.result_date) = ?
        AND gr.declared_at IS NOT NULL
        AND gr.declared_at <= NOW()
      ORDER BY gr.result_date, g.name
    `, [y, m]);

    // Pivot data
    const chart = {};
    for (const row of results) {
      const day = row.result_day;
      if (!chart[day]) chart[day] = {};
      chart[day][row.game_name] = row.result_number;
    }

    res.json({ year: y, month: m, chart });
  } catch (error) {
    next(error);
  }
};

exports.getYearlyResults = async (req, res, next) => {
  try {
    const { city, year } = req.query;
    const y = parseInt(year) || new Date().getFullYear();

    let query = `
      SELECT DAYOFMONTH(gr.result_date) as result_day,
             MONTH(gr.result_date) - 1 as result_month,
             gr.result_number,
             g.name as game_name
      FROM game_results gr
      JOIN games g ON gr.game_id = g.id
      WHERE YEAR(gr.result_date) = ?
        AND gr.declared_at IS NOT NULL
        AND gr.declared_at <= NOW()
    `;
    const params = [y];

    if (city) {
      query += ' AND g.name = ?';
      params.push(city);
    }

    query += ' ORDER BY gr.result_date, g.name';
    const [results] = await pool.query(query, params);

    // Pivot: day -> { month -> result }
    const chart = {};
    for (const row of results) {
      const day = row.result_day;
      const month = row.result_month;
      if (!chart[day]) chart[day] = new Array(12).fill('');
      chart[day][month] = row.result_number || '';
    }

    res.json({ year: y, city: city || 'ALL', chart });
  } catch (error) {
    next(error);
  }
};

exports.getLiveResults = async (req, res, next) => {
  try {
    const [results] = await pool.query(`
      SELECT g.name, gr.result_number, gr.result_date, gr.declared_at
      FROM game_results gr
      JOIN games g ON gr.game_id = g.id
      WHERE gr.declared_at IS NOT NULL
        AND gr.declared_at >= CURDATE()
        AND gr.declared_at < CURDATE() + INTERVAL 1 DAY
      ORDER BY gr.declared_at DESC
    `);
    res.json({ results });
  } catch (error) {
    next(error);
  }
};
