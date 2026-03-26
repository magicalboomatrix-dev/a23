const pool = require('../config/database');
const { settleBetsForGame } = require('../utils/settle-bets');
const { IST_TIME_SQL } = require('../utils/sql-time');

/**
 * Auto-settle cron: runs every 60 seconds.
 * Finds games that have pending bets and a declared result (today or yesterday).
 * Handles the case where bets from yesterday remain unsettled after midnight.
 */
async function autoSettleBets() {
  try {
    // Find declared results that have pending bets for the same IST bet date.
    // For older dates, settle immediately; for today, wait until result/close time.
    const [games] = await pool.query(`
      SELECT g.id AS game_id,
             gr.id AS result_id,
             gr.result_number,
             DATE_FORMAT(gr.result_date, '%Y-%m-%d') AS result_date
      FROM games g
      INNER JOIN game_results gr ON gr.game_id = g.id AND gr.declared_at IS NOT NULL
      WHERE g.is_active = 1
        AND EXISTS (
          SELECT 1
          FROM bets b
          WHERE b.game_id = g.id
            AND b.status = 'pending'
            AND DATE(CONVERT_TZ(b.created_at, '+00:00', '+05:30')) = gr.result_date
        )
        AND (
          gr.result_date < DATE(CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '+05:30'))
          OR COALESCE(g.result_time, g.close_time) <= ${IST_TIME_SQL}
        )
      ORDER BY g.id, gr.result_date DESC
    `);

    for (const game of games) {
      const conn = await pool.getConnection();
      try {
        const resultStr = game.result_number.toString().padStart(2, '0');
        await conn.beginTransaction();
        const count = await settleBetsForGame(conn, game.game_id, resultStr, game.result_id, {
          resultDate: game.result_date,
        });
        await conn.commit();
        if (count > 0) {
          console.log(`[auto-settle] Game ${game.game_id}: settled ${count} bets`);
        }
      } catch (err) {
        await conn.rollback();
        console.error(`[auto-settle] Game ${game.game_id} error:`, err.message);
      } finally {
        conn.release();
      }
    }
  } catch (err) {
    console.error('[auto-settle] Error:', err.message);
  }
}

let intervalId = null;

function startAutoSettle(intervalMs = 60_000) {
  if (intervalId) return;
  console.log('[auto-settle] Started — checking every', intervalMs / 1000, 'seconds');
  // Run once immediately
  autoSettleBets();
  intervalId = setInterval(autoSettleBets, intervalMs);
}

function stopAutoSettle() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

module.exports = { startAutoSettle, stopAutoSettle };
