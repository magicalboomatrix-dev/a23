-- Migration 007: Support Ticket System
-- Creates support_tickets and support_messages tables

CREATE TABLE IF NOT EXISTS support_tickets (
  id            INT          NOT NULL AUTO_INCREMENT,
  user_id       INT          NOT NULL,
  moderator_id  INT          DEFAULT NULL,  -- auto-assigned from user's moderator
  subject       VARCHAR(255) NOT NULL,
  status        ENUM('open','in_progress','closed') NOT NULL DEFAULT 'open',
  closed_at     DATETIME     DEFAULT NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_st_user_id       (user_id),
  KEY idx_st_moderator_id  (moderator_id),
  KEY idx_st_status        (status),
  KEY idx_st_created_at    (created_at),
  CONSTRAINT fk_st_user      FOREIGN KEY (user_id)      REFERENCES users (id),
  CONSTRAINT fk_st_moderator FOREIGN KEY (moderator_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS support_messages (
  id          INT          NOT NULL AUTO_INCREMENT,
  ticket_id   INT          NOT NULL,
  sender_id   INT          NOT NULL,
  sender_role ENUM('user','admin','moderator') NOT NULL,
  message     TEXT         NOT NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_sm_ticket_id  (ticket_id),
  KEY idx_sm_created_at (created_at),
  CONSTRAINT fk_sm_ticket FOREIGN KEY (ticket_id) REFERENCES support_tickets (id) ON DELETE CASCADE,
  CONSTRAINT fk_sm_sender FOREIGN KEY (sender_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
