const pool = require('../config/database');
const { settleBetsForGame } = require('../utils/settle-bets');

/**
 * Auto-settle cron: runs every 60 seconds.
 * Finds games that have pending bets and a declared result (today or yesterday).
 * Handles the case where bets from yesterday remain unsettled after midnight.
 */
async function autoSettleBets() {
  try {
    // Find games with pending bets that have a recent declared result (deduplicated per game)
    const [games] = await pool.query(`
      SELECT g.id AS game_id, gr.id AS result_id, gr.result_number
      FROM games g
      INNER JOIN game_results gr ON gr.id = (
        SELECT gr2.id FROM game_results gr2
        WHERE gr2.game_id = g.id AND gr2.declared_at IS NOT NULL
        ORDER BY gr2.result_date DESC, gr2.declared_at DESC
        LIMIT 1
      )
      WHERE g.is_active = 1
        AND COALESCE(g.result_time, g.close_time) <= CURTIME()
        AND EXISTS (
          SELECT 1 FROM bets b WHERE b.game_id = g.id AND b.status = 'pending'
        )
    `);

    for (const game of games) {
      const conn = await pool.getConnection();
      try {
        const resultStr = game.result_number.toString().padStart(2, '0');
        await conn.beginTransaction();
        const count = await settleBetsForGame(conn, game.game_id, resultStr, game.result_id);
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
