import { isoDay, fmtDate } from "../format";

export type DemoEmail = {
  id: string;
  from: string;
  fromEmail: string;
  subject: string;
  preview: string;
  receivedAgo: string;
  avatar: string; // tailwind gradient
  body: () => string;
};

// Dates are relative to today so the demo never goes stale.
const d = (n: number) => fmtDate(isoDay(n), "long");

export const DEMO_EMAILS: DemoEmail[] = [
  {
    id: "glowskin",
    from: "Priya Menon · GlowSkin",
    fromEmail: "priya@glowskin.in",
    subject: "Paid partnership: GlowSkin winter launch ✨",
    preview: "Loved your winter skincare series! We'd like 1 Reel + 3 Stories…",
    receivedAgo: "12m",
    avatar: "from-pink-300 to-amber-200",
    body: () => `Hi Aanya,

Loved your winter skincare series. Our community keeps sharing it!

We're launching the GlowSkin Barrier Repair range next month and would love you on board:
• 1 Instagram Reel (45–60s)
• 3 Instagram Stories with a link sticker

Budget is ₹1,50,000 for the package (₹1,00,000 for the Reel, ₹50,000 for the Stories). Content should go live by ${d(12)}, and we pay net 30 from posting.

We'd also like 90 days of usage rights to run the Reel as a paid ad on Meta.

Let me know if this works and I'll send the brief.

Warmly,
Priya Menon
Influencer Partnerships, GlowSkin
priya@glowskin.in`,
  },
  {
    id: "boat",
    from: "Rahul Verma · boAt",
    fromEmail: "rahul.verma@boat-lifestyle.com",
    subject: "Collab: Airdopes launch video",
    preview: "We'd like a dedicated YouTube integration for the new Airdopes…",
    receivedAgo: "2h",
    avatar: "from-slate-300 to-slate-500",
    body: () => `Hey Aanya,

Rahul from boAt here. We're launching the new Airdopes Pro and think your tech audience is a perfect fit.

Proposal:
- 1 dedicated YouTube integration (60–90s, mid-roll)
- 1 YouTube Short

Fee: ₹85,000 total. Payment within 15 days of the video going live. Target publish date: ${d(18)}.

Usage: organic only, no paid usage.

Cheers,
Rahul Verma
Brand Partnerships, boAt
rahul.verma@boat-lifestyle.com`,
  },
  {
    id: "notion",
    from: "Maya Chen · Notion",
    fromEmail: "maya.chen@makenotion.com",
    subject: "Notion x Aanya: study-with-me series",
    preview: "We'd love to sponsor two study-with-me videos. $1,800 for…",
    receivedAgo: "Yesterday",
    avatar: "from-neutral-200 to-neutral-400",
    body: () => `Hi Aanya,

I'm Maya from Notion's creator team. Your study-with-me videos are wonderful, and we'd love to sponsor two of them.

What we're thinking:
1. Two YouTube videos with a 60s Notion integration each
2. A pinned comment with our template link

We can offer $1,800 USD for both. Invoice on delivery, paid net 45. First video by ${d(21)}.

We'd like 6 months of usage rights for whitelisting on YouTube ads.

Best,
Maya Chen
Creator Partnerships, Notion
maya.chen@makenotion.com`,
  },
  {
    id: "decathlon",
    from: "Lena Fischer · Decathlon EU",
    fromEmail: "lena.fischer@decathlon.eu",
    subject: "Trail running reel: autumn campaign",
    preview: "Would you film one reel on a trail run with our Kiprun shoes?…",
    receivedAgo: "2d",
    avatar: "from-sky-300 to-blue-500",
    body: () => `Hello Aanya,

Decathlon EU here. For our autumn trail campaign, would you film one Instagram Reel on a trail run wearing the Kiprun Trail 2?

Fee: €950 for one Reel. We'll pay within 30 days of the invoice. Post by ${d(9)}.

Usage rights: 60 days on our own Instagram and TikTok accounts.

Thanks!
Lena Fischer
Influencer Marketing, Decathlon Europe
lena.fischer@decathlon.eu`,
  },
  {
    id: "swiggy",
    from: "Kabir Shah · Swiggy",
    fromEmail: "kabir@swiggy.in",
    subject: "Swiggy Instamart: festive story set",
    preview: "Quick one! 4 Stories for our Diwali Instamart push…",
    receivedAgo: "3d",
    avatar: "from-orange-300 to-orange-500",
    body: () => `Hi Aanya!

Quick one: we'd love 4 Instagram Stories for our festive Instamart push, showing a 10-minute grocery run.

₹40,000 for the set. Stories go live on ${d(6)}. Payment net 30.

No usage rights needed beyond the original posts.

Thanks,
Kabir Shah
Social Partnerships, Swiggy
kabir@swiggy.in`,
  },
];
