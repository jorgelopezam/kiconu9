# Coupons Collection Schema

## Collection: `coupons`

Each document represents a promotional coupon created by admin users for marketing campaigns.

### Document Structure

```typescript
interface Coupon {
  code: string;              // Unique coupon code (uppercase)
  discount: number;          // Discount percentage (1-100)
  campaign: string;          // Campaign name/description
  expiration_date: Timestamp; // When the coupon expires
  created_by: string;        // User ID of admin who created it
  created_at: Timestamp;     // When the coupon was created
  redeemed_count: number;    // Number of times redeemed (starts at 0)
}
```

### Fields

- **code** (string, required)
  - The promotional code users will enter
  - Automatically converted to uppercase
  - Should be unique across all coupons
  - Example: "KICONU25OFF", "BIENVENIDO10"

- **discount** (number, required)
  - Percentage discount (1-100)
  - Example: 25 for 25% off

- **campaign** (string, required)
  - Name or description of the marketing campaign
  - Example: "Venta de Verano", "Nuevo Cliente"

- **expiration_date** (Timestamp, required)
  - Date when the coupon becomes invalid
  - Users cannot apply expired coupons

- **created_by** (string, required)
  - User ID (uid) of the admin who created the coupon
  - References the `users` collection

- **created_at** (Timestamp, required)
  - Timestamp of when the coupon was created
  - Set automatically on creation

- **redeemed_count** (number, required)
  - Tracks how many times the coupon has been used
  - Starts at 0 on creation
  - Incremented when users apply the coupon

### Security Rules

- **Read**: All authenticated users can read coupons (to validate and apply them)
- **Create**: Only admin users can create coupons
- **Update**: Only admin users can update coupons (e.g., to increment redeemed_count)
- **Delete**: Only admin users can delete coupons

### Usage

Coupons are created through the Marketing page (`/marketing`) which is only accessible to admin users. The page provides:

1. **Coupon Generator Form**
   - Input fields for code, discount, campaign, and expiration date
   - Validation for discount percentage (1-100)
   - Automatic uppercase conversion for codes

2. **Coupons Table**
   - Displays all generated coupons
   - Shows: code, discount, campaign, expiration date, redeemed count
   - Additional columns: creator name and creation date
   - Sorted by creation date (newest first)

### Future Enhancements

Potential additions to the schema:
- `max_uses`: Limit total number of redemptions
- `user_specific`: Array of user IDs who can use the coupon
- `min_purchase`: Minimum purchase amount required
- `active`: Boolean to enable/disable without deleting
- `usage_logs`: Sub-collection tracking each redemption
