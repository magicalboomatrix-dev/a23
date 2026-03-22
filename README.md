# A23 Satta - Betting Management System

## Project Structure

```
A23_satta/
├── backend/              # Node.js + Express API
├── admin_dashboard/      # React + Vite Admin Panel
└── frontend_user_ui/     # Next.js User Interface (pre-built)
```

## Quick Start

### Prerequisites
- Node.js 18+
- MySQL 8.0+

### 1. Backend Setup

```bash
cd backend

# Configure database
# Edit .env file with your MySQL credentials

# Run database migration
npm run migrate

# Seed initial data (admin, moderator, games, settings)
npm run seed

# Start development server
npm run dev
```

Backend runs on **http://localhost:5000**

### 2. Admin Dashboard

```bash
cd admin_dashboard
npm run dev
```

Admin panel runs on **http://localhost:3001**

### 3. User Frontend

```bash
cd frontend_user_ui
npm run dev
```

User UI runs on **http://localhost:3000**

---

## Default Credentials

| Role      | Phone      | Password |
|-----------|------------|----------|
| Admin     | 9999999999 | admin123 |
| Moderator | 8888888888 | mod123   |

---

## API Endpoints

### Auth
- `POST /api/auth/send-otp` - Send OTP to phone
- `POST /api/auth/verify-otp` - Verify OTP & login
- `POST /api/auth/complete-profile` - Register new user
- `POST /api/auth/admin-login` - Admin/Moderator login

### Users
- `GET /api/users/profile` - Get user profile + wallet
- `GET /api/users/bank-accounts` - List bank accounts
- `POST /api/users/bank-accounts` - Add bank account
- `DELETE /api/users/bank-accounts/:id` - Delete bank account
- `GET /api/users/account-statement` - Transaction history
- `GET /api/users/profit-loss` - Betting P&L

### Wallet
- `GET /api/wallet/info` - Balance, exposure, bonus

### Games
- `GET /api/games` - List all games
- `GET /api/games/:id` - Game info + results
- `POST /api/games` - Create game (admin)
- `PUT /api/games/:id` - Update game (admin)
- `POST /api/games/:id/result` - Declare result (admin)

### Bets
- `POST /api/bets/place` - Place a bet
- `GET /api/bets/my-bets` - User's bet history

### Deposits
- `POST /api/deposits/request` - Submit deposit
- `GET /api/deposits/history` - User's deposit history
- `GET /api/deposits/all` - All deposits (admin/mod)
- `PUT /api/deposits/:id/approve` - Approve deposit
- `PUT /api/deposits/:id/reject` - Reject deposit

### Withdrawals
- `POST /api/withdraw/request` - Submit withdrawal
- `GET /api/withdraw/history` - User's withdrawal history
- `GET /api/withdraw/all` - All withdrawals (admin/mod)
- `PUT /api/withdraw/:id/approve` - Approve withdrawal
- `PUT /api/withdraw/:id/reject` - Reject withdrawal

### Bonus
- `GET /api/bonus/history` - User's bonus history
- `GET /api/bonus/referrals` - Referral list
- `GET /api/bonus/rules` - Bonus rules

### Results
- `GET /api/results/monthly` - Monthly chart data
- `GET /api/results/yearly` - Yearly chart data
- `GET /api/results/live` - Today's live results

### Analytics (Admin)
- `GET /api/analytics/dashboard` - Dashboard stats
- `GET /api/analytics/bets` - Bet analytics per number
- `GET /api/analytics/revenue` - Revenue charts

### Moderators (Admin)
- `POST /api/moderators` - Create moderator
- `GET /api/moderators` - List moderators
- `PUT /api/moderators/:id` - Update moderator
- `DELETE /api/moderators/:id` - Delete moderator
- `POST /api/moderators/assign-users` - Assign users

### Admin
- `GET /api/admin/users` - List all users
- `PUT /api/admin/users/:id/block` - Block/unblock user
- `GET /api/admin/settings` - Get system settings
- `PUT /api/admin/settings` - Update settings
- `GET /api/admin/flagged-accounts` - Flagged bank accounts

### Notifications
- `GET /api/notifications/recent` - Recent win notifications
- `GET /api/notifications/my` - User's notifications
- `PUT /api/notifications/:id/read` - Mark as read

---

## Features

- **OTP-based authentication** for users
- **Password authentication** for admin/moderator
- **JWT tokens** for session management
- **Role-based access control** (Admin, Moderator, User)
- **Wallet system** with balance, bonus, and exposure
- **Game management** with result declaration & auto bet settlement
- **Bet types**: Jodi, Haruf (Andar/Bahar), Crossing
- **Time-based betting limits**
- **Deposit system** with UTR validation & duplicate detection
- **Withdrawal system** with bank fraud detection
- **Bonus system**: First deposit, slab-based, referral
- **Analytics dashboard** with charts
- **Flagged account detection**
