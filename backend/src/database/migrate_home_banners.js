require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const pool = require('../config/database');

async function migrate() {
  const conn = await pool.getConnection();
  try {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS home_banners (
        id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        title           VARCHAR(255)  NOT NULL DEFAULT '',
        content         TEXT          NOT NULL,
        extra_text      VARCHAR(500)  NOT NULL DEFAULT '',
        button_text     VARCHAR(100)  NOT NULL DEFAULT '',
        button_link     VARCHAR(500)  NOT NULL DEFAULT '',
        image_url       VARCHAR(500)  NOT NULL DEFAULT '',
        display_order   INT UNSIGNED  NOT NULL DEFAULT 0,
        status          TINYINT(1)    NOT NULL DEFAULT 1,
        created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Add image_url column if upgrading an existing table that lacks it
    try {
      await conn.query(
        `ALTER TABLE home_banners ADD COLUMN image_url VARCHAR(500) NOT NULL DEFAULT '' AFTER button_link`
      );
    } catch (alterErr) {
      if (!alterErr.message.includes('Duplicate column')) throw alterErr;
      // Column already exists — skip
    }

    // Seed two example banners if table is empty
    const [rows] = await conn.query('SELECT COUNT(*) AS cnt FROM home_banners');
    if (rows[0].cnt === 0) {
      await conn.query(`
        INSERT INTO home_banners (title, content, extra_text, button_text, button_link, display_order, status)
        VALUES
          (
            '🔥 सट्टा मार्केट अपडेट 🔥',
            'सट्टा बाजार की दैनिक जानकारी, पुराने रिकॉर्ड और नंबर ट्रेंड यहाँ साझा किए जाते हैं।',
            '📊 बाजार को समझने के लिए हमारे चैनल से जुड़ें!',
            'WhatsApp',
            'https://wa.me/xxxxxxxx',
            1,
            1
          ),
          (
            '🎯 आज के लकी नंबर 🎯',
            'हर रोज़ सुबह ताज़े नंबर और मार्केट टिप्स पाने के लिए हमसे जुड़ें।',
            '💬 अभी जुड़ें और सबसे पहले जानकारी पाएं!',
            'Telegram',
            'https://t.me/xxxxxxxx',
            2,
            1
          );
      `);
    }

    console.log('home_banners migration complete.');
  } catch (err) {
    console.error('Migration error:', err.message);
    conn.release();
    process.exit(1);
  }
  conn.release();
  process.exit(0);
}

migrate().catch((err) => { console.error(err); process.exit(1); });
