# Splitwise Clone (MERN Stack)

A lightweight Splitwise clone featuring real-time comments, live dynamic balance calculations, expense split details, and offline settlement logs.

The application is styled with a premium flat, sharp-cornered Light Theme featuring Tangerine accenting and high-contrast typography.

---

## 🚀 Key Features

* **Dynamic Balance Calculator**: All net balances and pairwise debts are calculated dynamically on-the-fly from active expenses, splits, and settlements (no pre-saved balances).
* **Flexible Expense Splitting**: Supports Equal, Unequal (exact amounts), Percentage, and Share-based splits.
* **Real-time Chat Rooms**: Slide-out Expense Drawer incorporates a WebSocket comments engine (Socket.io) with live typing indicators.
* **Settlements Logging**: Record manual cash payments directly to offset outstanding debts.
* **Soft Deletion & Safety Rules**: Implements soft deletes for groups and expenses to preserve audit history. Users cannot leave a group until their balance is fully settled.
* **Mock Accounts Autofill**: One-click quick login buttons for all demo users.

---

## 🛠️ Technology Stack

* **Frontend**: React, React Router, Tailwind CSS v4, Axios, Socket.io-client.
* **Backend**: Node.js, Express.js, MongoDB (Mongoose), Socket.io.
* **Authentication**: JSON Web Token (JWT) transmitted via JSON payload and stored securely in `localStorage`.

---

## 📋 Demo Credentials

You can use the **Quick Login** buttons on the sign-in page, or type these credentials manually:

| User Role | Email Address | Password |
| :--- | :--- | :--- |
| **Alice Smith (Group Admin)** | `alice@example.com` | `password123` |
| **Bob Jones (Member)** | `bob@example.com` | `password123` |
| **Charlie Brown (Member)** | `charlie@example.com` | `password123` |

---

## ⚡ Installation & Local Setup

### Prerequisites
* [Node.js](https://nodejs.org/) (v16+)
* [MongoDB](https://www.mongodb.com/) (running locally or remote connection URI)

### 1. Clone & Install Dependencies

Open a terminal in the root directory:

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Configure Environment Variables

Inside the `backend/` folder, configure a `.env` file:
```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/splitwise
JWT_SECRET=your_jwt_secret_key_here
```

### 3. Seed Mock Data

Run the database seed script from the `backend/` directory:
```bash
npm run seed
```

### 4. Running the Servers

**Start the Backend API Server:**
```bash
# In the backend/ folder
npm run dev
```

**Start the Frontend Dev Server:**
```bash
# In the frontend/ folder
npm run dev
```

Open `http://localhost:5173/` in your browser.
