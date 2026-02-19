# Database Schema Documentation for Mobile App

This document outlines the database structure for the Food App, hosted on Supabase.

## 1. Tables

### `categories`
*Contains the dynamic menu categories for Main Dishes.*
- `id` (int8, PK): Unique identifier.
- `name` (text): Name of the category (e.g., "Rice Dishes", "Swallow", "Soups").
- `created_at` (timestamptz): Creation timestamp.

### `foods`
*Contains the main food items (Normal Dishes).*
- `id` (int8, PK): Unique identifier.
- `category_id` (int8, FK -> categories.id): **Crucial**: Links this food to a row in the `categories` table.
- `name` (text): Name of the food.
- `description` (text, nullable): Short description.
- `price` (float8): Price of the item.
- `image_url` (text, nullable): Public URL of the food image.
- `is_available` (bool): Whether the item is currently in stock.
- `created_at` (timestamptz): Creation timestamp.

### `sides`
*Contains side dishes, proteins, drinks, or extras.*
- `id` (int8, PK): Unique identifier.
- `name` (text): Name of the side.
- `price` (float8): Price of the side.
- `type` (text, nullable): **Crucial**: A text string used to group sides in the UI. 
    - **Values**: `'side'`, `'protein'`, `'drink'`, `'extra'`.
    - *Note*: This does NOT link to the `categories` table. It is a standalone classification.
- `image_url` (text, nullable): Public URL of the side image.
- `created_at` (timestamptz): Creation timestamp.

### `orders`
*Contains customer orders.*
- `id` (int8, PK): Unique identifier.
- `user_id` (uuid): The authenticated user ID (from Supabase Auth).
- `status` (text): Current status ('pending', 'confirmed', 'preparing', 'delivering', 'delivered', 'cancelled').
- `total_amount` (float8): Total cost of the order.
- `delivery_address` (text): Address for delivery.
- `delivery_lat` (float8, nullable): Latitude for map delivery.
- `delivery_lng` (float8, nullable): Longitude for map delivery.
- `created_at` (timestamptz): Creation timestamp.

### `order_items`
*Junction table linking Orders to Foods.*
- `id` (int8, PK): Unique identifier.
- `order_id` (int8, FK -> orders.id): The order this item belongs to.
- `food_id` (int8, FK -> foods.id): The food item ordered.
- `quantity` (int4): Number of items.
- `price_at_time` (float8): Price per unit at the time of order.
- `options` (jsonb, nullable): Any customizations or selected sides for this specific item.
- `created_at` (timestamptz): Creation timestamp.

### `food_sides`
*Junction table linking Foods to their available Sides.*
- `id` (int8, PK): Unique identifier.
- `food_id` (int8, FK -> foods.id): The parent food item.
- `side_id` (int8, FK -> sides.id): The associated side item.
- `created_at` (timestamptz): Creation timestamp.

## 2. Categorization Logic Explained

### A. Main Dish Categorization (Table-Based)
For main dishes (`foods`), we use a **Relational approach**.
*   **How it works**: Every food item belongs to a `category_id`.
*   **Why**: This allows you to dynamically create new sections on the home screen (e.g., "Breakfast Specials") without updating the app code.
*   **Mobile App Implementation**:
    1.  Fetch all categories.
    2.  Create a section/tab for each category.
    3.  Fetch foods for that category.

### B. Side Dish Categorization (Type-Based)
For sides (`sides`), we use a **Static Type approach**.
*   **How it works**: Every side has a `type` column with specific text values: `'protein'`, `'side'`, `'drink'`, `'extra'`.
*   **Why**: When a user selects a meal, the UI needs to present specific choices in a structured order (e.g., "Step 1: Choose Protein", "Step 2: Add Extras"). These are functional steps in the ordering flow, not general browsing categories.
*   **Mobile App Implementation**:
    1.  When a user selects a food, fetch its associated sides (via `food_sides`).
    2.  **Filter/Group** the results locally in the app based on the `type` string.
    3.  Display them in specific UI blocks (e.g., A "Proteins" dropdown, an "Extras" checklist).

## 3. Recommended Fetching Strategies (Flutter/Dart)

### 1. Fetching the Main Menu
```dart
// Get all foods with their category name
final response = await supabase
  .from('foods')
  .select('*, categories(name)')
  .eq('is_available', true)
  .order('category_id');
```

### 2. Fetching a Food Item Detail (with its options)
This is the most important query for the product page. It gets the food and all valid sides linked to it.

```dart
final response = await supabase
  .from('foods')
  .select('''
    *,
    food_sides (
      side:sides (*)
    )
  ''')
  .eq('id', selectedFoodId)
  .single();

// The result structure will look like:
// {
//   'name': "Jollof Rice",
//   'food_sides': [
//     { 'side': { 'name': "Chicken", 'type': "protein", 'price': 5.0, ... } },
//     { 'side': { 'name': "Coke", 'type': "drink", 'price': 2.0, ... } },
//     { 'side': { 'name': "Plantain", 'type': "side", 'price': 1.0, ... } }
//   ]
// }
```

### 3. Organizing Data on Mobile (Client-Side Logic)
After fetching the detail data above, your mobile app should group the `food_sides` list:

```dart
// Example logic
final data = response; // Assuming this is the Map from .single()
final allSides = List<Map<String, dynamic>>.from(data['food_sides']);

final proteins = allSides.where((item) => item['side']['type'] == 'protein').toList();
final drinks = allSides.where((item) => item['side']['type'] == 'drink').toList();
final extras = allSides.where((item) => item['side']['type'] == 'extra').toList();
```
