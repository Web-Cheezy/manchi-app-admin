# Flutter App Integration Guide

This guide explains how your Flutter app should structure data when sending it to the Supabase backend to ensure compatibility with the Admin Panel.

## 1. Authentication

The app must use Supabase Auth. All database operations (especially creating orders) rely on `auth.uid()`.

```dart
// Example: Sign Up
final response = await supabase.auth.signUp(
  email: 'user@example.com',
  password: 'password123',
  data: { 'full_name': 'John Doe' }, // This metadata is auto-saved to profiles
);
```

## 2. Creating an Order

To ensure the Admin Panel displays orders correctly (including items and location), your Flutter app must insert data into the `orders` table with the following structure.

### Required Fields

| Field | Type | Description |
| :--- | :--- | :--- |
| `user_id` | UUID | The current user's ID (`supabase.auth.currentUser!.id`). |
| `status` | Text | Initial status: `'pending'`. |
| `total_amount` | Number | The final price of the order. |
| `delivery_address` | Text | Full address string. |
| `location` | Text | **CRITICAL**: Must be either `'Aurora'` or `'Chasemall'`. determine this based on user selection or address logic. |
| `items` | JSON | **CRITICAL**: A JSON array of the order contents. |

### The `items` JSON Structure

Instead of using a complex relational insert for `order_items`, simply send the full cart as a JSON array to the `items` column. This is what the Admin Panel reads.

```json
[
  {
    "id": 101,
    "name": "Jollof Rice",
    "price": 2500,
    "quantity": 2,
    "options": [
      { "name": "Chicken", "price": 1000, "quantity": 1 },
      { "name": "Plantain", "price": 500, "quantity": 1 }
    ]
  },
  {
    "id": 202,
    "name": "Fried Rice",
    "price": 2500,
    "quantity": 1,
    "options": []
  }
]
```

### Flutter Code Example

Here is how you should implement the checkout function in Dart:

```dart
Future<void> placeOrder() async {
  final user = supabase.auth.currentUser;
  if (user == null) return;

  // 1. Prepare the Items List
  final List<Map<String, dynamic>> cartItems = [
    {
      'id': 12, // Food ID
      'name': 'Jollof Rice',
      'price': 2500,
      'quantity': 2,
      'options': [
        {'name': 'Grilled Chicken', 'price': 1500, 'quantity': 1},
        {'name': 'Coleslaw', 'price': 500, 'quantity': 1}
      ]
    },
    // ... more items
  ];

  // 2. Determine Location (Logic depends on your app)
  // Example: If user selected a specific branch or based on address
  final String branchLocation = 'Chasemall'; // or 'Aurora'

  // 3. Send to Supabase
  await supabase.from('orders').insert({
    'user_id': user.id,
    'status': 'pending',
    'total_amount': 5500.00,
    'delivery_address': '123 Main St, Enugu',
    'delivery_lat': 6.12345, // Optional
    'delivery_lng': 7.12345, // Optional
    'location': branchLocation, // IMPORTANT for Admin Filtering
    'items': cartItems, // IMPORTANT for Admin View
    'created_at': DateTime.now().toIso8601String(),
  });
}
```

## 3. Updating User Profile

Users might want to update their phone number. The Admin Panel uses the `phone_number` field in the `profiles` table.

```dart
Future<void> updateProfile(String phone) async {
  final user = supabase.auth.currentUser;
  if (user == null) return;

  await supabase.from('profiles').update({
    'phone_number': phone,
  }).eq('id', user.id);
}
```

## 4. Key Takeaways

1.  **Always send `location`**: If you send `null`, the location-specific admins (e.g., Aurora Admin) will **NOT** see the order. Only Super Admins will see it.
2.  **Use the `items` JSON column**: Do not rely on the `order_items` table for the main display. The Admin Panel reads the JSON blob for speed and simplicity.
3.  **Status Values**: Use lowercase: `'pending'`, `'confirmed'`, `'preparing'`, `'delivering'`, `'delivered'`, `'cancelled'`.
