# Flutter App Integration Guide

This guide explains how your Flutter app should fetch menu data and structure order data when talking to the Supabase backend so it stays compatible with the Admin Panel and branch-based availability.

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

## 2. Fetching menu items by branch

The menu is now managed in **two layers**:

1. `foods` and `sides`
   - These are the global menu records created by the Super Admin.
   - A food can also be globally hidden using `is_available = false`.

2. `food_availability` and `side_availability`
   - These store branch-specific availability for:
     - `Eromo`
     - `Chasemall`
   - Status values:
     - `available`
     - `out_of_stock`
     - `unavailable`

### What the Flutter app should show

For customer-facing menu screens, fetch only items that are:

- globally active
- in the user's selected branch
- marked as `available`

If an item is `out_of_stock` or `unavailable`, the customer should **not** be able to order it.

### Fetch foods for a branch

```dart
Future<List<Map<String, dynamic>>> fetchFoodsForBranch(String branchLocation) async {
  final res = await supabase
      .from('foods')
      .select('''
        id,
        name,
        description,
        price,
        image_url,
        category_id,
        is_available,
        categories(name),
        food_availability!inner(location, status)
      ''')
      .eq('is_available', true)
      .eq('food_availability.location', branchLocation)
      .eq('food_availability.status', 'available')
      .order('name');

  return List<Map<String, dynamic>>.from(res);
}
```

### Fetch sides for a branch

```dart
Future<List<Map<String, dynamic>>> fetchSidesForBranch(String branchLocation) async {
  final res = await supabase
      .from('sides')
      .select('''
        id,
        name,
        price,
        type,
        image_url,
        side_availability!inner(location, status)
      ''')
      .eq('side_availability.location', branchLocation)
      .eq('side_availability.status', 'available')
      .order('name');

  return List<Map<String, dynamic>>.from(res);
}
```

### Important menu rule

Your Flutter app should treat the branch selected by the user as the source of truth.

Example:

- If user selected `Eromo`, only query menu availability for `Eromo`
- If user selected `Chasemall`, only query menu availability for `Chasemall`

### Optional but strongly recommended

Before final checkout, re-check the selected foods and sides against availability again.

This helps prevent stale-cart issues such as:

- item was available when user opened menu
- admin later changed it to `out_of_stock`
- user tries to place order with old cart data

## 3. Creating an Order

To ensure the Admin Panel displays orders correctly, your Flutter app must insert data into the `orders` table with the following structure.

### Required Fields

| Field | Type | Description |
| :--- | :--- | :--- |
| `user_id` | UUID | The current user's ID (`supabase.auth.currentUser!.id`). |
| `status` | Text | Initial status: `'pending'`. |
| `total_amount` | Number | The final price of the order. |
| `delivery_address` | Text | Full address string. |
| `location` | Text | **CRITICAL**: Must be either `'Eromo'` or `'Chasemall'`. Determine this from the branch the user selected. |
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
  final String branchLocation = 'Chasemall'; // or 'Eromo'

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

### Order validation rule

The `location` sent in the order must match the branch the customer was browsing.

Example:

- customer browses `Eromo`
- cart was built from `Eromo` menu data
- order must be saved with `location: 'Eromo'`

Do **not** let the app fetch menu items from one branch and submit the order under another branch.

### Branch address mapping

Use the branch code in the database, but show the matching human-readable address in the app.

```dart
const branchAddresses = {
  'Chasemall': 'Chasemall, Port Harcourt, Rivers State.',
  'Eromo': 'Opposite Eromo Filling Station, New Road Eneka Atali Road Port Harcourt, Rivers State.',
};
```

Important:

- save `location` as `Eromo` in the database, not `Aurora`
- if your app still has an old `Aurora` value anywhere, replace it with `Eromo`
- use the full Eromo address only for display, delivery context, or branch selection UI

### Transport fare lookup (by LGA)
Before calculating your order total, your app should read the transport fare for the selected LGA from `transport_prices`.

If the row doesn’t exist yet, default to `2500`.

```dart
final res = await supabase
  .from('transport_prices')
  .select('price')
  .eq('lga', selectedLga)
  .maybeSingle();

final transportPrice = (res?['price'] as int?) ?? 2500;
```

Important: `selectedLga` must exactly match the LGA name stored in the table (use the strings from `assets/nigeria-state-and-lgas.json`).

## 4. Updating User Profile

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

## 5. Key Takeaways

1.  **Fetch menu by branch**: Always query foods and sides with the selected branch location.
2.  **Show only available items**: For customers, only show items where branch status is `available`.
3.  **Block unavailable items**: `out_of_stock` and `unavailable` must not be orderable.
4.  **Respect global menu state**: Foods with `is_available = false` should not be shown even if branch availability exists.
5.  **Always send `location` on orders**: If you send `null`, branch admins may not see the order correctly.
6.  **Use the `items` JSON column**: The Admin Panel reads the `items` JSON directly.
7.  **Status Values**: Order statuses must remain lowercase: `'pending'`, `'confirmed'`, `'preparing'`, `'delivering'`, `'delivered'`, `'cancelled'`.
