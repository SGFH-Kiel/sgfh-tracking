# Datenmodell Firestore

## Collections

## `users`

Wichtige Felder:

- `displayName`
- `email`
- `roles`
- `feesPaid`
- `skipHours`
- `onboardingState`

## `boats`

Wichtige Felder:

- `name`
- `bootswart` – User-ID des ersten Bootswarts (optional)
- `bootswart2` – User-ID des zweiten Bootswarts (optional)
- `requiresApproval`
- `blocked`
- `color`

## `boatReservations`

Wichtige Felder:

- `boatId`
- `userId`
- `userName`
- `title`
- `description`
- `startTime`
- `endTime`
- `status` (`draft`, `pending`, `approved`, `rejected`, `cancelled`)
- `visibility` (`private`, `public`)
- `publicDetails.freeSeatsText`
- `eligibilitySnapshot`

## `publicBoatReservations`

Datensparsame, extern lesbare Projektion:

- `boatId`
- `boatName`
- `title`
- `startTime`
- `endTime`
- `visibility`
- `reservationStatus`
- `freeSeatsText`
- `updatedAt`

## `workAppointments`

Wichtige Felder:

- `title`
- `description`
- `startTime`
- `endTime`
- `boatId`
- `participants[]`
- `supplies[]`
- `private`

## `systemConfig/default`

- `yearChangeDate`
- `workHourThreshold`
- `featureFlags`
