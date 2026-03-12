# Prediction App Development Tasks

- [x] 1. Project Planning & Architecture
  - [x] 1.1. Confirm Technology Stack (PostgreSQL, Google OAuth, Node.js)
  - [x] 1.2. Define Database Schema (Users, Predictions, Roles)
  - [x] 1.3. Define API Endpoints
  - [x] 1.4. Create Implementation Plan

- [/] 2. Backend Development (Node.js + Express)
  - [x] 2.1. Initialize project in new folder, connect PostgreSQL
  - [x] 2.2. Auth: Google OAuth + JWT (Passport.js)
  - [x] 2.3. Admin role management middleware
  - [/] 2.4. Data Integration & Source Management:
    - [x] Dynamic Data Source API (CRUD)
    - [x] US Stocks (Yahoo Finance)
    - [x] Crypto (Binance/Yahoo API)
    - [x] TR Stocks (BIST Scraper)
  - [x] 2.5. Native JS Prediction Engine (Rewrite of scanner.py) + AI API Setup
  - [x] 2.6. REST API endpoints for web & mobile

- [x] 3. Web Frontend (React + Vite)
  - [x] 3.1. Initialize project
  - [x] 3.2. Auth screens (Google Login Integrated)
  - [x] 3.3. User dashboard (view predictions)
  - [x] 3.4. Admin panel (manage users, settings, data sources)
  - [x] 3.5. React Router for navigation

- [x] 4. Mobile App Development (React Native)
  - [x] 4.1. Initialize Project & Navigation
  - [x] 4.2. Auth Guard & Mock Login (StyleSheet based)
  - [x] 4.3. Dashboard & Detail Screens (Full Logic)
  - [x] 4.4. Global Money Flow Migration (Vertical Layout)
  - [x] 4.5. UI Stability Fixes (NativeWind to StyleSheet)

- [ ] 5. Deployment
  - [ ] 5.1. Deploy backend to VM
  - [ ] 5.2. Deploy web frontend
  - [ ] 5.3. Build EAS APK & IPA
