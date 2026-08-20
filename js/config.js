/* =============================================================================
   MYSTERY ARCADE — ITE Work Party Invitation
   -----------------------------------------------------------------------------
   EVERYTHING YOU MIGHT WANT TO EDIT LIVES IN THIS FILE.
   No other file needs to be touched to change dates, times, venues or contacts.
   ========================================================================== */

const CONFIG = {

  /* --- Who RSVPs go to ---------------------------------------------------- */
  // Swap this for a work address any time. Nothing else needs to change.
  RSVP_EMAIL: 'evanccordova@gmail.com',
  RSVP_SUBJECT: 'RSVP — ITE Party, Sept 25',
  RSVP_BODY: [
    'Count me in!',
    '',
    'Name:',
    'Bringing a +1? (yes / no):',
    "+1's name:",
    'Any dietary restrictions:',
    '',
  ].join('\n'),

  /* --- The headline ------------------------------------------------------- */
  EVENT_NAME: 'ITE PARTY',
  EVENT_DATE_LONG: 'Friday, September 25, 2026',
  EVENT_DATE_SHORT: 'FRI 9.25.26',
  EVENT_ISO_DATE: '2026-09-25',

  /* --- Coin slot hotspot -------------------------------------------------- */
  // Position of the glowing coin slot as a PERCENTAGE of the hero image.
  // The hero photo is 16:9. If the glow doesn't sit exactly on the middle
  // cabinet's coin slot, nudge these two numbers and reload — that's the fix.
  COIN_SLOT: { x: 47.4, y: 43.0 },

  /* --- Timings ------------------------------------------------------------ */
  BOOT_DURATION_MS: 2600,   // how long the 8-bit loading bar takes
  LOADER_BLOCKS: 24,        // number of chunky blocks in the bar

  /* --- Venues ------------------------------------------------------------- */
  VENUES: [
    {
      id: 'green-pig',
      order: '1',
      time: '7:00 PM',
      name: 'The Green Pig Pub',
      sub: 'Rooftop Patio',
      address: '31 E 400 S, Salt Lake City, UT 84111',
      accent: 'green',
      notes: [
        'The rooftop is <strong>private to us until 8:30 PM</strong>.',
        "After 8:30 it opens to the public — we can absolutely still hang up there, it just won't be ours alone.",
        'Food and drinks are covered by ITE.',
      ],
    },
    {
      id: 'quarters',
      order: '2',
      time: '8:30 – 9:00 PM',
      name: 'Quarters Arcade Bar',
      sub: 'Short walk from the Pig',
      address: '5 E 400 S, Salt Lake City, UT 84111',
      accent: 'cyan',
      notes: [
        'We walk over together between <strong>8:30 and 9:00 PM</strong>.',
        'Every employee gets <strong>two rolls of quarters</strong> to play with.',
        'Drinks are covered until <strong>10:30 PM</strong>.',
      ],
    },
  ],

  /* --- Timeline (rendered as an arcade high-score table) ------------------ */
  TIMELINE: [
    { time: '7:00 PM',  label: 'ARRIVE',        detail: 'Green Pig Pub rooftop patio' },
    { time: '8:30 PM',  label: 'ROOFTOP OPENS', detail: 'Patio goes public — we can stay' },
    { time: '9:00 PM',  label: 'WALK OVER',     detail: 'Head to Quarters Arcade Bar' },
    { time: '10:30 PM', label: 'LAST CALL',     detail: 'Covered drinks end at Quarters' },
  ],

  /* --- Perks (rendered as "power-ups") ------------------------------------ */
  PERKS: [
    { icon: '🕐', title: 'HALF DAY',        detail: "It's a half day — office hours 9:00 AM–1:00 PM on the 25th." },
    { icon: '🍔', title: 'FOOD & DRINKS',   detail: 'Covered by ITE at the Green Pig.' },
    { icon: '👥', title: 'BRING A +1',      detail: 'Every employee gets one guest.' },
    { icon: '🪙', title: '2 ROLLS OF QUARTERS', detail: 'Per employee, to play with at Quarters.' },
    { icon: '🍻', title: 'DRINKS TIL 10:30', detail: 'Covered at Quarters Arcade Bar.' },
    { icon: '🚗', title: 'RIDES REIMBURSED', detail: 'Lyfts and Ubers will be reimbursed.' },
  ],
};
