# BUILD_PLAN.md

## Product Research
Based on our reverse engineering of Splitwise, the MVP will focus on the absolute core values: tracking who spent what, splitting costs, checking balances, recording cash settlements, and communicating in real-time about individual expenses.

### Core Workflows
1. **User Auth Flow:** Register -> Log In -> Load Dashboard.
2. **Group Membership Flow:** Create Group -> Invite via Email -> Add Member to Join Table -> View Members list.
3. **Expense Splitting Flow:** Add Expense -> Choose Split Type (Equal, Unequal, Percentage, Share) -> Enter values -> Validate sum -> Store splits.
4. **Dynamic Settlement Flow:** Click "Settle Up" -> Enter payment details -> Store settlement -> Recalculate net balances dynamically.
5. **Real-time Discussion Flow:** Open Expense Detail -> Fetch past comments -> Open Socket room -> Live messaging.

### Assumptions
- All users must be registered before being added to a group (no phantom users).
- Single default currency (INR/₹).
- All settlements are recorded manually (no Stripe/PayPal integration).

---

## Technical Architecture

### Frontend
- **React 18** (Vite template).
- **Tailwind CSS** for UI styling.
- **React Router DOM** for client routing.
- **Axios** for API communication.
- **Socket.io Client** for real-time room communication.

### Backend
- **Node.js + Express.js**.
- **Mongoose ODM** for MongoDB connectivity.
- **JWT** (JSON Web Tokens) for authentication.
- **Bcrypt** for hashing.
- **Socket.io** for WebSockets.
- **Joi** for API validation.

---

## Collection Design
We will implement 6 main collections in MongoDB:
1. `users`: Stores user credentials and profile details.
2. `groups`: Stores group info (name, category, creator, soft-deleted state).
3. `groupmembers`: Resolves the M:N relationship between Users and Groups. Includes a compound index on `groupId` + `userId` and a user role.
4. `expenses`: Stores expense detail, payer, total amount, split type, and calculated splits.
5. `settlements`: Stores cash payment logs between users.
6. `comments`: Stores chat messages scoped to expenses.

---

## API Design

| Endpoint | Method | Description | Auth |
|---|---|---|---|
| `/api/auth/register` | `POST` | Create a user, return JWT | Public |
| `/api/auth/login` | `POST` | Verify credentials, return JWT | Public |
| `/api/auth/me` | `GET` | Fetch current user details | Protected |
| `/api/groups` | `POST` | Create a new group | Protected |
| `/api/groups` | `GET` | Get user's active groups | Protected |
| `/api/groups/:groupId` | `GET` | Get group details (members, expenses) | Protected |
| `/api/groups/:groupId/members` | `POST` | Add member by email | Protected |
| `/api/groups/:groupId/members/:userId`| `DELETE` | Remove member from group (Creator only) | Protected |
| `/api/groups/:groupId` | `DELETE` | Soft-delete group (Creator only) | Protected |
| `/api/groups/:groupId/leave` | `POST` | Leave group (must have 0 balance) | Protected |
| `/api/expenses` | `POST` | Log a new expense and calculate splits | Protected |
| `/api/expenses/:expenseId` | `PUT` | Edit expense (Creator or Group Admin only) | Protected |
| `/api/expenses/:expenseId` | `DELETE` | Soft-delete expense (Creator or Group Admin only)| Protected |
| `/api/groups/:groupId/balances` | `GET` | Calculate current net pairwise balances | Protected |
| `/api/settlements` | `POST` | Record a cash settlement transaction | Protected |
| `/api/groups/:groupId/settlements` | `GET` | Fetch settlement records for a group | Protected |
| `/api/expenses/:expenseId/comments` | `GET` | Get comments for an expense | Protected |
| `/api/expenses/:expenseId/comments` | `POST` | Create a comment for an expense | Protected |

---

## Routing Structure (Frontend)

- `/login` - Login Page
- `/signup` - Signup Page
- `/` - Protected Layout (Dashboard)
- `/groups/:groupId` - Protected Layout (Group Detail view with Settle Up modal)
- `/expenses/:expenseId` - Protected Layout (Expense detail modal/chat overlay)

---

## Folder Structure

```text
splitwise-clone/
├── backend/
│   ├── src/
│   │   ├── config/          # db.js, socket.js
│   │   ├── controllers/     # authController, groupController, expenseController, etc.
│   │   ├── middlewares/     # authMiddleware, errorMiddleware, validationMiddleware
│   │   ├── models/          # User, Group, GroupMember, Expense, Settlement, Comment
│   │   ├── routes/          # authRoutes, groupRoutes, expenseRoutes, settlementRoutes, commentRoutes
│   │   ├── services/        # balanceService (Dynamic aggregation queries)
│   │   ├── utils/           # joiSchemas.js
│   │   └── index.js         # Entrypoint
│   ├── package.json
│   └── .env
└── frontend/
    ├── src/
    │   ├── components/      # Common components: Button, Input, Modal, Sidebar
    │   ├── context/         # AuthContext
    │   ├── hooks/           # useSocket, useFetch
    │   ├── layouts/         # DashboardLayout
    │   ├── pages/           # Login, Signup, Dashboard, GroupDetail, ExpenseDetail
    │   ├── services/        # api.js (Axios instance)
    │   ├── utils/           # helpers.js (formatting currency, dates)
    │   ├── routes/          # AppRoutes.js
    │   ├── App.jsx
    │   └── index.css        # Tailwind directives and styling rules
    ├── package.json
    └── tailwind.config.js
```

---

## Implementation Steps

### Phase 1: Database Setup & Schemas
- Initialize Node.js backend.
- Define Mongoose schemas for User, Group, GroupMember, Expense, Settlement, and Comment.
- Define Joi schemas for request validation.

### Phase 2: Core Backend APIs
- Implement Auth (Register, Login, Protected route middleware).
- Implement Group APIs (Create, fetch active groups, add member).
- Implement Expense APIs (Validate split type sums, insert, edit, soft-delete).
- Implement Balance Logic: aggregation pipeline to compute who owes whom.
- Implement Settlement APIs.

### Phase 3: WebSockets (Socket.io)
- Set up Socket.io connection.
- Define rooms scoped to expense IDs.
- Implement socket events for comment creation and typing indicators.

### Phase 4: Frontend Development
- Initialize React (Vite) and install Tailwind CSS.
- Set up Routing (public/private routes).
- Build login, signup, and dashboard screens.
- Implement styling: Tangerine (#FF7A1A) and Charcoal (#0D0D0D / #1F1F1F / #2A2A2A) theme. Strict flat styling, 1px solid borders, no rounded corners (`rounded-none`).
- Build Group details view, Settle Up modal, Add Expense modal.
- Build Expense Details modal with Socket-based real-time chat.

### Phase 5: Testing & Verification
- Perform manual workflow checks: user registration -> create group -> add member -> create equal/percentage splits -> settle balances.
- Verify real-time messages are broadcasted correctly.

---

## Deployment Strategy
- **Frontend:** Deployed on Vercel. Static build configuration.
- **Backend:** Deployed on Render. Web Service configuration, dynamic environment variables.
- **Database:** MongoDB Atlas M0 cluster.

---

## Testing Strategy
- **Manual Verification:** Complete integration testing of the primary path from registration to settlements.
- **Real-Time Testing:** Dual-browser validation to confirm instant comment delivery and typing indicator displays.

---

## Tradeoffs
- **Dynamic Aggregation:** High database query load, but guarantees data is always up-to-date and avoids complex cache invalidation code.
- **LocalStorage:** Chosen over HTTP-only cookies to simplify deployment on separate free domains, knowing the XSS security trade-off.

---

## Future Improvements
- **Debt Simplification Algorithm:** Minimizing transaction volume.
- **Receipt OCR Scanning:** Automated receipt data extraction.
- **Multi-Currency Support:** Support exchange rates and transactions in different currencies.
- **Global Activity Log:** Centralized system alerts.
