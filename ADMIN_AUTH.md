# Simple Online Store - Admin Guide

## Admin Authentication

Admin users have elevated privileges to manage products. Only admins can access `/admin.html`.

### Default Admin Account
- Email: `admin@store.local`
- Password: `admin123`

This account is seeded on first startup. Use it to login and manage the store.

### Access Control
- `/admin.html` checks for admin status via `GET /api/admin/check`
- Non-admins are redirected to home page
- Admin status is stored in `users.json` with `isAdmin: true` flag

### Promote Users to Admin
1. Login as an admin user
2. Go to `/admin.html`
3. Scroll to the "Admin Users" section
4. Enter the user ID you want to promote
5. Click "Promote"

### API Endpoints

#### Check Admin Status
```
GET /api/admin/check
```
Returns `{ isAdmin: true }` if logged-in user is admin. Otherwise 403 Forbidden.

#### Promote User
```
POST /api/admin/promote
Content-Type: application/json

{ "userId": 2 }
```
Requires admin authentication. Promotes the user with the given ID to admin.

## Storage
- User data (including `isAdmin` flag) is stored in `users.json`
- Products are stored in `products.json`
- Deposits are stored in `deposits.json`
