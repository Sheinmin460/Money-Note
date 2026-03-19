# 💰 MoneyNote

**MoneyNote** is a clean, modern, full-stack application designed to help you track your income and expenses with clarity and ease. It features a responsive UI, real-time totals, and a robust SQLite backend.

---

## ✨ Features

- **Profit Dashboard**: Instantly see your total income, expenses, profit, and current balance in a modern, card-based interface.
- **Projects Management**: Group transactions into projects to track specific budgets or ventures with dedicated summaries.
- **Credit Wallets & Limits**: Create specialized "Credit" wallets that allow negative balances up to a custom-defined credit limit.
- **Wallet Management**: Full CRUD support for wallets (Cash, Bank, Credit). Renaming a wallet automatically updates all its associated transactions.
- **Categorization**: Mandatory categorization for clear reporting. Smart filters include "NULL" category handling to ensure no transaction is lost.
- **Separate Transfer Logs**: Move funds between wallets without affecting your main income/expense charts.
- **Security & Integrity**: Transactional database updates (using SQLite BEGIN/COMMIT) ensure data consistency even during complex operations like wallet renaming.

## 🛠️ Technology Stack

### Frontend
- **React 18** (Vite-powered)
- **TypeScript** for type-safe development
- **Tailwind CSS** for modern, responsive styling
- **Lucide React** for beautiful icons

### Backend
- **Node.js** & **Express**
- **better-sqlite3** for a fast, reliable SQLite engine
- **Zod** for schema-driven payload validation

---

## 📁 Project Structure

```text
MoneyNote/
├── frontend/           # React + Vite application
│   ├── src/components/ # Reusable UI components
│   ├── src/lib/        # API clients and utilities
│   └── src/assets/     # Images and styles
├── backend/            # Express API
│   ├── src/            # API routes and database logic
│   └── data/           # SQLite database storage
└── package.json        # Unified workspace configuration
```

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- npm (installed with Node.js)

### Installation
1. Clone the repository or download the source code.
2. From the root directory, install all dependencies for both frontend and backend:
   ```bash
   npm install
   ```

### Development
To start both the frontend and backend servers concurrently:
```bash
npm run dev
```

- **Frontend**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:5174](http://localhost:5174)

---

## 🔌 API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/transactions` | List all transactions including those with no category |
| `POST` | `/transactions` | Create a transaction (with balance & credit limit checks) |
| `PUT` | `/transactions/:id` | Update a transaction (re-validates balance/limits) |
| `DELETE` | `/transactions/:id` | Remove a transaction |
| `GET` | `/transactions/balances` | List wallets with balances, credit status, and limits |
| `GET` | `/wallets` | List all wallet definitions |
| `POST` | `/wallets` | Create a new wallet (with optional credit limit) |
| `PUT` | `/wallets/:name` | Update wallet name/status (migrates transactions) |
| `DELETE` | `/wallets/:name` | Delete a wallet (balance must be zero) |
| `POST` | `/wallets/transfer` | Atomic transfer between wallets with limit checks |
| `GET` | `/transactions/transfers` | List all internal wallet transfer logs |

---

## 🔐 Security & Maintenance
Recent updates include:
- Improved API robustness for unsetting optional fields.
- Optimized workspace configuration and cleanup.
- Enhanced `.gitignore` to protect sensitive database temporary files.

---

## 📄 License
This project is for portfolio and demonstration purposes.

