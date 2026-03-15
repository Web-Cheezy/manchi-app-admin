# Backend Architecture & Integration Documentation

This document explains the backend architecture of the Food App, how data flows through the system, and how to integrate a new frontend website or mobile app with this backend.

## 1. Architecture Overview

This project uses a **Serverless Architecture** powered by **Supabase** (Backend-as-a-Service) and **Next.js** (Admin Dashboard).

- **Database**: PostgreSQL (hosted on Supabase).
- **Authentication**: Supabase Auth (Email/Password, OAuth).
- **Storage**: Supabase Storage (for food images).
- **Admin Interface**: Next.js 15+ (React) application for managing orders and menu items.
- **API**: There is no traditional "API Server" (like Express or Django). Instead, the frontend connects **directly** to the database using the Supabase Client SDK, secured by Row Level Security (RLS) policies.

---

## 2. Database Schema & Relationships

The database consists of relational tables for structured data and JSONB columns for flexible data (like order snapshots).

### Core Tables

1. **`auth.users`** (System)
   - Managed by Supabase. Stores email, encrypted passwords, and user IDs (UUID).

2. **`public.profiles`**
   - Extends `auth.users`.
   - **Columns**: `id` (FK to auth.users), `full_name`, `phone`, `phone_number`.
   - **Purpose**: Stores customer contact details.

3. **`public.foods`** & **`public.categories`**
   - **Foods**: Menu items (Name, Price, Image, Category ID).
   - **Categories**: Groups for foods (e.g., "Rice Dishes", "Drinks").
   - **Relationship**: `foods.category_id` -> `categories.id`.

4. **`public.sides`**
   - Extras, proteins, and drinks that can be added to a meal.
   - **Columns**: `name`, `price`, `type` ('protein', 'extra', etc.).

5. **`public.orders`**
   - The central transaction table.
   - **Columns**:
     - `id`: Order ID (Auto-increment).
     - `user_id`: Link to the customer (`auth.users`).
     - `status`: 'pending', 'confirmed', 'delivered', etc.
     - `items`: **JSONB** column storing a snapshot of what was ordered (name, qty, price) at that moment.
     - `total_amount`, `delivery_address`, `created_at`.

### Security (Row Level Security - RLS)
- **RLS** acts as the firewall for the database.
- **Customers**: Can only `SELECT` their own orders and `INSERT` new orders.
- **Admins**: Can `SELECT`, `UPDATE`, and `DELETE` all records (configured via SQL policies).
- **Public**: Can `SELECT` active menu items (`foods`, `categories`).

---

## 3. How Routes & Requests are Parsed

Since this is a Next.js app using Supabase, "routes" work differently than a standard API.

### Admin Dashboard (Next.js)
1. **Request**: User navigates to `/dashboard/orders`.
2. **Middleware (`proxy.ts`)**:
   - Intercepts the request.
   - Checks if a Supabase Auth session exists (cookies).
   - If **No Session**: Redirects to `/login`.
   - If **Session Exists**: Allows access.
3. **Page Load**:
   - The React component (`useEffect`) initializes the Supabase Client.
   - It sends a WebSocket/HTTP request directly to Supabase PostgREST API.
   - Example Query:
     ```javascript
     supabase.from('orders').select('*').order('created_at', { ascending: false })
     ```

### External Websites / Mobile Apps
They do not go through the Next.js middleware. They connect directly to Supabase API endpoints.

---

## 4. Integration Guide: Implementing Your Own Frontend

To build a website (e.g., "Order Online" site) that uses this backend, follow these steps.

### Step 1: Install SDK
You can use React, Vue, Angular, or plain HTML/JS.
```bash
npm install @supabase/supabase-js
```

### Step 2: Initialize Client
Create a file (e.g., `supabaseClient.js`) with your project credentials.
*Note: The "Anon Key" is safe to expose in the browser because RLS protects the data.*

```javascript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://YOUR_PROJECT_ID.supabase.co'
const supabaseKey = 'YOUR_PUBLIC_ANON_KEY'

export const supabase = createClient(supabaseUrl, supabaseKey)
```

### Step 3: Fetching the Menu (Public Data)
Anyone can view the menu (no login required).

```javascript
async function getMenu() {
  // Fetch foods with their category names
  const { data, error } = await supabase
    .from('foods')
    .select('*, categories(name)')
    .eq('is_available', true)
  
  if (error) console.error(error)
  return data
}
```

### Step 4: User Authentication (Sign Up / Login)
Users must be logged in to place orders.

```javascript
// Sign Up
async function signUp(email, password, fullName, phone) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, phone: phone } // Saved to metadata
    }
  })
}

// Login
async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })
}
```

### Step 5: Placing an Order
To place an order, insert a record into the `orders` table.

```javascript
async function placeOrder(userId, cartItems, total, address) {
  // Prepare items snapshot for JSONB column
  const orderItems = cartItems.map(item => ({
    name: item.name,
    quantity: item.quantity,
    price: item.price,
    options: item.selectedSides // e.g. [{name: 'Plantain', price: 500}]
  }))

  const { data, error } = await supabase
    .from('orders')
    .insert([
      {
        user_id: userId,
        total_amount: total,
        delivery_address: address,
        items: orderItems, // Saves snapshot
        status: 'pending'
      }
    ])
    .select()
}
```

### Step 6: Real-time Order Updates
Listen for changes to an order status (e.g., when Admin changes "Pending" to "Delivering").

```javascript
supabase
  .channel('orders')
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'orders',
      filter: `user_id=eq.${currentUserId}`
    },
    (payload) => {
      console.log('Order update:', payload.new)
      alert(`Order status changed to: ${payload.new.status}`)
    }
  )
  .subscribe()
```

---

## 5. Summary of Workflow

1. **Admin**: Logs into Next.js Dashboard -> Adds Menu Items (`foods` table).
2. **Customer**: Opens Website/App -> Fetches Menu (`foods` table).
3. **Customer**: Adds items to cart -> Logs in (`auth.users`).
4. **Customer**: Checkouts -> Inserts row into `orders` table.
5. **Admin**: Dashboard auto-refreshes (or polling) -> Sees new order.
6. **Admin**: Clicks "Accept" -> Updates `orders.status` to 'preparing'.
7. **Customer**: Receives notification/UI update via Realtime subscription.
