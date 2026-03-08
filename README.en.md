# Annur Official

A web-based financial management system for dormitory environments, built with Next.js 14 and MongoDB. The application simplifies monthly payment management, income and expense recording, and tracking member debt status.

[Baca dalam Bahasa Indonesia](./README.md)

---

## Table of Contents

- [About the Project](#about-the-project)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation and Usage](#installation-and-usage)
- [Environment Configuration](#environment-configuration)
- [Contributing](#contributing)
- [License](#license)

---

## About the Project

Annur Official is a full-stack web application designed to simplify financial management in a dormitory or community setting. The application provides two access levels: **Admin** for comprehensive data management, and **User** for independently viewing billing information and payment status.

Authentication is handled via Google OAuth, ensuring access is restricted to authorized accounts only. All data is stored in MongoDB Atlas.

---

## Key Features

### User Panel
- View a summary of bills due for the current month
- Monitor the history of additional income and expenses
- View each member's debt status in real-time
- Online payment guide via QRIS
- Offline payment guide via WhatsApp

### Admin Panel
- Add, edit, and delete monthly income records
- Add, edit, and delete monthly expense records
- Manage billing data (required monthly payments)
- User/member data management
- View payment data recaps

---

## Tech Stack

| Category | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Database | MongoDB + Mongoose |
| Authentication | NextAuth.js v5 (Google OAuth) |
| UI Components | Radix UI, shadcn/ui |
| Styling | Tailwind CSS |
| Icons | Lucide React, React Icons |
| Date Handling | Moment.js, date-fns |
| Progress Bar | next-nprogress-bar |
| Package Manager | Yarn |

---

## Project Structure

```
annur-official/
├── public/
│   └── qris.png                  # QRIS image for payment
├── src/
│   ├── app/
│   │   ├── (user)/               # Pages for general users
│   │   │   ├── page.jsx          # Main page (income & expenses)
│   │   │   ├── bayar/            # Billing & payment methods page
│   │   │   ├── data/             # Data recap page
│   │   │   └── hutang/           # Member debt list page
│   │   ├── admin/                # Admin-only pages
│   │   │   ├── page.jsx          # Admin dashboard
│   │   │   ├── data-pembayaran/  # Manage payment data
│   │   │   ├── data-user/        # Manage user data
│   │   │   ├── tagihan/          # Manage monthly bills
│   │   │   └── components-admin/ # Admin-specific components
│   │   └── api/                  # API Routes
│   │       ├── auth/             # Authentication endpoints
│   │       ├── data-bulanan/     # Monthly financial data API
│   │       ├── data-user/        # User data API
│   │       ├── add-payment/      # Add payment API
│   │       ├── action-add/       # Add data API
│   │       ├── edit-action/      # Edit data API
│   │       └── delete-action/    # Delete data API
│   ├── components/               # Reusable UI components
│   ├── lib/
│   │   ├── config.js             # Global application configuration
│   │   └── mongoose.js           # MongoDB database connection
│   ├── models/                   # Mongoose Schemas
│   │   ├── DataBulanan.js        # Monthly financial data schema
│   │   ├── DataPemasukan.js      # Income data schema
│   │   ├── DataPengeluaran.js    # Expense data schema
│   │   └── DataUser.js           # User data schema
│   └── utils/                    # Utility functions
├── auth.js                       # NextAuth configuration
├── middleware.js                 # Authentication middleware
├── next.config.mjs               # Next.js configuration
└── tailwind.config.js            # Tailwind CSS configuration
```

---

## Prerequisites

Make sure your system has the following installed:

- **Node.js** version 18 or newer
- **Yarn** as the package manager
- **MongoDB Atlas** or a local MongoDB instance
- A **Google Cloud** account for OAuth configuration

---

## Installation and Usage

**1. Clone this repository**

```bash
git clone https://github.com/username/annur-official.git
cd annur-official
```

**2. Install dependencies**

```bash
yarn install
```

**3. Create a `.env.local` file** and fill it with the required environment variables (see the [Environment Configuration](#environment-configuration) section).

**4. Run the development server**

```bash
yarn dev
```

The application will run at `http://localhost:3000`.

**5. Build for production**

```bash
yarn build
yarn start
```

---

## Environment Configuration

Create a `.env.local` file in the project root and fill in the following variables:

```env
# Public application URL (use http://localhost:3000 for development)
NEXT_PUBLIC_BASE_URL=http://localhost:3000/api

# MongoDB
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/database-name

# Google OAuth (from Google Cloud Console)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# NextAuth
NEXTAUTH_SECRET=your-random-secret-string
NEXTAUTH_URL=http://localhost:3000

# The email account allowed to access as admin
EMAIL=admin@gmail.com
```

### How to obtain Google OAuth credentials:
1. Open [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select an existing one
3. Enable **Google+ API** / **Google Identity**
4. Create an **OAuth 2.0 Client ID** under Credentials
5. Add `http://localhost:3000/api/auth/callback/google` to the list of **Authorized redirect URIs**

---

## Contributing

Contributions are very open and warmly welcomed. Here are the steps:

1. Fork this repository
2. Create a new branch (`git checkout -b feature/feature-name`)
3. Commit your changes (`git commit -m 'feat: add new feature'`)
4. Push to your branch (`git push origin feature/feature-name`)
5. Open a Pull Request

---

## License

This project is licensed under the **MIT License**. See the [LICENSE](./LICENSE) file for more information.
