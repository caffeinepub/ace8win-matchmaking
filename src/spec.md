# ACE8WIN Matchmaking

## Current State

The ACE8WIN platform is a 1v1 gaming matchmaking system with the following features:

**Backend:**
- User profile management (name, email, phone, game ID, game name, refund QR)
- Match creation and management (1v1 only with scheduled start times)
- Join match system with entry fee payments
- Payment screenshot storage
- Transaction history tracking
- Refund processing system
- Admin role checking based on display name "ROWDY YADAV"

**Frontend:**
- Internet Identity authentication
- Profile setup form for new users
- Role-based dashboards (admin vs user)
- Match browsing and joining with UPI payment flow
- Auto-generated QR codes for payments
- User profile editing
- Admin features: create matches, view users, manage refunds

**Issues:**
- Admin system currently checks for display name "ROWDY YADAV" which failed to work properly
- Backend admin logic is not properly granting admin access

## Requested Changes (Diff)

### Add
- Nothing new to add

### Modify
- **Backend admin system**: Change from display name-based to email-based admin check
  - Make `shashiyadavbhai9@gmail.com` the hardcoded admin email
  - Update `isCallerAdmin` to check user profile email against admin email
- **Frontend**: No changes needed (already displays admin badge correctly when backend returns true)

### Remove
- Remove display name-based admin check logic

## Implementation Plan

1. **Backend changes**:
   - Regenerate Motoko backend with email-based admin system
   - Hardcode admin email as `shashiyadavbhai9@gmail.com`
   - Update `isCallerAdmin` function to check profile email field

2. **Frontend**: No changes required (already works correctly when backend returns proper admin status)

3. **Validation**: Typecheck and build

## UX Notes

- Users who create a profile with email `shashiyadavbhai9@gmail.com` will see the admin panel
- All other users see the regular user dashboard
- Admin badge displays in header when logged in as admin
