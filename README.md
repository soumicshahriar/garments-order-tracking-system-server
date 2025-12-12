# Garments Order & Production Tracker System (Server)

A secure, scalable backend built with **Node.js**, **Express.js**, and **MongoDB** with JWT authentication, role-based permission handling, and advanced production tracking features.

## 🌐 Live Server URL  
🔗 **Server URL:** https://garments-order-tracker-system-serve.vercel.app/

---

## 📌 Project Overview

The backend handles:

- User registration/login
- Token-based authentication (JWT in cookies)
- Role-based access control (Admin / Manager / Buyer)
- Product CRUD
- Order Booking + Order Flow
- Production Tracking Timeline
- Analytics API (stats & charts)
- Secure middleware for all private routes

---

## ✨ Features

### 🔐 Authentication
- Firebase → Custom JWT token  
- JWT stored in HTTP-only cookies  
- Protect all private routes  
- Admin-only, Manager-only, Buyer-only access  

---

### 👥 User Management
- Role update (buyer → manager → admin)
- Suspend users (with required reason)
- Admin can unsuspend or update feedback

---

### 📦 Product Management
- Managers can:
  - Add products  
  - Update their own products  
  - Delete their own products  
  - Manage inventory  
  - Control "Show On Home" flag  
- Admin can:
  - Update & delete ALL products  
  - Approve settings  

---

### 🛒 Orders API
- Create booking
- Validate quantity > minOrder and ≤ available stock
- Cancel pending orders
- Manager Approve / Reject
- Admin overview of all orders

---

### 🚚 Order Tracking API
- Add tracking steps:
  - Cutting Completed
  - Sewing Started
  - Finishing
  - QC Checked
  - Packed
  - Shipped
  - Out for Delivery  
- Each tracking item has:
  - timestamp  
  - location  
  - status  
  - note  

---

### 📊 Analytics API
- Today / This Week / This Month stats
- Product count
- Order count
- User count
- Manager count
- Production stats
- Chart data endpoints

---



## 🛡 Security & Best Practices
- CORS configured correctly
- HTTP-only cookies
- Token validation middleware
- Role-based access middleware
- Secure environment variables
- Deployed with production CORS rules
- No errors when reloading private routes

---

## 🧑‍💻 Developer  
**Soumic Shahriar**  
Backend — Garments Order & Production Tracker System  
Assignment-11 Job Task  
