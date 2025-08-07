# Johri - Jewelry Platform Backend

A robust backend service for a modern jewelry platform, featuring a multi-role architecture for Super Admins, Jewelers, and End-Users. Built with Node.js, Express, and PostgreSQL, this project provides a secure and scalable foundation for managing products, users, and platform features.

---

## ✨ Features

This backend supports a wide range of features designed for a comprehensive e-commerce platform:

* **Multi-Role Authentication:**
    * **Super Admin:** Manages the entire platform (categories, packages). Logs in with username/password or Google SSO.
    * **Jeweler:** Manages their own product listings. Logs in with username/password.
    * **End-User:** Browses the platform. Logs in using a passwordless mobile number and OTP flow.

* **Secure Password Management:**
    * Separate password reset flows for Super Admins (via email OTP) and Jewelers (via SMS OTP).
    * Includes account lockout mechanisms to prevent brute-force attacks.

* **Product Management:**
    * Full CRUD (Create, Read, Update, Delete) functionality for product listings.
    * Supports image uploads for products.
    * Role-based access ensures Jewelers and Admins can only manage their own products.

* **Category Management:**
    * Super Admins can create, update, and delete product categories (e.g., Gold, Silver, Diamonds).
    * Ability to associate categories with multiple jewelry types (e.g., Rings, Necklaces).

* **Package Management:**
    * Super Admins can create and manage free and paid packages for different user tiers (Jewelers or End-Users).
    * Control package details like name, price, validity, and features.

* **Session Management:**
    * Secure, persistent sessions handled by `express-session` and `connect-pg-simple`.
    * Includes inactivity timeouts for enhanced security.

---

## 🛠️ Tech Stack

* **Backend:** Node.js, Express.js
* **Database:** PostgreSQL
* **Authentication:** Passport.js (Local Strategy for username/password, OTP for passwordless)
* **Session Store:** `connect-pg-simple`
* **Validation:** Joi
* **File Uploads:** Multer

##  API Endpoints

Here is a summary of the main API routes available:

| Method | Endpoint                    | Description                                         | Access          |
| :----- | :-------------------------- | :-------------------------------------------------- | :-------------- |
| `POST` | `/auth/register`            | Register a new Owner or Jeweler.                    | Public          |
| `POST` | `/auth/login`               | Log in an Owner or Jeweler.                         | Public          |
| `POST` | `/auth/logout`              | Log out the current user.                           | Authenticated   |
| `POST` | `/login/otp/send`           | Send a login OTP to an end-user's mobile.           | Public          |
| `POST` | `/login/otp/verify`         | Verify an OTP to log in an end-user.                | Public          |
| `POST` | `/forgot-password/initiate` | Start the password reset process for an Owner/Jeweler.| Public          |
| `POST` | `/forgot-password/verify-otp`| Verify a password reset OTP.                        | Public          |
| `POST` | `/forgot-password/reset`    | Set a new password after verification.              | Public          |
| `POST` | `/products`                 | Create a new product listing.                       | Owner, Jeweler  |
| `GET`  | `/products`                 | Get all products for the logged-in user.            | Owner, Jeweler  |
| `PUT`  | `/products/:id`             | Update a specific product.                          | Owner, Jeweler  |
| `DELETE`| `/products/:id`             | Delete a specific product.                          | Owner, Jeweler  |
| `POST` | `/categories`               | Create a new category.                              | Owner           |
| `GET`  | `/categories`               | Get all categories.                                 | Owner           |
| `POST` | `/admin/packages`           | Create a new user package.                          | Owner, Admin    |
| `GET`  | `/admin/packages`           | Get packages by type (Free/Paid).                   | Owner, Admin    |
