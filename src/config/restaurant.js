// Business rules for the restaurant. The website's own copy lives in frontend/src/data/schedule.js;
// keep the two in sync (the API is the one that actually enforces these rules).
// All dates and times are Philippine time (Asia/Manila, UTC+8, no daylight saving).

export const restaurant = {
  timezoneOffset: '+08:00',

  // days: 0 = Sunday ... 6 = Saturday. Times are 24-hour HH:MM.
  schedule: [
    { label: 'Monday - Friday', days: [1, 2, 3, 4, 5], open: '10:00', close: '21:00' },
    { label: 'Saturday', days: [6], open: '09:00', close: '22:00' },
    { label: 'Sunday', days: [0], open: '09:00', close: '20:00' },
  ],

  slotLengthMinutes: 30,
  lastSeatingBeforeCloseMinutes: 60,

  // Largest party that can be booked online (bigger groups use the contact page).
  maxOnlineGuests: 12,
  // Seats that can be booked for one time slot, across all tables.
  seatsPerSlot: 40,
  // How far ahead a table can be booked.
  maxDaysAhead: 90,
  // A table must be booked at least this many hours ahead, and a guest can change or cancel
  // a reservation until this many hours before it starts. After that, they call the restaurant.
  cutoffHours: 2,
  // Upcoming reservations one email address can hold at the same time.
  maxActivePerEmail: 5,

  occasions: ['birthday', 'anniversary', 'family', 'barkada', 'business', 'other'],
  contactTopics: ['question', 'reservation', 'group', 'feedback', 'other'],

  preOrder: {
    maxDifferentDishes: 20,
    maxQuantityPerDish: 20,
    maxTotalQuantity: 60,
  },
}
