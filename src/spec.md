# ACE8WIN Matchmaking

## Current State
The platform has a full-featured matchmaking system (Draft 3) with:
- User profiles with game UID, game name, phone number, and refund QR codes
- Match creation and joining for 1v1, 2v2, and 4v4 modes
- UPI payment submission with auto-generated QR codes (ace8zonereal@ptyes)
- Admin dashboard for payment confirmation and user management
- Transaction history with refund tracking
- Authorization system (admin/user roles)
- Blob storage for QR codes and payment screenshots

## Requested Changes (Diff)

### Add
- Nothing new

### Modify
- Match creation UI: Remove 2v2 and 4v4 options, keep only 1v1
- Match creation form: Add time picker for match start time (scheduled real timing)
- User profile form: Already has phone number field, ensure it's prominently displayed
- Admin dashboard: Ensure phone numbers are visible in player info so admin can contact via WhatsApp

### Remove
- 2v2 and 4v4 match type options from frontend UI
- Backend logic for non-solo matches (already mostly done, just needs cleanup)

## Implementation Plan

1. Backend: Update Motoko code to only support 1v1 (solo) matches with scheduled start time
   - Match type validation (only "solo")
   - Store and return startTime for each match
   - Ensure user profiles include phone number

2. Frontend: Update UI to remove 2v2/4v4 options and add time scheduling
   - Admin match creation: Remove 2v2/4v4 dropdowns, add time picker for start time
   - Admin dashboard: Display player phone numbers prominently for WhatsApp contact
   - User profile: Ensure phone number is captured and displayed

## UX Notes
- Admin creates only 1v1 matches with specific start times
- Users see match start time when browsing available matches
- Admin can view phone numbers to send room ID/password via WhatsApp
- Payment flow with auto-generated UPI QR codes remains unchanged
