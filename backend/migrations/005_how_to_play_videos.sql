-- Migration: create how_to_play_videos table
CREATE TABLE IF NOT EXISTS `how_to_play_videos` (
  `id`              INT NOT NULL AUTO_INCREMENT,
  `title`           VARCHAR(255) NOT NULL,
  `description_en`  TEXT DEFAULT NULL,
  `description_hi`  TEXT DEFAULT NULL,
  `video_path`      VARCHAR(512) DEFAULT NULL,
  `thumbnail_path`  VARCHAR(512) DEFAULT NULL,
  `display_order`   INT NOT NULL DEFAULT 0,
  `is_active`       TINYINT(1) NOT NULL DEFAULT 1,
  `created_at`      TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`      TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_htp_order` (`display_order`),
  KEY `idx_htp_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
