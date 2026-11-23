/**
 * Home page copy and media. PLACEHOLDER content, laid out to match the reference recording;
 * swap the words and media here without touching the components.
 */

export const intro = {
  /** Shown under the counter: "LOADING <script>the</script> EXPERIENCE". */
  loading: { before: 'Loading', script: 'The', after: 'Experience' },
  fact: {
    label: 'Did you know',
    // gmc.bt, checked 23 Nov 2026
    lines: ['GMC lies between Royal Manas National Park', 'and Phibsoo Wildlife Sanctuary.'],
  },
}

export const header = {
  /** GMC logo in the middle of the header. White version over the hero; colour version is /images/gmc-logo-color.png. */
  logo: '/images/gmc-logo-white.png',
  /** Shown instead when the header sits over the cream welcome page. */
  logoOnLight: '/images/gmc-logo-color.png',
  logoLabel: 'Gelephu Mindfulness City',
  /** Left side of the header. Inquiry is the investor's way in. */
  navLeft: [
    { label: 'Inquiry', icon: 'mail' as const, href: '#inquiry' },
    { label: 'Search', icon: 'search' as const, href: '#search' },
  ],
  nav: [
    { label: 'Industries', icon: 'outline' as const, href: '#industries' },
    { label: '3D Map', icon: 'map' as const, href: '#map' },
  ],
  menuLabel: 'Menu',
}

export const hero = {
  /** Heading, read as one line: "Welcome to the Gelephu Mindfulness City". */
  welcome: 'Welcome to the',
  title: 'Gelephu',
  subtitle: 'Mindfulness City',
  /** Under the title. Links are placeholders until the invest page and the full film exist. */
  actions: {
    primary: { label: 'Invest in GMC', href: '#invest' },
    secondary: { label: 'Take a tour', href: '#watch' },
  },
  scrollCue: 'Scroll to explore',
  unmute: 'Unmute',
  mute: 'Mute',
  /**
   * Hero media. Put the file in /public and set it here, e.g. { type: 'video', src: '/video/hero.mp4', poster: '/images/hero.jpg' }.
   * null shows a neutral placeholder gradient.
   */
  media: { type: 'video', src: '/video/hero.mp4', poster: '/images/hero-video-poster.jpg' } as null | { type: 'video' | 'image'; src: string; poster?: string },
}

/* ── Below the hero (layout rebuilt from the second reference recording) ───────────────── */
/* PLACEHOLDER copy and images throughout; swap freely. */

export const welcome = {
  /** "WELCOME <script>to</script> GELEPHU" */
  lead: { before: 'Welcome', script: 'to', after: 'Gelephu' },
  /** Stacked big title, one entry per line. */
  title: ['Where nature', 'and culture', 'shape a', 'mindful', 'city'],
  /** Floating photo cards around the title (position/size live in the CSS, in this order). */
  cards: [
    '/images/gmc/rice-fields.jpg',
    '/images/gmc/market.jpg',
    '/images/gmc/stupa.jpg',
    '/images/gmc/river-bridge.jpg',
    '/images/gmc/campus-park.jpg',
    '/images/gmc/dam-valley.jpg',
  ],
}

export const about = {
  script: 'About',
  heading: ['A land of forest,', 'rivers and', 'mindful living'],
  body: [
    'Gelephu Mindfulness City sits in the southern plains of Bhutan, between Royal Manas National Park and Phibsoo Wildlife Sanctuary.',
    'Placeholder: a second paragraph about the journey through the city, the places along the way, and what visitors and investors will find there.',
  ],
  /**
   * The eight priority sectors (gmc.bt, checked 23 Nov 2026), in order around the GMC outline.
   * The line stops at each one while the section is pinned.
   */
  stops: [
    'Spiritual',
    'Health and Wellness',
    'Education and Knowledge',
    'Agri-Tech and Forestry',
    'Green Energy and Technologies',
    'Finance and Digital Assets',
    'Aviation and Logistics',
    'Tourism',
  ],
  /** Small script word on the floating tag, before the stop number. */
  stopLabel: 'Sector',
  /** Under the list: the area counts up as the line goes round, landing on the full figure. */
  area: { label: 'Spanning over', value: 4046, unit: 'km²', source: 'gmc.bt', asOf: '23 Nov 2026' },
}

/**
 * The Vision (brief, chapter 02: "It began with a royal vision."). His Majesty's National Day address.
 * The passage is the exact wording supplied by the client (24 Nov 2026): never edit or paraphrase it. The photo of His Majesty is shown whole and still; its credit is to come.
 */
export const vision = {
  script: 'It began with',
  kicker: "His Majesty's vision",
  title: ['A royal', 'vision'],
  image: {
    src: '/images/vision-his-majesty.webp',
    width: 1234,
    height: 1742,
    alt: 'His Majesty The King of Bhutan speaking at a podium',
    credit: 'Photo credit to come',
  },
  quote:
    "This project is not just an infrastructure development—it is a People's Project – a nation-building effort, a lifeline for Bhutan, for our economy, security, sovereignty, and ultimately, our future",
  /** Set in the script font under the quote. */
  attribution: "His Majesty's National Day Address 17th December 2023",
  /** Placeholder link until the story page exists. */
  cta: { label: 'Read the story', href: '#story' },
}

/**
 * Invest (for investors), after the Vision. Rebuilt from the fourth reference recording.
 * Part 1, the numbers: pinned; each step wipes up a new full-screen picture and a new card.
 * Every number needs a source and an "as of" date. Only the area is verified (gmc.bt); the other three
 * come from the demo screenshot and are marked illustrative until GMC confirms them.
 * Pictures: client renders in /images/gmc (24 Nov 2026). Full-screen backgrounds use only the 2000px-wide ones.
 */
export const invest = {
  stats: [
    {
      value: '4,046',
      unit: 'km²',
      label: 'Special Administrative Region',
      source: 'gmc.bt',
      asOf: '23 Nov 2026',
      background: '/images/gmc/masterplan-aerial.jpg',
      photo: '/images/gmc/district-aerial.jpg',
    },
    {
      value: '35',
      label: 'Rivers crossing the site',
      source: 'Illustrative demo data',
      asOf: 'TBC',
      background: '/images/gmc/airport-night.jpg',
      photo: '/images/gmc/dam-valley.jpg',
    },
    {
      value: '18',
      label: 'Projects under construction',
      source: 'Illustrative demo data',
      asOf: 'TBC',
      background: '/images/gmc/campus-stream.jpg',
      photo: '/images/gmc/river-bridge.jpg',
    },
    {
      value: '64,000',
      label: 'Trees in the nursery',
      source: 'Illustrative demo data',
      asOf: 'TBC',
      background: '/images/gmc/stupa.jpg',
      photo: '/images/gmc/timber-landmark.jpg',
    },
  ],
  /**
   * Part 2: the sectors, rebuilt from the fifth reference recording: centred heading block, then a row of
   * four cards (image + title) that pages sideways while pinned. Names as in the client's screenshot;
   * body line from the same screenshot. Images: client renders in /images/gmc (24 Nov 2026).
   */
  sectors: {
    script: 'Opportunities',
    kicker: 'For investors',
    title: ['The eight', 'priority sectors'],
    body: 'Open calls, partnerships and tenders, with deadlines.',
    prev: 'Prev',
    next: 'Next',
    /** Under the card row. Placeholder link until the investor enquiry page exists. */
    cta: { label: 'Inquire more', href: '#inquiry' },
    items: [
      { name: 'Agritech & food', image: '/images/gmc/rice-fields.jpg' },
      { name: 'Wellness & healthcare', image: '/images/gmc/meditation-courtyard.jpg' },
      { name: 'Education & research', image: '/images/gmc/school-atrium.jpg' },
      { name: 'Financial services', image: '/images/gmc/campus-park.jpg' },
      { name: 'Tourism & hospitality', image: '/images/gmc/hotel-street.jpg' },
      { name: 'Logistics & aviation', image: '/images/gmc/airport-interior.jpg' },
      { name: 'Green energy', image: '/images/gmc/dam-pattern.jpg' },
      { name: 'Technology', image: '/images/gmc/bridge-hall-interior.jpg' },
    ],
  },
}

/**
 * Stories: how each of the eight sectors could look, rebuilt from the sixth reference recording.
 * Titles are the eight priority sectors (gmc.bt, as in the About map). Heading and body copy are
 * PLACEHOLDER. Images: client renders in /images/gmc, the larger ones (the card fills the screen).
 * Story links are placeholders until the story pages exist.
 */
export const stories = {
  script: 'Sector',
  kicker: 'Stories',
  title: ['How the city', 'takes shape'],
  body: 'Placeholder: eight priority sectors, eight parts of one city. Step along the path to see how each one could look.',
  read: 'Read the story',
  prev: 'Prev. story',
  next: 'Next story',
  items: [
    { name: 'Spiritual', image: '/images/gmc/stupa.jpg', href: '#story-spiritual' },
    { name: 'Health and Wellness', image: '/images/gmc/meditation-courtyard.jpg', href: '#story-wellness' },
    { name: 'Education and Knowledge', image: '/images/gmc/campus-stream.jpg', href: '#story-education' },
    { name: 'Agri-Tech and Forestry', image: '/images/gmc/rice-fields.jpg', href: '#story-agritech' },
    { name: 'Green Energy and Technologies', image: '/images/gmc/bridge-hall-interior.jpg', href: '#story-energy' },
    { name: 'Finance and Digital Assets', image: '/images/gmc/campus-park.jpg', href: '#story-finance' },
    { name: 'Aviation and Logistics', image: '/images/gmc/airport-night.jpg', href: '#story-aviation' },
    { name: 'Tourism', image: '/images/gmc/hotel-street.jpg', href: '#story-tourism' },
  ],
}

export const explore = { label: 'Explore in 3D', href: '#map', image: '/images/hero-campus.jpg' }
