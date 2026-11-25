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
  sound: 'Video sound',
  unmute: 'Turn the video sound on',
  mute: 'Turn the video sound off',
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

/** The GMC mark, read as a map: a river through the middle, the four woven quadrants playing video. */
export const weave = {
  script: 'The mark',
  heading: ['The weave opens', 'onto the city'],
  body: [
    'A river runs through the middle of it in a single S-curve, and the four woven quadrants are the ground that river divides, two above and two below. Around them, pinwheel corners in indigo and slate turn the square the way a mandala turns. One tile, in saffron, is left bright.',
  ],
  /** Placeholder until the four quadrant clips arrive: each quadrant shows a different part of this one video. */
  video: { src: '/video/hero.mp4', poster: '/images/hero-video-poster.jpg' },
  quadrants: ['The plain', 'The water', 'The site', 'The craft'],
  pause: 'Pause the videos',
  play: 'Play the videos',
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
  read: "Let's Explore",
  /* "Prev sector" / "Next sector" on wide screens; the noun is dropped on phones. */
  prev: 'Prev',
  next: 'Next',
  navNoun: 'sector',
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

/**
 * Chapter 06 · The People: the GMCA Board of Directors, from the user's screenshot of the board listing.
 * Portraits to come from the user (`portrait: null` leaves an empty slot until then).
 */
export const people = {
  script: 'Leadership',
  title: ['Woven by', 'many hands'],
  chair: 'GMCA Board of Directors · Chaired by His Majesty The King',
  body: 'Global and Bhutanese stewardship across aviation, infrastructure, law, education and green finance.',
  /** The board is shown in groups (left: the group's name; right: its portraits). */
  groups: [
    { id: 'executive', title: ['Co-Chief', 'Executives'] },
    { id: 'board', title: ['Board of', 'Directors'] },
  ],
  members: [
    {
      name: 'Seow Hiang Lee',
      portrait: '/images/board/seow-hiang-lee.webp',
      group: 'executive',
      role: 'Co-Chief Executive Officer & Board Member',
      bio: 'Founding CEO of Changi Airport Group (2009–2024); led Jewel Changi and Terminal 4.',
    },
    {
      name: 'Yee Ean Pang',
      portrait: '/images/board/yee-ean-pang.webp',
      group: 'executive',
      role: 'Co-Chief Executive Officer & Board Member',
      bio: 'Former Director General of Investments at AIIB and CEO of Surbana Jurong Capital.',
    },
    {
      name: 'Siddharth Shah',
      portrait: '/images/board/siddharth-shah.webp',
      group: 'board',
      role: 'Board Director',
      bio: 'Partner at Khaitan & Co; 25 years in corporate law, investment funds and regulatory advisory.',
    },
    {
      name: "Joichi 'Joi' Ito",
      portrait: '/images/board/joi-ito.webp',
      group: 'board',
      role: 'Board Member · CEO, Gelephu Investment and Development Corporation',
      bio: 'President of Chiba Institute of Technology; former Director of MIT Media Lab (2011–2019).',
    },
    {
      name: 'Dasho Arun Kapur',
      portrait: '/images/board/arun-kapur.webp',
      group: 'board',
      role: 'Board Member',
      bio: "Founder of Druk Gyalpo's Institute (DGI) and architect of the Bhutan Baccalaureate.",
    },
    {
      name: 'Lauren Chung',
      portrait: '/images/board/lauren-chung.webp',
      group: 'board',
      role: 'Board Member',
      bio: 'CEO of Teneo Asia-Pacific Strategy & Communications; Co-Chair, WEF Global Future Council on Trade.',
    },
    {
      name: 'Dechen Dorji',
      portrait: '/images/board/dechen-dorji.webp',
      group: 'board',
      role: 'Board Member',
      bio: 'Vice President for Asia, Wildlife Conservation at WWF-US; first Coordinator of De-suung.',
    },
    {
      name: 'Sonam Choden',
      portrait: '/images/board/sonam-choden.webp',
      group: 'board',
      role: 'Board Member',
      bio: "Program Officer at His Majesty's Secretariat; civil engineer and Certified Arbitrator.",
    },
    {
      name: 'Jigdrel Singay',
      portrait: '/images/board/jigdrel-singay.webp',
      group: 'board',
      role: 'Board Member',
      bio: 'Associate Director of GreenDigital (GDL / GIDC); led the 600 MW green HPC data centre FDI.',
    },
  ] as {
    name: string
    group: 'executive' | 'board'
    role: string
    bio: string
    portrait?: string
  }[],
}

/**
 * Partners: the house heading and a slow, endless row of partner logos, all in one colour, no tiles.
 * Logos from the user (24 Nov 2026), converted to brown on transparent and trimmed to the ink.
 * `scale` evens out how big each looks: same visual area whatever its shape (wide marks shorter, compact
 * marks taller), nudged for how heavy or light its strokes are.
 */
export const partners = {
  script: 'Together',
  title: ['Our partners'],
  logos: [
    { name: 'BIG', src: '/images/partners/big.png', scale: 0.94 },
    { name: 'Changi Airport Singapore', src: '/images/partners/changi.png', scale: 1.3 },
    { name: 'Arup', src: '/images/partners/arup.png', scale: 0.83 },
    { name: 'MQDC', src: '/images/partners/mqdc.png', scale: 0.91 },
    { name: 'SOM', src: '/images/partners/som.png', scale: 1.17 },
    { name: 'Teneo', src: '/images/partners/teneo.png', scale: 0.74 },
    { name: 'ERM', src: '/images/partners/erm.png', scale: 1.07 },
    { name: 'Bensley', src: '/images/partners/bensley.png', scale: 0.63 },
    { name: 'Cumberland, a DRW company', src: '/images/partners/cumberland.png', scale: 0.73 },
    { name: 'BIT', src: '/images/partners/bit.png', scale: 1.04 },
  ] as { name: string; src: string; scale: number }[],
}

/**
 * The people's project: the Zhabtog (national volunteer service) call, copy from the user's screenshot.
 * Photo from the user (GMCA Zhabtog programme). The 40,000 figure still needs a source + as-of date.
 */
export const zhabtog = {
  script: "The people's project",
  title: ['Zhabtog & Pelsung', 'volunteers'],
  place: '40,000 community builders, Gelephu',
  quote:
    "Forty thousand hands came to the Mau Chhu river banks together to raise 108 Jangchub Chortens in a single day, because this is the people's project.",
  actions: {
    primary: { label: 'Join Zhabtog & Volunteering', href: '#volunteer' },
    secondary: { label: 'Read Zhabtog dispatch', href: '#zhabtog-dispatch' },
  },
  image: {
    src: '/images/zhabtog-volunteers.webp',
    alt: 'Zhabtog volunteers in uniform walking along a road in Gelephu',
    credit: 'Photo: GMCA · Zhabtog volunteer programme',
  },
}

/**
 * Chapter 07 · Take part, "Your thread starts here": six ways in, as cards scattered over one still render.
 * Copy from the user's screenshot of the earlier build.
 */
export const thread = {
  script: 'Take part',
  title: ['Your thread', 'starts here'],
  image: '/images/gmc/campus-stream.jpg',
  doors: [
    { title: 'Invest', text: 'Find your sector, read the rules, and talk to the Economic Development Group.', href: '#invest' },
    { title: 'Live', text: 'Housing, schools and health care as the first quarters open.', href: '#live' },
    { title: 'Work', text: 'Roles at the Authority and across the companies building the city via GMC dot.OFFER.', href: '#work' },
    { title: 'Visit', text: 'Plan a trip: the Experience Centre, the 14 Royal Kasho sacred sites, the river trails.', href: '#visit' },
    { title: 'Participate', text: 'Open consultations, Zhabtog volunteering, and Project 108.', href: '#zhabtog' },
    {
      title: 'Immigration',
      text: '100% online E-Visas, Employment & Special Passes, Indian e-Permits, and vehicle border registration.',
      href: 'https://immigration.gmc.bt',
      site: 'immigration.gmc.bt',
    },
  ] as { title: string; text: string; href: string; site?: string }[],
}

/**
 * FAQ, after Take part. Questions and the first answer from the user's screenshots of gmc.bt (24 Nov 2026).
 * Answers 2, 3 and 5 are written from facts already on this page (verified on gmc.bt, 23 Nov 2026);
 * answer 4 is a placeholder until the gmc.bt text arrives.
 */
export const faq = {
  script: 'Good to know',
  title: ['Frequently', 'asked questions'],
  items: [
    {
      q: 'What is Gelephu Mindfulness City (GMC) and what is its founding vision?',
      a: 'Gelephu Mindfulness City (GMC) is His Majesty King Jigme Khesar Namgyel Wangchuck\u2019s global vision to establish an oasis of mindfulness and prosperity amidst increasing global uncertainties and geostrategic challenges. It seeks to offer the world a different path of development, through \u201cMindful Prosperity\u201d, where traditional Bhutanese values of spirituality and harmony with nature blend with innovation, technology and economic vibrancy. GMC also serves as His Majesty\u2019s domestic vision to act as a catalyst to lead Bhutan\u2019s administrative reforms and economic advancement under the concept of \u201cOne Country, Two Systems\u201d as part of a Special Administrative Region (SAR).',
    },
    {
      q: 'Where is GMC located, how was it established, and what is its governance structure?',
      a: 'GMC covers 4,046 km\u00b2, about 10% of Bhutan, on the southern plains bordering Assam, between Royal Manas National Park and Phibsoo Wildlife Sanctuary. Announced by His Majesty on National Day, 17 December 2023, it was established by Royal Charter in February 2024 as a highly autonomous Special Administrative Region with its own executive, legislative and independent judicial powers.',
    },
    {
      q: 'Who leads GMC and what are its management principles?',
      a: 'GMC is led by the Gelephu Mindfulness City Authority (GMCA), whose Board of Directors is chaired by His Majesty The King. Day to day, the Authority is run by its two Co-Chief Executive Officers, with a board that brings together global and Bhutanese experience in aviation, infrastructure, law, education and green finance.',
    },
    {
      q: "What is the 'Diamond Strategy' and how are GMC and Bhutan expected to evolve?",
      a: 'Placeholder: the answer from gmc.bt goes here.',
    },
    {
      q: 'What makes GMC different from Bhutan and other jurisdictions?',
      a: 'GMC is a Special Administrative Region under \u201cOne Country, Two Systems\u201d: part of Bhutan, but with its own executive, legislative and independent judicial powers. That lets it set its own rules for business and investment while carrying Bhutanese values of mindfulness, culture and care for nature.',
    },
  ],
}

/**
 * Footer. Links merge the current gmc.bt footer (Home, About us, Map, Pillars, Gallery, People, Article, FAQ,
 * Public Consultation, Privacy Policy, Contact; Facebook, X, Instagram) with the brief's structure: the
 * ways to take part, and GMCA's official pages one click away. Hrefs are anchors on this page where the
 * section exists, placeholders otherwise.
 */
export const footer = {
  image: '/images/gmc/rice-fields.jpg',
  /** Four groups, each answering one visitor question: what is it, how do I join, what's new, who runs it. */
  columns: [
    {
      title: 'The city',
      links: [
        { label: 'About GMC', href: '#about' },
        { label: "His Majesty's vision", href: '#vision' },
        { label: 'Priority sectors', href: '#invest' },
        { label: 'Masterplan & 3D map', href: '#map' },
        { label: 'Gallery', href: '#gallery' },
      ],
    },
    {
      title: 'Take part',
      links: [
        { label: 'Invest', href: '#invest' },
        { label: 'Work & careers', href: '#work' },
        { label: 'Live', href: '#live' },
        { label: 'Visit', href: '#visit' },
        { label: 'Zhabtog volunteering', href: '#zhabtog' },
        { label: 'Project 108', href: '#project-108' },
      ],
    },
    {
      title: 'Stay informed',
      links: [
        { label: 'News & articles', href: '#news' },
        { label: 'Public consultation', href: '#consultation' },
        { label: 'People', href: '#people' },
        { label: 'FAQ', href: '#faq' },
      ],
    },
    {
      title: 'The Authority',
      links: [
        { label: 'About GMCA', href: '#gmca' },
        { label: 'Leadership', href: '#people' },
        { label: 'Legislation', href: '#legislation' },
        { label: 'Notices', href: '#notices' },
        { label: 'Publications', href: '#publications' },
        { label: 'Contact', href: '#contact' },
      ],
    },
  ],
  connect: 'Connect',
  legal: [
    { label: 'Privacy policy', href: '#privacy' },
    { label: 'Terms of use', href: '#terms' },
    { label: 'Accessibility', href: '#accessibility' },
  ],
  cta: { label: 'Invest in GMC', href: '#invest' },
  wordmark: ['Gelephu', 'Mindfulness City'],
  place: 'Rooted in Gelephu, Bhutan',
  rights: '\u00a9 2026 Gelephu Mindfulness City Authority',
  languages: [
    { label: 'EN', lang: 'en', current: true },
    { label: '\u0f62\u0fab\u0f7c\u0f44\u0f0b\u0f41', lang: 'dz', current: false },
  ],
  social: [
    { name: 'Facebook', href: '#facebook' },
    { name: 'X', href: '#x' },
    { name: 'Instagram', href: '#instagram' },
  ] as { name: 'Facebook' | 'X' | 'Instagram'; href: string }[],
}

/** The full-screen 3D map (the GMC City 3D Section build, served from /3d-map), opened from "3D Map". */
export const map3d = {
  src: '/3d-map/index.html',
  title: 'Gelephu Mindfulness City in 3D',
  back: 'Back to GMC',
}

/** The floating stupa button, bottom-right: leads to the Project 108 page (link to come). */
export const project108 = { label: 'Project 108', href: '#project-108' }
