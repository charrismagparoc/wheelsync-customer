# WheelSync Customer Website

The booking website for **customers** of Pardz Car Rental. Customers create an account, browse the available vehicles,
review the rental agreement, submit their requirements and request a booking. They then follow the booking's status
and get notifications from Pardz. The link is meant to be posted on Pardz's Facebook page.

It talks only to the WheelSync API ([`../wheelsync-fastapi_postgres-main`](../wheelsync-fastapi_postgres-main/README.md)).
System overview and the full flow: [`../README.md`](../README.md).

## Run it

```bat
npm install          :: first time only
npm run dev          :: http://localhost:5174
```

The backend must be running (default `http://localhost:8000`). `npm run build` makes a production build in `dist/`,
`npm run preview` serves it, and `npm run lint` checks the code.

**Settings (`.env`):** `VITE_API_URL=http://localhost:8000` is the backend address, with no trailing slash. Copy `.env.example` to `.env`.

## What a customer does

1. **Create an account:** name, email, phone, password. They click the activation link in the email, then sign in.
   Blacklisted accounts cannot sign in.
2. **Browse vehicles:** the available cars as cards with a photo, type and details. The photos are samples; the notice under
   the heading says the actual vehicle is seen at Pardz.
3. **Book now:**
   1. Choose dates, pickup and return times, service (self-drive, with driver, pickup/drop-off) and destination
      (from the price sheet, or a custom one). Dates already taken for that car are blocked.
   2. **Review the rental agreement** and accept the rental rules.
   3. **Requirements:** age (25+), two valid IDs (type, number, photo), proof of address and proof of income.
      They are saved to the account, so the next booking does not ask again.
   4. Submit. The booking is **Pending** until the admin decides.
4. **My bookings:** see each booking's status (pending, accepted, ongoing, completed, rejected).
   A rejected booking shows the reason and can be **updated and resubmitted**.
5. **Notifications:** booking decisions, requirement reviews and return reminders 2 hours and 30 minutes before the car is due back.
   A short **sound** plays for new notifications; turn it on or off on this page. Booking emails are also sent when email is set up.
6. **Settings:** account information, ID details and verification status, light / dark appearance.

## Pages

| Page | Route |
|---|---|
| Available vehicles + booking flow | `/` |
| My bookings | `/bookings` |
| Notifications | `/notifications` |
| Settings | `/settings` |
| Sign in / Create account / Forgot password | `/login`, `/signup`, `/forgot-password` |

## Folder structure

```
wheelsync-customer-main/
├── index.html               page shell
├── public/                  favicon, icons, Pardz banner (sign-in page)
├── src/
│   ├── main.jsx             app entry
│   ├── App.jsx              routes (table above)
│   ├── index.css            Tailwind + theme colours, blue-gradient vehicle cards, badges
│   ├── pages/
│   │   ├── Vehicles.jsx         vehicle cards, details pop-up, booking form, agreement, requirements
│   │   ├── MyBookings.jsx       booking list, edit & resubmit a rejected booking
│   │   ├── Notifications.jsx    notifications, mark read, sound on/off
│   │   ├── Settings.jsx         account, requirements status, appearance
│   │   ├── Login.jsx, Signup.jsx, ForgotPassword.jsx
│   ├── components/
│   │   ├── Layout.jsx           top bar (clock, notifications bell with chime, theme, account menu)
│   │   ├── DatePicker.jsx       calendar that greys out taken dates
│   │   ├── ReturnReminderPopups.jsx  2-hour / 30-minute return pop-ups
│   │   ├── PasswordInput.jsx    password field with show/hide
│   │   ├── Badge.jsx, ThemeToggle.jsx
│   │   ├── ProtectedRoute.jsx   sends signed-out users to the sign-in page
│   │   └── ErrorBoundary.jsx    friendly message instead of a blank page on errors
│   ├── context/
│   │   ├── AuthContext.jsx      signed-in customer, sign in / out
│   │   └── ThemeContext.jsx     dark / light mode
│   └── lib/
│       ├── api.js               calls to the backend (adds the sign-in token)
│       ├── realtime.js          WebSocket live updates
│       ├── destinations.js      destination list (loaded from the API; built-in list as fallback)
│       └── sound.js             notification chime
├── .env.example             VITE_API_URL
├── vercel.json              hosting config (all routes → index.html)
├── vite.config.js           dev server on port 5174
├── .oxlintrc.json           lint rules
└── package.json
```

## Built with

React 19 · Vite · Tailwind CSS 4 · React Router · lucide-react icons.

## Deploying

`npm run build`, then host the `dist/` folder; `vercel.json` is set up for Vercel.
Set `VITE_API_URL` to the public HTTPS address of the API before building, and add this site's address to the API's `CORS_ORIGINS`.
