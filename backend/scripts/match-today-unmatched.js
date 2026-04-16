/**
 * Match Today's Unmatched Deposits
 * 
 * This script specifically targets unmatched UPI webhook transactions from today only
 * and attempts to match them against pending deposit orders.
 * 
 * Usage: node scripts/match-today-unmatched.js
 */

const pool = require('../src/config/database');
const { matchAndCreditDeposit } = require('../src/services/auto-deposit-matcher');
const logger = require('../src/utils/logger');

/**
 * Parse UPI transaction data from webhook transaction
 */
function parseTransactionFromWebhook(webhookTxn) {
  try {
    // Extract basic transaction info
    const amount = parseFloat(webhookTxn.amount);
    const referenceNumber = webhookTxn.reference_number;
    const payerName = webhookTxn.payer_name;
    const txnTime = webhookTxn.txn_time;
    
    // Try to extract order reference from raw message
    let orderRef = null;
    if (webhookTxn.raw_message) {
      const orderRefMatch = webhookTxn.raw_message.match(/(?:order|ref|order.?ref|reference)[:\s]*([A-Z0-9]{6,12})/i);
      if (orderRefMatch) {
        orderRef = orderRefMatch[1].toUpperCase();
      }
    }
    
    return {
      amount,
      referenceNumber,
      payerName,
      txnTime,
      orderRef
    };
  } catch (error) {
    logger.error('match-today-unmatched', 'Error parsing transaction data', {
      webhookTxnId: webhookTxn.id,
      error: error.message
    });
    return null;
  }
}

/**
 * Main function to match today's unmatched transactions
 */
async function matchTodaysUnmatchedDeposits() {
  const conn = await pool.getConnection();
  
  try {
    console.log('Starting to match today\'s unmatched deposits...');
    
    // Get today's date in YYYY-MM-DD format (matching MySQL DATE format)
    const today = new Date().toISOString().split('T')[0];
    
    // Query today's unmatched transactions that haven't been attempted yet
    const [unmatchedTxns] = await conn.query(`
      SELECT id, raw_message, amount, reference_number, payer_name, txn_time, 
             created_at, match_attempted_at, error_message
      FROM upi_webhook_transactions 
      WHERE status = 'unmatched' 
        AND DATE(created_at) = ?
        AND match_attempted_at IS NULL
      ORDER BY created_at ASC
      LIMIT 100
    `, [today]);
    
    if (unmatchedTxns.length === 0) {
      console.log(`No unmatched transactions found for today (${today})`);
      return { processed: 0, matched: 0, failed: 0 };
    }
    
    console.log(`Found ${unmatchedTxns.length} unmatched transactions for today`);
    
    let processed = 0;
    let matched = 0;
    let failed = 0;
    
    for (const txn of unmatchedTxns) {
      processed++;
      console.log(`\nProcessing transaction ${processed}/${unmatchedTxns.length}:`);
      console.log(`  ID: ${txn.id}`);
      console.log(`  Amount: ${txn.amount}`);
      console.log(`  Reference: ${txn.reference_number}`);
      console.log(`  Created: ${txn.created_at}`);
      
      // Parse transaction data
      const transactionData = parseTransactionFromWebhook(txn);
      if (!transactionData) {
        console.log('  Failed to parse transaction data');
        failed++;
        continue;
      }
      
      try {
        // Attempt to match and credit the deposit
        const result = await matchAndCreditDeposit({
          ...transactionData,
          webhookTxnId: txn.id
        });
        
        if (result.matched) {
          matched++;
          console.log(`  SUCCESS: Matched to order ${result.orderId}, deposit ID ${result.depositId}`);
          console.log(`  User ${result.userId} credited with amount ${result.amount}`);
        } else {
          failed++;
          console.log(`  FAILED: ${result.reason}`);
        }
      } catch (error) {
        failed++;
        console.log(`  ERROR: ${error.message}`);
        logger.error('match-today-unmatched', 'Error processing transaction', {
          webhookTxnId: txn.id,
          error: error.message
        });
      }
      
      // Small delay to prevent overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`\n=== Summary ===`);
    console.log(`Processed: ${processed}`);
    console.log(`Matched: ${matched}`);
    console.log(`Failed: ${failed}`);
    console.log(`Success Rate: ${processed > 0 ? ((matched / processed) * 100).toFixed(1) : 0}%`);
    
    return { processed, matched, failed };
    
  } catch (error) {
    console.error('Error in matchTodaysUnmatchedDeposits:', error);
    throw error;
  } finally {
    conn.release();
  }
}

/**
 * Get statistics about today's unmatched transactions
 */
async function getTodaysUnmatchedStats() {
  const conn = await pool.getConnection();
  
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const [stats] = await conn.query(`
      SELECT 
        COUNT(*) as total_unmatched,
        COUNT(CASE WHEN match_attempted_at IS NULL THEN 1 END) as not_attempted,
        COUNT(CASE WHEN match_attempted_at IS NOT NULL THEN 1 END) as attempted,
        SUM(amount) as total_amount,
        MIN(created_at) as earliest,
        MAX(created_at) as latest
      FROM upi_webhook_transactions 
      WHERE status = 'unmatched' 
        AND DATE(created_at) = ?
    `, [today]);
    
    return stats[0];
  } finally {
    conn.release();
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    // Show current stats
    console.log('=== Today\'s Unmatched Transactions Stats ===');
    const stats = await getTodaysUnmatchedStats();
    console.log(`Total unmatched: ${stats.total_unmatched}`);
    console.log(`Not attempted: ${stats.not_attempted}`);
    console.log(`Already attempted: ${stats.attempted}`);
    console.log(`Total amount: ${stats.total_amount}`);
    if (stats.earliest) {
      console.log(`Time range: ${stats.earliest} to ${stats.latest}`);
    }
    console.log('');
    
    // Process unmatched transactions
    const result = await matchTodaysUnmatchedDeposits();
    
    // Show final stats
    console.log('\n=== Final Stats ===');
    const finalStats = await getTodaysUnmatchedStats();
    console.log(`Remaining unmatched: ${finalStats.total_unmatched}`);
    console.log(`Remaining not attempted: ${finalStats.not_attempted}`);
    
    console.log('\nScript completed successfully!');
    
  } catch (error) {
    console.error('Script failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run script if called directly
if (require.main === module) {
  main();
}

module.exports = { matchTodaysUnmatchedDeposits, getTodaysUnmatchedStats };
