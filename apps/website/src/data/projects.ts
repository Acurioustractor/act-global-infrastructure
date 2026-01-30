export type ProjectTheme = "earth" | "justice" | "goods" | "valley" | "harvest";

export type ProjectStat = {
  value: string;
  label: string;
};

export type Project = {
  slug: string;
  title: string;
  theme: ProjectTheme;
  tagline: string;
  description: string;
  focus: string[];
  heroImage?: string;
  // Media from year-in-review
  photos?: string[];
  videoUrl?: string;
  // LCAA method content
  listen?: string;
  curiosity?: string;
  action?: string;
  art?: string;
  // Rich content from year-in-review
  stats?: ProjectStat[];
  quote?: {
    text: string;
    author: string;
    role: string;
  };
};

export const projects: Project[] = [
  {
    slug: "global-laundry-alliance",
    title: "Global Laundry Alliance",
    theme: "justice",
    tagline: "Reframing access to laundry as a dignity issue",
    description:
      "Global Laundry Alliance (GLA) is a collaboration reframing access to laundry as a dignity issue and a basic right, not a \"nice-to-have\" service. It connects communities and organisations working across homelessness, refugee displacement, and global poverty to co-design practical laundry solutions with lived-experience leadership, and to shift the story from charity to systems change.\n\nThe project positions laundry spaces as community hubs, using storytelling and shared learning to spread what works across contexts, and build momentum toward policy and funding frameworks that treat clean clothes as foundational to belonging, opportunity, and self-worth.",
    focus: ["Community dignity", "Systems change", "Global collaboration"],
    heroImage:
      "https://tednluwflfhxyucgwigh.supabase.co/storage/v1/object/public/photos/community/f598b4ef-ce37-4eb3-9160-d415e743a577.jpeg",
  },
  {
    slug: "diagrama-spain",
    title: "Diagrama Spain/England Journey",
    theme: "justice",
    tagline: "Learning from Spain's youth justice transformation",
    description:
      "Standing in Diagrama's La Zarza centre, I witnessed something revolutionary in its simplicity: staff and young people engaged in genuine conversation, sharing laughter, navigating conflict with respect.\n\nNo power plays. No dehumanisation. Just authentic connection.\n\nIn Australia, we've built walls higher and sentences longer, yet recidivism climbs. Meanwhile, Spain transformed its approach decades ago, achieving what we dream of.",
    focus: ["Youth justice", "International learning", "Therapeutic practice"],
    heroImage:
      "https://tednluwflfhxyucgwigh.supabase.co/storage/v1/object/public/photos/community/3909ee10-4611-4413-bc50-a35378d044c8.jpeg",
  },
  {
    slug: "green-harvest-witta",
    title: "Green Harvest Witta",
    theme: "earth",
    tagline: "Sowing seeds of community-led innovation",
    description:
      "Green Harvest Witta has a \"next chapter\" vision. Transforming its legacy of sustainability and community knowledge-sharing into a living, community-led innovation hub.⁠ More soon...\n⁠​",
    focus: ["Sustainability", "Community knowledge", "Innovation hub"],
    heroImage:
      "https://tednluwflfhxyucgwigh.supabase.co/storage/v1/object/public/photos/community/37eb9379-c39d-4eee-b5ad-d279f920c578.jpeg",
  },
  {
    slug: "gold-phone",
    title: "Gold.Phone",
    theme: "earth",
    tagline: "Repurposing the past for community connection",
    description:
      "The Gold.Phone, developed by A Curious Tractor, is an experimental communication tool designed to explore how items from our past can be repurposed to create new levels of community engagement and understanding. This remodelled pay phone merges nostalgic elements with modern digital technology to provide a unique platform for sharing stories, thoughts, and messages.",
    focus: ["Community engagement", "Storytelling", "Creative technology"],
    heroImage:
      "https://tednluwflfhxyucgwigh.supabase.co/storage/v1/object/public/photos/community/9c6a44ab-a19d-4868-8d82-18fa79edab6c.png",
  },
  {
    slug: "empathy-ledger",
    title: "Empathy Ledger",
    theme: "earth",
    tagline: "Every Story Matters",
    description:
      "A consent-first storytelling platform built on Indigenous data sovereignty principles and OCAP protocols. Preserving voices, wisdom, and cultural heritage with respect and agency.",
    focus: ["Cultural Storytelling", "Data Sovereignty", "OCAP Protocols"],
    listen:
      "We listened to Elders and community members who expressed the need for a platform that honors their stories while respecting cultural protocols. Every conversation began with understanding consent, ownership, and the sacred nature of sharing wisdom.",
    curiosity:
      "How can technology serve cultural preservation without extracting value? What does data sovereignty look like in practice? We explored Indigenous-led frameworks like OCAP (Ownership, Control, Access, Possession) and learned from First Nations technologists about building platforms that center community control.",
    action:
      "In 2025, we captured 251 interviews with 231 storytellers including 7 respected Elders—preserving 588,143 words of wisdom across 65 hours of conversation. We built flexible consent controls, cultural review workflows, and partnership frameworks with 15 organizations.",
    art:
      "Every story becomes part of a living digital archive. We translate complex data sovereignty concepts into accessible interfaces, use visual storytelling to honor each person's journey, and create spaces where communities can see themselves reflected with dignity.",
    stats: [
      { value: "231", label: "Storytellers" },
      { value: "251", label: "Interviews Recorded" },
      { value: "65hrs", label: "Of Wisdom" },
      { value: "15", label: "Partner Organizations" },
    ],
    quote: {
      text: "Every story matters. When we preserve our voices, we preserve our culture for generations yet to come.",
      author: "Community Elder",
      role: "Palm Island Storyteller",
    },
  },
  {
    slug: "fishers-oysters",
    title: "Fishers Oysters",
    theme: "earth",
    tagline: "Indigenous-led aquaculture on Quandamooka Country",
    description:
      "Fishers Oysters is an Indigenous-led aquaculture project to reclaim and restore Moreton Bay's oyster reefs, blending cultural knowledge with regenerative practice to rebuild ecosystems and create long-term economic sovereignty for Quandamooka communities.",
    focus: ["Indigenous-led", "Regenerative practice", "Economic sovereignty"],
    heroImage:
      "https://tednluwflfhxyucgwigh.supabase.co/storage/v1/object/public/photos/community/1cb29099-2df6-4089-ace0-3d65ea7c4ada.jpeg",
    videoUrl: "https://share.descript.com/view/VBn8Z3U9pV4",
  },
  {
    slug: "justicehub",
    title: "JusticeHub",
    theme: "justice",
    tagline: "TRUTH • ACTION • JUSTICE",
    description:
      "Australia locks up children. Communities have the cure. We connect them. JusticeHub documents grassroots programs achieving 78% success rates—compared to 15.5% for detention—and builds infrastructure to redirect resources where they actually work.",
    focus: ["Youth Justice", "First Nations", "Community Programs"],
    listen:
      "Indigenous youth are locked up 24x more frequently than non-Indigenous youth, costing $1.1M per child per year. We listened to families, community workers, and young people who told us: detention doesn't work, but community programs do. The evidence was already there—we just needed to make it visible.",
    curiosity:
      "What if we could map every successful community program in Australia? What if families could find help with one search instead of dozens of phone calls? We asked: how do we shift funding from systems that harm to programs that heal?",
    action:
      "We documented 150+ grassroots programs, connected 2,400 youth to services, and demonstrated $45M in cost savings by redirecting just a fraction of youth from detention to community support. We built search tools, transparency dashboards, and storytelling platforms that make community solutions impossible to ignore.",
    art:
      "JusticeHub translates data into human stories. Bold typography, stark contrasts, and confronting statistics become tools for advocacy. We create installations like CONTAINED—experiential spaces that immerse visitors in the reality of youth detention and the power of community alternatives.",
    stats: [
      { value: "150+", label: "Programs Documented" },
      { value: "2,400", label: "Youth Connected" },
      { value: "$45M", label: "Cost Savings" },
      { value: "78%", label: "Community Success Rate" },
    ],
    quote: {
      text: "Communities have always had the solutions. JusticeHub makes them visible, connected, and impossible to ignore.",
      author: "JusticeHub Platform",
      role: "Mission Statement",
    },
    heroImage:
      "https://tednluwflfhxyucgwigh.supabase.co/storage/v1/object/public/photos/community/c202f7b9-23eb-4477-8214-df40108476fa.png",
  },
  {
    slug: "goods-on-country",
    title: "Goods on Country",
    theme: "goods",
    tagline: "Quality furniture for every home on Country",
    description:
      "Every Australian deserves access to quality household essentials, regardless of where they live. We partner with Aboriginal Elders and Traditional Owners to deliver durable beds, washing machines, and furniture to remote communities.",
    focus: ["Remote Communities", "Essential Goods", "Community Partnership"],
    listen:
      "We listened to Traditional Owners in remote NT, WA, and Queensland communities who described the challenge of accessing basic household goods. Expensive freight, unsuitable products, and lack of repair infrastructure meant families went without essentials or paid 3-4x urban prices.",
    curiosity:
      "What if we designed furniture specifically for remote conditions? What if beds could withstand extreme heat, washing machines could handle bore water, and everything was built to last 20 years instead of 2? We researched materials, tested prototypes, and learned from community feedback.",
    action:
      "In 2025, we deployed 389 assets including 363 beds across 8 communities. We built partnerships with Aboriginal-led organizations, established repair networks, and created feedback loops so every deployment improves the next. Products are designed with community input and built to remote specifications.",
    art:
      "Goods on Country is functional beauty. Clean lines, honest materials, and designs that honor the landscapes they serve. We document the journey of each piece—from co-design workshops to delivery—creating a visual story of place-based innovation.",
    stats: [
      { value: "389", label: "Assets Deployed" },
      { value: "363", label: "Beds Delivered" },
      { value: "8", label: "Communities Served" },
      { value: "500+", label: "Minutes of Feedback" },
    ],
    quote: {
      text: "It took just five minutes to put together, and it's properly comfortable... fellas who'd want something like this.",
      author: "Mark",
      role: "Community Member",
    },
  },
  {
    slug: "bg-fit-mount-isa",
    title: "BG Fit Mount Isa",
    theme: "justice",
    tagline: "Community connection through fitness and culture",
    description:
      "Yesterday in Mount Isa, I witnessed the fundamental misalignment at the heart of our community support systems: Those with the deepest community connections often face the greatest barriers to institutional support.\n\nAt the local bowling alley, Brodie Germaine a local leader with lived experience of the streets he now serves—was immediately surrounded by young people and parents. Within minutes, ten youth had signed up for tomorrow's fishing trip through nothing more than authentic conversation and established trust. By afternoon, his gym pulsed with energy as young people engaged in purposeful activity.\n\n\"People like Brodie are very important,\" explains Gracie, a police liaison officer. \"People that come from a background like these kids, going through the same trauma, same experiences...it gives us a better connection and understanding of the young people.\"",
    focus: ["Youth engagement", "Lived experience leadership", "Community trust"],
    heroImage:
      "https://tednluwflfhxyucgwigh.supabase.co/storage/v1/object/public/photos/community/f1ae054f-1a2e-42bc-89ea-a3f0a0fb2d02.jpeg",
    videoUrl: "https://share.descript.com/view/PyynfkFGD2o",
  },
  {
    slug: "quandamooka-justice-strategy",
    title: "Quandamooka Justice and Healing Strategy",
    theme: "justice",
    tagline: "Elder-led justice reinvestment on Country",
    description:
      "It was a great honour to be there on The Minjerribah Moorgumpin Elders-In-Council Corporation (MMEIC) officially launched their work towards developing the Quandamooka Justice and Healing Strategy and unveiled our new Justice and Healing hub. Guided by the MMEIC Elders, the justice reinvestment team have been tasked with developing the Quandamooka Justice and Healing Strategy for the region. \n\nAs part of our launch, we they rolled out the community engagement strategy, which means they are now ready to hear from Quandamooka people about what justice and healing means to you and how it can be enacted long-term within the community.",
    focus: ["Justice reinvestment", "Elder leadership", "Community healing"],
    videoUrl: "https://share.descript.com/view/WLVraYUDiyH",
  },
  {
    slug: "smart-recovery-gp-kits",
    title: "SMART Recovery GP Kits",
    theme: "justice",
    tagline: "Lowering barriers to addiction support",
    description:
      "The GP Kits are a set of physical \"activation tools\" designed to make SMART Recovery easy to refer to from primary care. They use simple, memorable artefacts (notepads, sandtimers, and coasters) to lower the friction for GPs to start a conversation and make a quick referral, helping shrink the typical 12–18 month (or longer) delay before people seek support.\n\nThe GPCE Sydney 2024 conference proved the approach works as an engagement and lead-generation channel. Most GPs had low baseline awareness of SMART, but the framing \"Do you have a patient with addiction?\" landed strongly, and the stall activations (passport comp, drawcards) drove high foot traffic and meaningful conversations. The result was 1,043 kit requests (plus bulk orders and additional partner EOIs, including NZ), making the main \"next need\" a solid follow-up and fulfilment system to convert interest into ongoing referral pathways.",
    focus: ["Primary care", "Addiction support", "Early intervention"],
    heroImage:
      "https://tednluwflfhxyucgwigh.supabase.co/storage/v1/object/public/photos/community/dca16943-3672-4547-8d90-a1547ab4fb21.png",
  },
  {
    slug: "goods-tennant-creek",
    title: "Goods Tennant Creek Journey",
    theme: "goods",
    tagline: "Co-creating with Traditional Owners",
    description:
      "\"Every time I go away from here, it's like it's calling me. Come back home,\" Dianne shared, her words carrying the weight of 23 years living on her traditional lands, beginning with nothing but her car for shelter.\n\nWhat emerged between A Curious Tractor and this remarkable Traditional Owner wasn't merely a transaction of ideas, but a tapestry of mutual transformation. As Nicholas Marchesi OAM (Him/He) worked alongside Dianne—crafting beds, learning language for the buttons on an \"indestructible washing machine\"—we witnessed the dissolution of artificial boundaries between \"helper\" and \"helped,\" revealing instead co-creators of a shared reality.",
    focus: ["Traditional Ownership", "Co-design", "Mutual transformation"],
    heroImage:
      "https://tednluwflfhxyucgwigh.supabase.co/storage/v1/object/public/photos/community/49a62fee-d7a8-4f54-8f41-b89f48e9536b.jpeg",
    videoUrl: "https://share.descript.com/view/MV7T2wE7rn7",
  },
  {
    slug: "oonchiumpa",
    title: "Oonchiumpa",
    theme: "justice",
    tagline: "Aboriginal-led pathways for young people in crisis",
    description:
      "Oonchiumpa is an Aboriginal-led initiative in Central Australia focused on creating culturally grounded pathways for young people in crisis, with Elders and local cultural authority guiding what \"support\" looks like on Country and in town.",
    focus: ["Aboriginal-led", "Youth crisis support", "Cultural authority"],
    heroImage:
      "https://tednluwflfhxyucgwigh.supabase.co/storage/v1/object/public/photos/community/c6adc97f-cc96-45b0-a37a-ea081213a67e.jpeg",
  },
  {
    slug: "bupa-tfn-pitch",
    title: "Bupa TFN Healthy People, Healthy Planet",
    theme: "goods",
    tagline: "Championing human and planetary health",
    description:
      "Three amazing changemakers selected to pitch at our special Healthy People, Healthy Planet event with Bupa Foundation in Melbourne - streamed nationally - on Tuesday 2 September 2025! Join us as we raise vital funds for program that champion human and planetary health! 🌏\n\n🌿 Nicholas Marchesi OAM (Him/He), A Curious Tractor – Partnering with remote and First Nations communities to co-design essential goods like beds and washing machines that improve health, dignity and daily life. \n⚡Georgia Cooke, CORENA - Citizens Own Renewable Energy Network Australia Inc – Helping community organisations cut emissions and energy costs through a revolving fund that delivers clean energy upgrades and lasting climate impact. \n🌾 James McLennan, Farm My School – Turning unused school grounds into regenerative farms that tackle food insecurity and build stronger, healthier communities.",
    focus: ["Social enterprise", "Community health", "Climate action"],
    heroImage:
      "https://tednluwflfhxyucgwigh.supabase.co/storage/v1/object/public/photos/community/edf0d290-5cea-43b3-9061-d1f8ee9da7e4.gif",
  },
  {
    slug: "pakkinjalki-kari",
    title: "Pakkinjalki kari (Washing Machine)",
    theme: "goods",
    tagline: "Culturally appropriate design on Warumungu Country",
    description:
      "We built a culturally appropriate Washing Machine! \n\nHere is our first crack! \"Pakkinjalki kari\" (Washing Machine) designed on Warumungu country with the community.\n\nThrough hundreds of hours of conversation this is what the community asked for:\n\n- Something that is easy to use // We removed all the buttons and have one \"go\" button \n- Something that is appropriate for the environment // We hardened all the surfaces with recycled plastic that is easy to clean and durable\n- Something this is easy to repair // We built this off one of the most common washing machine's already in market so there are parts and contractors all around the country, however we are creating jobs and businesses by training the community to be able to repair this. \n- Remove the complexity and make the machine smart // We will find this out! \n\nWe have a long way to go as a country in getting desirable, functional and fit for purpose Goods for communities however hopefully this is a step forward.",
    focus: ["Co-design", "Repair culture", "Community manufacturing"],
    heroImage:
      "https://tednluwflfhxyucgwigh.supabase.co/storage/v1/object/public/photos/community/dc210fe8-9f73-44af-b4a3-155889affc81.jpeg",
  },
  {
    slug: "weave-bed-tennant-creek",
    title: "Weave Bed Design",
    theme: "goods",
    tagline: "Washable, repairable, community-built",
    description:
      "Imagine if you could weave a bed? \n\nDesigning, iterating and learning with community. Thankful for Jimmy Frank Jupurrurla and his community for embracing the opportunity to re imagine Goods for the community.\n\nThis is one of our prototype's in action - a washable, repairable, community built bed.",
    focus: ["Prototype design", "Community iteration", "Repairable goods"],
    heroImage:
      "https://tednluwflfhxyucgwigh.supabase.co/storage/v1/object/public/photos/community/e9f86c0c-abff-4246-9b50-624e362b0347.jpeg",
  },
  {
    slug: "naidoc-week-mount-isa",
    title: "NAIDOC Week Mount Isa",
    theme: "justice",
    tagline: "Kinship in action with BG Fit",
    description:
      "Watch Brodie Germaine move through his community with a microphone like he's conducting ceremony, not interviews. \n\nThis isn't journalism - it's kinship in action.\n\nUncle Warren King doesn't mince words about what he sees: \n\n\"This fellow here, I'm very proud of it because he is doing that (passing on culture) as a young man. With his own business and his involvement in community has been staunch strong and resilient as well.\" \n\nThat's 60,000 years of cultural authority recognising the real thing when it walks past.\n\nUncle George cuts straight to strategy: \n\n\"It starts with the little kids, you know. You'll see a lot of little kids that walk around the streets... Pull 'em up and have a chat.\" \n\nNo million-dollar framework. \n\nJust presence. \n\nJust care. \n\nJust the radical act of seeing kids before they disappear.",
    focus: ["Cultural celebration", "Youth connection", "Community leadership"],
    heroImage:
      "https://tednluwflfhxyucgwigh.supabase.co/storage/v1/object/public/photos/community/03c0e261-4946-43a4-863f-7444ac1374c8.jpeg",
    videoUrl: "https://share.descript.com/view/a4yhx0PaaCe",
  },
  {
    slug: "contained",
    title: "CONTAINED",
    theme: "justice",
    tagline: "Experiential youth justice installation",
    description:
      "CONTAINED is an experiential installation that immerses visitors in the reality of youth detention and the power of community alternatives. Through physical design, storytelling, and data visualization, we make visible the human cost of incarceration and the evidence for community-led solutions.",
    focus: ["Youth justice", "Experiential design", "Community advocacy"],
  },
  {
    slug: "the-harvest",
    title: "The Harvest",
    theme: "harvest",
    tagline: "Community hub for connection and healing",
    description:
      "The Harvest is a living space where people come together to grow food, share stories, and build meaningful connections. Through seasonal harvests, community meals, and therapeutic programs, we create pathways for belonging and wellbeing rooted in the land.",
    focus: ["Community meals", "Therapeutic programs", "Seasonal harvests"],
  },
  {
    slug: "tomnet",
    title: "TOMNET",
    theme: "justice",
    tagline: "Moving men from isolation to belonging",
    description:
      "TOMNET is a community-led network in Toowoomba supporting men over 50 to move from isolation into belonging, purpose, and contribution. The project captures that transformation through authentic, peer-led storytelling, showing how connection, volunteering, and intergenerational mentoring can strengthen mental wellbeing and reduce suicide risk in regional communities.",
    focus: ["Mental wellbeing", "Peer-led support", "Regional community"],
  },
  {
    slug: "westpac-summit-2025",
    title: "Westpac Summit 2025",
    theme: "earth",
    tagline: "Scholar Cards activation",
    description:
      "Westpac Summit '25 — Closing Plenary \"Scholar Cards\" Activation",
    focus: ["Community engagement", "Storytelling activation", "Leadership"],
  },
  {
    slug: "uncle-allan-palm-island-art",
    title: "Uncle Allan Palm Island Art",
    theme: "earth",
    tagline: "Cultural sovereignty through digital storytelling",
    description:
      "This website (burrgumanbarraart.com) showcases Uncle Allan's work, helps attract commissions and collaborators, and strengthens cultural sovereignty by sharing stories on Uncle Allan's terms.",
    focus: ["Cultural sovereignty", "Indigenous art", "Digital platform"],
  },
  {
    slug: "the-confessional",
    title: "The Confessional",
    theme: "earth",
    tagline: "Space for honest conversation",
    description:
      "The Confessional creates safe space for people to share what they're carrying. Through design, ritual, and careful facilitation, we hold space for vulnerability and truth-telling.",
    focus: ["Safe space", "Vulnerability", "Community healing"],
  },
  {
    slug: "smart-hcp-gp-uplift",
    title: "SMART HCP GP Uplift",
    theme: "justice",
    tagline: "Healthcare provider integration for addiction support",
    description:
      "SMART Recovery — GP Uplift (HCP Integration) connects healthcare providers with SMART Recovery tools and pathways, making it easier for GPs to refer patients to evidence-based addiction support.",
    focus: ["Healthcare integration", "GP referrals", "Addiction support"],
  },
  {
    slug: "smart-connect",
    title: "SMART Connect",
    theme: "justice",
    tagline: "Connecting people to peer support",
    description:
      "SMART Connect builds digital and physical pathways that help people find SMART Recovery meetings, resources, and community when they need it most.",
    focus: ["Peer support", "Digital pathways", "Community connection"],
  },
  {
    slug: "regional-arts-fellowship",
    title: "Regional Arts Fellowship",
    theme: "earth",
    tagline: "Art, technology, and agriculture converge",
    description:
      "A Curious Tractor x Australian Network for Art & Technology x Agriculture Industry. This fellowship explores the intersection of creative practice, emerging technology, and regenerative agriculture in regional Australia.",
    focus: ["Art & technology", "Agriculture", "Regional innovation"],
  },
  {
    slug: "picc-centre-precinct",
    title: "PICC Centre Precinct",
    theme: "earth",
    tagline: "Reimagining community space on Palm Island",
    description:
      "ACT supported the PICC Centre Precinct project by helping turn an under-used, run-down site into a shared picture of what it could become.",
    focus: ["Community space", "Co-design", "Palm Island"],
  },
  {
    slug: "picc-photo-kiosk",
    title: "PICC Photo Kiosk",
    theme: "earth",
    tagline: "Community-controlled photo studio",
    description:
      "Building a community-controlled \"photo studio\" on Palm Island that puts the power of image-making in the hands of community members.",
    focus: ["Community control", "Digital tools", "Cultural storytelling"],
  },
  {
    slug: "picc-elders-hull-river",
    title: "PICC Elders Hull River Trip",
    theme: "earth",
    tagline: "Elders return to Country",
    description:
      "PICC Elders' trip to Hull River in October brought Elders back to traditional lands for cultural practice, storytelling, and connection with place.",
    focus: ["Cultural practice", "Connection to Country", "Elder leadership"],
  },
  {
    slug: "picc-annual-report",
    title: "PICC Annual Report",
    theme: "earth",
    tagline: "Community-led storytelling and accountability",
    description:
      "This PICC Annual Report project is the home base for producing a community-led annual report for PICC that strengthens Indigenous storytelling and keeps power and narrative control with community.",
    focus: ["Indigenous storytelling", "Community control", "Accountability"],
  },
  {
    slug: "caring-for-those-who-care",
    title: "Caring for Those Who Care",
    theme: "justice",
    tagline: "Amplifying voices of NFP leaders",
    description:
      "Amplifying Voices of NFP Leaders Across Australia. This project captures the wisdom, challenges, and insights of people leading community organizations on the frontlines of social change.",
    focus: ["NFP leadership", "Storytelling", "Community sector"],
  },
  {
    slug: "mounty-yarns",
    title: "Mounty Yarns",
    theme: "justice",
    tagline: "Youth-led leadership in Mount Druitt",
    description:
      "Mounty Yarns is a youth-led base in Mount Druitt that turns lived experience into leadership, creating space for young people to gather, yarn, and influence the systems that shape their lives.",
    focus: ["Youth leadership", "Lived experience", "Systems change"],
  },
  {
    slug: "junes-patch",
    title: "June's Patch",
    theme: "earth",
    tagline: "Nature-based therapy and healing",
    description:
      "June's Patch is a therapeutic garden space where people can access nature-based healing, horticultural therapy, and connection to land as part of their wellbeing journey.",
    focus: ["Therapeutic gardening", "Nature connection", "Mental health"],
  },
  {
    slug: "designing-for-obsolescence",
    title: "Designing for Obsolescence",
    theme: "goods",
    tagline: "Rethinking product lifecycles",
    description:
      "Overview — Designing for Obsolescence explores what it means to design products that are built to last, built to be repaired, and built with their end of life in mind.",
    focus: ["Circular design", "Repair culture", "Product lifecycle"],
  },
  {
    slug: "dad-lab-25",
    title: "Dad.Lab.25",
    theme: "justice",
    tagline: "Exploring fatherhood in Australia",
    description:
      "Exploring Dad.Lab.25 in Australia. This project creates space for fathers to gather, share experiences, and explore what it means to show up for their kids and communities.",
    focus: ["Fatherhood", "Community support", "Gender equity"],
  },
];
