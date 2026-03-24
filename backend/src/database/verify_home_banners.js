require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const pool = require('../config/database');

async function verify() {
  const [tables] = await pool.query("SHOW TABLES LIKE 'home_banners'");
  if (tables.length === 0) {
    console.log('TABLE: NOT FOUND - running migration...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS home_banners (
        id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        title         VARCHAR(255) NOT NULL DEFAULT '',
        content       TEXT NOT NULL,
        extra_text    VARCHAR(500) NOT NULL DEFAULT '',
        button_text   VARCHAR(100) NOT NULL DEFAULT '',
        button_link   VARCHAR(500) NOT NULL DEFAULT '',
        display_order INT UNSIGNED NOT NULL DEFAULT 0,
        status        TINYINT(1) NOT NULL DEFAULT 1,
        created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('TABLE: CREATED');

    await pool.query(`
      INSERT INTO home_banners (title, content, extra_text, button_text, button_link, display_order, status)
      VALUES
        ('🔥 सट्टा मार्केट अपडेट 🔥',
         'सट्टा बाजार की दैनिक जानकारी, पुराने रिकॉर्ड और नंबर ट्रेंड यहाँ साझा किए जाते हैं।',
         '📊 बाजार को समझने के लिए हमारे चैनल से जुड़ें!',
         'WhatsApp', 'https://wa.me/xxxxxxxx', 1, 1),
        ('🎯 आज के लकी नंबर 🎯',
         'हर रोज़ सुबह ताज़े नंबर और मार्केट टिप्स पाने के लिए हमसे जुड़ें।',
         '💬 अभी जुड़ें और सबसे पहले जानकारी पाएं!',
         'Telegram', 'https://t.me/xxxxxxxx', 2, 1)
    `);
    console.log('ROWS: SEEDED');
  } else {
    console.log('TABLE: EXISTS');
  }

  const [rows] = await pool.query(
    'SELECT id, title, button_text, display_order, status FROM home_banners ORDER BY display_order'
  );
  console.log('TOTAL ROWS:', rows.length);
  rows.forEach((r) => {
    console.log(`  [${r.id}] ${r.title} | btn: ${r.button_text} | order: ${r.display_order} | active: ${r.status}`);
  });

  process.exit(0);
}

verify().catch((e) => {
  console.error('ERROR:', e.message);
  process.exit(1);
});
