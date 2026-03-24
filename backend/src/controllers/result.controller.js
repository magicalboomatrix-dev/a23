const pool = require('../config/database');
const XLSX = require('xlsx');

function normalizeResultNumber(value) {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) {
    return null;
  }

  if (!/^\d{1,2}$/.test(trimmed)) {
    return null;
  }

  return trimmed.padStart(2, '0');
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function buildDeclaredAt(resultDate, timeValue) {
  const safeTime = String(timeValue || '12:00:00').slice(0, 8) || '12:00:00';
  return `${resultDate} ${safeTime}`;
}

async function getGameById(gameId, executor = pool) {
  const [games] = await executor.query('SELECT id, name, result_time, close_time FROM games WHERE id = ?', [gameId]);
  return games[0] || null;
}

async function getResultById(resultId, executor = pool) {
  const [rows] = await executor.query(`
    SELECT gr.id,
           gr.game_id,
           gr.result_number,
           gr.result_date,
           gr.declared_at,
           g.name AS game_name,
           g.result_time,
           g.close_time,
           (SELECT COUNT(*) FROM bets b WHERE b.game_result_id = gr.id) AS linked_bet_count
    FROM game_results gr
    JOIN games g ON g.id = gr.game_id
    WHERE gr.id = ?
    LIMIT 1
  `, [resultId]);
  return rows[0] || null;
}

function buildTemplateRows() {
  const header = ['DAY', 'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const rows = [header];
  for (let day = 1; day <= 31; day += 1) {
    rows.push([day, '', '', '', '', '', '', '', '', '', '', '', '']);
  }
  return rows;
}

function parseMonthHeader(headerValue) {
  const normalized = String(headerValue || '').trim().slice(0, 3).toUpperCase();
  const monthMap = {
    JAN: 0,
    FEB: 1,
    MAR: 2,
    APR: 3,
    MAY: 4,
    JUN: 5,
    JUL: 6,
    AUG: 7,
    SEP: 8,
    OCT: 9,
    NOV: 10,
    DEC: 11,
  };

  return monthMap[normalized] ?? null;
}

async function fetchMonthlyChart(year, month, includeHidden = false) {
  const y = parseInt(year, 10) || new Date().getFullYear();
  const m = parseInt(month, 10) || (new Date().getMonth() + 1);
  const visibilitySql = includeHidden
    ? '1'
    : `CASE
         WHEN gr.result_date = CURDATE()
           THEN CASE WHEN COALESCE(g.result_time, g.close_time) <= CURTIME() THEN 1 ELSE 0 END
         ELSE 1
       END`;

  const [results] = await pool.query(`
    SELECT DAYOFMONTH(gr.result_date) AS result_day,
           gr.result_number,
           g.name AS game_name,
           ${visibilitySql} AS result_visible
    FROM game_results gr
    JOIN games g ON gr.game_id = g.id
    WHERE YEAR(gr.result_date) = ? AND MONTH(gr.result_date) = ?
      AND gr.declared_at IS NOT NULL
    ORDER BY gr.result_date, g.name
  `, [y, m]);

  const chart = {};
  for (const row of results) {
    const day = row.result_day;
    if (!chart[day]) chart[day] = {};
    chart[day][row.game_name] = {
      has_result: true,
      result_number: row.result_visible ? row.result_number : (includeHidden ? row.result_number : null),
      result_visible: Boolean(row.result_visible),
    };
  }

  return { year: y, month: m, chart };
}

async function fetchYearlyChart(year, city, includeHidden = false) {
  const y = parseInt(year, 10) || new Date().getFullYear();
  const visibilitySql = includeHidden
    ? '1'
    : `CASE
         WHEN gr.result_date = CURDATE()
           THEN CASE WHEN COALESCE(g.result_time, g.close_time) <= CURTIME() THEN 1 ELSE 0 END
         ELSE 1
       END`;

  let query = `
    SELECT DAYOFMONTH(gr.result_date) AS result_day,
           MONTH(gr.result_date) - 1 AS result_month,
           gr.result_number,
           g.name AS game_name,
           ${visibilitySql} AS result_visible
    FROM game_results gr
    JOIN games g ON gr.game_id = g.id
    WHERE YEAR(gr.result_date) = ?
      AND gr.declared_at IS NOT NULL
  `;
  const params = [y];

  if (city) {
    query += ' AND g.name = ?';
    params.push(city);
  }

  query += ' ORDER BY gr.result_date, g.name';
  const [results] = await pool.query(query, params);

  const chart = {};
  for (const row of results) {
    const day = row.result_day;
    const month = row.result_month;
    if (!chart[day]) chart[day] = new Array(12).fill('');
    chart[day][month] = {
      has_result: true,
      result_number: row.result_visible ? row.result_number : (includeHidden ? row.result_number : null),
      result_visible: Boolean(row.result_visible),
    };
  }

  return { year: y, city: city || 'ALL', chart };
}

exports.getMonthlyResults = async (req, res, next) => {
  try {
    res.json(await fetchMonthlyChart(req.query.year, req.query.month, false));
  } catch (error) {
    next(error);
  }
};

exports.getAdminMonthlyResults = async (req, res, next) => {
  try {
    res.json(await fetchMonthlyChart(req.query.year, req.query.month, true));
  } catch (error) {
    next(error);
  }
};

exports.getYearlyResults = async (req, res, next) => {
  try {
    res.json(await fetchYearlyChart(req.query.year, req.query.city, false));
  } catch (error) {
    next(error);
  }
};

exports.getAdminYearlyResults = async (req, res, next) => {
  try {
    res.json(await fetchYearlyChart(req.query.year, req.query.city, true));
  } catch (error) {
    next(error);
  }
};

exports.getLiveResults = async (req, res, next) => {
  try {
    const [results] = await pool.query(`
      SELECT g.id AS game_id,
             g.name,
             g.result_time,
             g.close_time,
             gr.result_number,
             gr.result_date,
             gr.declared_at,
             CASE
               WHEN gr.id IS NOT NULL AND COALESCE(g.result_time, g.close_time) <= CURTIME() THEN 1
               ELSE 0
             END AS result_visible
      FROM games g
      LEFT JOIN game_results gr ON gr.id = (
        SELECT gr2.id
        FROM game_results gr2
        WHERE gr2.game_id = g.id
          AND gr2.declared_at IS NOT NULL
          AND gr2.result_date = CURDATE()
        ORDER BY gr2.result_date DESC, gr2.declared_at DESC
        LIMIT 1
      )
      WHERE g.is_active = 1
        AND TIMESTAMP(CURDATE(), COALESCE(g.result_time, g.close_time)) >= NOW() - INTERVAL 30 MINUTE
        AND (
          gr.id IS NULL
          OR gr.declared_at >= NOW() - INTERVAL 30 MINUTE
        )
      ORDER BY COALESCE(g.result_time, g.close_time) ASC
      LIMIT 2
    `);
    res.json({ results });
  } catch (error) {
    next(error);
  }
};

exports.getResultHistory = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 100, 1), 500);
    const offset = (page - 1) * limit;
    const filters = [];
    const params = [];

    if (req.query.game_id) {
      filters.push('gr.game_id = ?');
      params.push(parseInt(req.query.game_id, 10));
    }

    if (req.query.from_date) {
      filters.push('gr.result_date >= ?');
      params.push(req.query.from_date);
    }

    if (req.query.to_date) {
      filters.push('gr.result_date <= ?');
      params.push(req.query.to_date);
    }

    if (req.query.search) {
      filters.push('(g.name LIKE ? OR gr.result_number LIKE ?)');
      params.push(`%${req.query.search}%`, `%${req.query.search}%`);
    }

    const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';
    const [countRows] = await pool.query(`
      SELECT COUNT(*) AS total
      FROM game_results gr
      JOIN games g ON gr.game_id = g.id
      ${whereClause}
    `, params);

    const [results] = await pool.query(`
      SELECT gr.id,
             gr.game_id,
             g.name AS game_name,
             gr.result_number,
             gr.result_date,
             gr.declared_at,
             g.result_time,
             g.close_time,
            (SELECT COUNT(*) FROM bets b WHERE b.game_result_id = gr.id) AS linked_bet_count,
             gr.created_at
      FROM game_results gr
      JOIN games g ON gr.game_id = g.id
      ${whereClause}
      ORDER BY gr.result_date DESC, g.name ASC, gr.declared_at DESC, gr.id DESC
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]);

    res.json({
      results,
      pagination: {
        page,
        limit,
        total: countRows[0]?.total || 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.upsertResult = async (req, res, next) => {
  try {
    const gameId = parseInt(req.body.game_id, 10);
    const { result_date, declared_at } = req.body;
    const resultNumber = normalizeResultNumber(req.body.result_number);

    if (!gameId || !result_date || !resultNumber) {
      return res.status(400).json({ error: 'Game, result date, and a valid 2-digit result number are required.' });
    }

    const game = await getGameById(gameId);
    if (!game) {
      return res.status(404).json({ error: 'Game not found.' });
    }

    const effectiveDeclaredAt = declared_at || buildDeclaredAt(result_date, game.result_time || game.close_time);
    await pool.query(`
      INSERT INTO game_results (game_id, result_number, result_date, declared_at)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE result_number = VALUES(result_number), declared_at = VALUES(declared_at)
    `, [gameId, resultNumber, result_date, effectiveDeclaredAt]);

    const [savedRows] = await pool.query(
      'SELECT id FROM game_results WHERE game_id = ? AND result_date = ? LIMIT 1',
      [gameId, result_date]
    );

    res.json({
      message: 'Result saved successfully.',
      resultId: savedRows[0]?.id || null,
      game_name: game.name,
      result_number: resultNumber,
      result_date,
    });
  } catch (error) {
    next(error);
  }
};

exports.updateResultById = async (req, res, next) => {
  try {
    const resultId = parseInt(req.params.id, 10);
    const gameId = parseInt(req.body.game_id, 10);
    const { result_date, declared_at } = req.body;
    const resultNumber = normalizeResultNumber(req.body.result_number);

    if (!resultId || !gameId || !result_date || !resultNumber) {
      return res.status(400).json({ error: 'Result id, game, result date, and a valid 2-digit result number are required.' });
    }

    const existing = await getResultById(resultId);
    if (!existing) {
      return res.status(404).json({ error: 'Result not found.' });
    }

    if (Number(existing.linked_bet_count) > 0) {
      return res.status(409).json({ error: 'This result is already linked to settled bets and cannot be edited from history.' });
    }

    const game = await getGameById(gameId);
    if (!game) {
      return res.status(404).json({ error: 'Game not found.' });
    }

    const effectiveDeclaredAt = declared_at || buildDeclaredAt(result_date, game.result_time || game.close_time);
    await pool.query(
      'UPDATE game_results SET game_id = ?, result_number = ?, result_date = ?, declared_at = ? WHERE id = ?',
      [gameId, resultNumber, result_date, effectiveDeclaredAt, resultId]
    );

    res.json({
      message: 'Result updated successfully.',
      resultId,
      game_name: game.name,
      result_number: resultNumber,
      result_date,
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'A result already exists for that game and date.' });
    }
    next(error);
  }
};

exports.deleteResultById = async (req, res, next) => {
  try {
    const resultId = parseInt(req.params.id, 10);
    if (!resultId) {
      return res.status(400).json({ error: 'Result id is required.' });
    }

    const existing = await getResultById(resultId);
    if (!existing) {
      return res.status(404).json({ error: 'Result not found.' });
    }

    if (Number(existing.linked_bet_count) > 0) {
      return res.status(409).json({ error: 'This result is already linked to settled bets and cannot be deleted from history.' });
    }

    await pool.query('DELETE FROM game_results WHERE id = ?', [resultId]);
    res.json({ message: 'Result deleted successfully.', resultId });
  } catch (error) {
    next(error);
  }
};

exports.bulkDeleteResults = async (req, res, next) => {
  try {
    const rawIds = Array.isArray(req.body.result_ids) ? req.body.result_ids : [];
    const resultIds = [...new Set(rawIds.map((value) => parseInt(value, 10)).filter(Boolean))];

    if (resultIds.length === 0) {
      return res.status(400).json({ error: 'At least one result id is required.' });
    }

    const placeholders = resultIds.map(() => '?').join(', ');
    const [rows] = await pool.query(`
      SELECT gr.id,
             g.name AS game_name,
             gr.result_date,
             (SELECT COUNT(*) FROM bets b WHERE b.game_result_id = gr.id) AS linked_bet_count
      FROM game_results gr
      JOIN games g ON g.id = gr.game_id
      WHERE gr.id IN (${placeholders})
    `, resultIds);

    const deletableIds = rows.filter((row) => Number(row.linked_bet_count) === 0).map((row) => row.id);
    const blocked = rows.filter((row) => Number(row.linked_bet_count) > 0).map((row) => ({
      id: row.id,
      game_name: row.game_name,
      result_date: row.result_date,
      reason: 'linked_to_settled_bets',
    }));

    if (deletableIds.length > 0) {
      const deletePlaceholders = deletableIds.map(() => '?').join(', ');
      await pool.query(`DELETE FROM game_results WHERE id IN (${deletePlaceholders})`, deletableIds);
    }

    res.json({
      message: 'Bulk delete completed.',
      deleted_count: deletableIds.length,
      deleted_ids: deletableIds,
      blocked,
    });
  } catch (error) {
    next(error);
  }
};

exports.downloadYearlyTemplate = async (req, res, next) => {
  try {
    const format = String(req.query.format || 'csv').toLowerCase();
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(buildTemplateRows());
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Yearly Chart Template');

    if (format === 'xlsx') {
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="yearly-result-template.xlsx"');
      return res.send(buffer);
    }

    const csv = XLSX.utils.sheet_to_csv(worksheet);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="yearly-result-template.csv"');
    return res.send(csv);
  } catch (error) {
    next(error);
  }
};

exports.importYearlyResults = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const gameId = parseInt(req.body.game_id, 10);
    const year = parseInt(req.body.year, 10);

    if (!req.file) {
      return res.status(400).json({ error: 'CSV/XLSX file is required.' });
    }

    if (!gameId || !year) {
      return res.status(400).json({ error: 'Game and year are required for import.' });
    }

    const [games] = await conn.query('SELECT id, name, result_time, close_time FROM games WHERE id = ?', [gameId]);
    if (games.length === 0) {
      return res.status(404).json({ error: 'Game not found.' });
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1, raw: false, defval: '' });
    if (rows.length < 2) {
      return res.status(400).json({ error: 'Import file must include a header row and at least one day row.' });
    }

    const monthColumns = rows[0]
      .map((header, index) => ({ index, monthIndex: parseMonthHeader(header) }))
      .filter((entry) => entry.index > 0 && entry.monthIndex !== null);

    if (monthColumns.length === 0) {
      return res.status(400).json({ error: 'Header row must include month columns like JAN, FEB, MAR ... DEC.' });
    }

    const declaredTime = games[0].result_time || games[0].close_time || '12:00:00';
    const skipped = [];
    let processed = 0;

    await conn.beginTransaction();

    for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
      const row = rows[rowIndex] || [];
      const day = parseInt(String(row[0] || '').trim(), 10);
      if (!day) {
        continue;
      }

      for (const monthColumn of monthColumns) {
        const rawValue = String(row[monthColumn.index] || '').trim();
        if (!rawValue) {
          continue;
        }

        const normalizedResult = normalizeResultNumber(rawValue);
        if (!normalizedResult) {
          skipped.push(`Row ${rowIndex + 1}, ${rows[0][monthColumn.index]}: invalid result "${rawValue}"`);
          continue;
        }

        const resultDateObj = new Date(year, monthColumn.monthIndex, day);
        if (
          Number.isNaN(resultDateObj.getTime()) ||
          resultDateObj.getFullYear() !== year ||
          resultDateObj.getMonth() !== monthColumn.monthIndex ||
          resultDateObj.getDate() !== day
        ) {
          skipped.push(`Row ${rowIndex + 1}, ${rows[0][monthColumn.index]}: invalid day ${day}`);
          continue;
        }

        const resultDate = formatDate(resultDateObj);
        await conn.query(`
          INSERT INTO game_results (game_id, result_number, result_date, declared_at)
          VALUES (?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE result_number = VALUES(result_number), declared_at = VALUES(declared_at)
        `, [gameId, normalizedResult, resultDate, buildDeclaredAt(resultDate, declaredTime)]);
        processed += 1;
      }
    }

    await conn.commit();
    res.json({
      message: 'Yearly result import completed.',
      processed,
      skipped_count: skipped.length,
      skipped: skipped.slice(0, 50),
      game_name: games[0].name,
      year,
    });
  } catch (error) {
    await conn.rollback();
    next(error);
  } finally {
    conn.release();
  }
};
