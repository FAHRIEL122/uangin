/**
 * Recurring Transaction Processor
 * Auto-creates transactions based on recurring templates
 * Run this daily via cron job or scheduled task
 */

const { pool } = require('../config/database');

// Process recurring transactions
async function processRecurringTransactions() {
  console.log('🔄 Processing recurring transactions...');
  
  try {
    const today = new Date();
    const currentDay = today.getDate();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    
    // Get all active recurring transactions that should run today
    const [recurringTransactions] = await pool.query(
      `SELECT * FROM recurring_transactions 
       WHERE is_active = TRUE 
         AND day_of_month = ?
         AND start_date <= CURDATE()
         AND (end_date IS NULL OR end_date >= CURDATE())
         AND (
           last_processed IS NULL 
           OR MONTH(last_processed) != ? 
           OR YEAR(last_processed) != ?
         )`,
      [currentDay, month, year]
    );
    
    if (recurringTransactions.length === 0) {
      console.log('✅ No recurring transactions to process today');
      return { processed: 0 };
    }
    
    console.log(`📝 Found ${recurringTransactions.length} recurring transactions to process`);
    
    let processedCount = 0;
    let errorCount = 0;
    
    // Process each recurring transaction
    for (const recurring of recurringTransactions) {
      try {
        // Create transaction
        await pool.query(
          `INSERT INTO transactions 
            (user_id, category_id, recurring_id, type, amount, description, transaction_date, transaction_time)
          VALUES (?, ?, ?, ?, ?, ?, CURDATE(), ?)`,
          [
            recurring.user_id,
            recurring.category_id,
            recurring.id,
            recurring.type,
            recurring.amount,
            recurring.description,
            '00:00:00'
          ]
        );
        
        // Update last_processed date
        await pool.query(
          'UPDATE recurring_transactions SET last_processed = CURDATE() WHERE id = ?',
          [recurring.id]
        );
        
        processedCount++;
        console.log(`✅ Processed: ${recurring.description || 'Recurring transaction'} (ID: ${recurring.id})`);
        
      } catch (error) {
        errorCount++;
        console.error(`❌ Error processing recurring ${recurring.id}:`, error.message);
      }
    }
    
    console.log(`🎉 Recurring processing complete: ${processedCount} success, ${errorCount} errors`);
    return { processed: processedCount, errors: errorCount };
    
  } catch (error) {
    console.error('❌ Error in recurring transaction processor:', error.message);
    return { processed: 0, errors: 1 };
  }
}

// Manual trigger endpoint
async function triggerRecurring(req, res) {
  const result = await processRecurringTransactions();
  
  if (result.processed > 0 || result.errors > 0) {
    return res.json({
      success: true,
      message: `Processed ${result.processed} transactions with ${result.errors} errors`,
      data: result
    });
  } else {
    return res.json({
      success: true,
      message: 'No recurring transactions to process today',
      data: result
    });
  }
}

module.exports = {
  processRecurringTransactions,
  triggerRecurring
};
