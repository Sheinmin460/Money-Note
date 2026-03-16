# 💰 MoneyNote

**MoneyNote** is a clean, modern, full-stack application designed to help you track your income and expenses with clarity and ease. It features a responsive UI, real-time totals, and a robust SQLite backend.

---

## ✨ Features

- **Summary Dashboard**: Instantly see your total income, expenses, and current balance.
- **Transaction Management**: Easily add, edit, and delete transactions.
- **Categorization**: Organize your cash flow by categories and payment methods (Cash, Bank, Wallet, Card).
- **Responsive Design**: A premium, "loveable" UI built with Tailwind CSS, optimized for both desktop and mobile.
- **Security & Integrity**: Built-in data validation with Zod and clean SQLite data management.

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
| `GET` | `/transactions` | List all transactions (newest first) |
| `POST` | `/transactions` | Create a new transaction |
| `PUT` | `/transactions/:id` | Update an existing transaction |
| `DELETE` | `/transactions/:id` | Remove a transaction |

---

## 🔐 Security & Maintenance
Recent updates include:
- Improved API robustness for unsetting optional fields.
- Optimized workspace configuration and cleanup.
- Enhanced `.gitignore` to protect sensitive database temporary files.

---

## 📄 License
This project is for portfolio and demonstration purposes.

