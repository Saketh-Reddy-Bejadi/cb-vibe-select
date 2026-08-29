---
name: codebasics-brand-guidelines
description: >
  Applies Codebasics brand identity (voice + visual system) to any digital artifact.
  Use this skill whenever outputs must follow Codebasics rules for branding. It ensures
  consistency across documents, slides, web pages and more by applying
  standardized colours, type sizes and fonts based on the provided theme.
license: Complete terms in LICENSE.txt
---

# Codebasics Brand Guidelines Skill

## Overview

This skill encodes Codebasics brand rules so artifacts look and read like Codebasics.
It covers:

- **Visual identity**: white-dominant light UI, official palette, border-based structure.
- **Typography**: Manrope (all weights) as the single allowed typeface.
- **Copy & tone**: Sage-first (no fluff, radical honesty), Jester as controlled spice.
- **Templates**: ad creative structure, thumbnail rules, trust signals, “AtliQ standard”.

Use this skill for **presentations, one-pagers, landing pages, social creatives, thumbnails, email templates, dashboards, diagrams**, and any artifact requiring Codebasics consistency.

**Keywords**: codebasics, branding, visual identity, light theme, Manrope, gimmick-free, AtliQ

---

## Brand Essence

### About
Codebasics is a **data and AI education company** focused on practical, project-based learning with real outcomes.

- **Purpose**: Learn through easy explanations and upskill for today’s job market.
- **Tagline**: **Enabling Careers**

### Positioning
For **driven aspirants** who want project-based learning, Codebasics is the **gimmick-free education platform** that makes learners job-ready because it’s built by **industry experts** who simplify complex topics.

### Values
- **Easy Explanations**: complex concepts, simple words
- **Gimmick-Free**: no manipulation, no fake urgency
- **Affordable**: premium education shouldn’t cost a fortune
- **Relatable**: speak the learner’s language

---

## Brand Voice

### Core Voice: Sage (80%)
- Senior engineer mentor energy: realistic, data-driven, direct.
- **Rules**:
  - No fluff.
  - Radical honesty: no “instant results”.
  - Anti-salesy: no desperation, no hype.
  - Empowering: assume audience is smart.

### Secondary Voice: Jester (20%)
- Insider humor + self-aware reality checks.
- **Rules**:
  - Joke about pain points (tool fatigue, tutorial hell, Excel crashing).
  - Mock bad habits and fake gurus; **never mock the learner**.
  - Humor must not reduce clarity or trust.

### Language Rules
- Prefer **Learner / Aspirant** over “user/student”.
- Prefer **Investment** over “cost/price”.
- Prefer **Program / Bootcamp** over “course” (for bootcamps).
- Never use: “Free”, “Discount”, “Sale” in marketing contexts.
- Never use fake urgency (“Only 3 seats left!”), strikethrough pricing, salary guarantees.

---

## Visual Identity

### Color System

#### Primary Colors (Core Brand Only)

| Color       | Hex       | Token       |
| ----------- | --------- | ----------- |
| Blue (Base) | `#3B82F6` | `cb.blue`   |
| Purple      | `#6F53C1` | `cb.purple` |
| Indigo      | `#3F4C78` | `cb.indigo` |
| Navy        | `#181830` | `cb.navy`   |
| White       | `#FFFFFF` | `cb.white`  |

#### Blue Shades

| Shade           | Hex       |
| --------------- | --------- |
| Blue 50         | `#EBF2FE` |
| Blue 100        | `#D8E6FD` |
| Blue 200        | `#B1CDFB` |
| Blue 300        | `#89B4FA` |
| Blue 400        | `#629BF8` |
| Blue 500 (Base) | `#3B82F6` |
| Blue 600        | `#2F68C5` |
| Blue 700        | `#234E94` |
| Blue 800        | `#183462` |
| Blue 900        | `#0C1A31` |

#### Greyscale

| Shade    | Hex       |
| -------- | --------- |
| Grey 100 | `#F7F9FA` |
| Grey 200 | `#E4E8EB` |
| Grey 300 | `#D1D7DC` |
| Grey 400 | `#9DA3A7` |
| Grey 500 | `#54585B` |
| Grey 600 | `#3E4143` |
| Grey 700 | `#2D2F31` |
| Grey 800 | `#1C1D1F` |
| Grey 900 | `#101112` |

#### Surface Colors

| Name         | Hex       |
| ------------ | --------- |
| Surface Blue | `#F5F9FF` |

#### Colors Not to Use
- Any color outside the defined palette above.
- Custom shadows or elevation effects.
- Loud secondary colors (neons, pastels outside spec).
- No gradient backgrounds for web UI.

### Backgrounds

- **Website default** → `#FFFFFF`
- **Highlight sections** → `#F5F9FF` (Surface Blue)

### Card Styling

```css
background: #FFFFFF;
border: 1px solid #E4E8EB;   /* Grey 200 - default */
border-radius: 8px;
transition: border 150ms ease-out;
```

On hover:
```css
border: 2px solid #D1D7DC;   /* Grey 300 */
```

Guideline: **no shadows** (unless extremely subtle). Cards rely on border-based structure only.

---

## Typography

### Font
**Manrope** is the **only** allowed typeface across all weights and styles.

Google Fonts import:

```html
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
```

### Type Scale

| Style          | Weight       | Size  | Line Height | Letter Spacing |
| -------------- | ------------ | ----- | ----------- | -------------- |
| Display Large  | Bold 700     | 40px  | 48px        | -2%            |
| Display Medium | Bold 700     | 36px  | 45px        | -2%            |
| H1             | SemiBold 600 | 36px  | 45px        | -2%            |
| H2             | SemiBold 600 | 32px  | 40px        | -2%            |
| H3             | SemiBold 600 | 24px  | 32px        | -2%            |
| H4             | Medium 500   | 20px  | 28px        | -2%            |
| Body Base      | Medium 500   | 16px  | 26px        | -2%            |
| Body Small     | Regular 400  | 14px  | 21px        | -2%            |
| Label          | Medium 500   | 12px  | 16.8px      | +4%            |

### Hierarchy Rules
- Strong typographic hierarchy is the primary visual differentiator — no decoration to compensate for weak type.
- Default text color: **Grey 800** (`#1C1D1F`) on white backgrounds.
- Blue (`#3B82F6`) is the dominant **action** color; use for links and interactive labels.
- Do not deviate from the type scale above.

---

## Layout Rules by Medium

### Website
- Default background: `#FFFFFF`.
- Highlight / alternate sections: `#F5F9FF` (Surface Blue).
- Blue is the sole action color; no secondary accent colors on web UI.
- Border-based structure; **no heavy elevation or drop shadows**.

### Buttons

All buttons share these global rules:
- Height: **48px** · Border Radius: **16px** · Horizontal Padding: **20–24px**
- Font: **Manrope Bold 16px** · Letter Spacing: **-2%** · Transition: **150ms ease-out**
- No size variations, no scaling on hover, no shadows.

| Variant             | Default State                                | Hover                        | Disabled                             |
| ------------------- | -------------------------------------------- | ---------------------------- | ------------------------------------ |
| Primary             | bg `#3B82F6`, text white, no border          | bg `#2F68C5`                 | bg `#B1CDFB`, text white 70%         |
| Primary + Arrow     | Same + right arrow icon                      | bg `#2F68C5`, arrow +2px     | Blue 200 bg, arrow faded             |
| Secondary           | transparent, border `#3B82F6`, text `#3B82F6`| bg `#EBF2FE`                 | border `#D1D7DC`, text `#9DA3A7`     |
| Secondary + Arrow   | Same + arrow icon                            | bg `#EBF2FE`, arrow +2px     | Same as Secondary disabled           |
| Tertiary            | transparent, no border, text `#3B82F6`       | text `#2F68C5`               | text `#9DA3A7`                       |
| Tertiary + Arrow    | Same + arrow icon                            | text `#2F68C5`, arrow +2px   | text `#9DA3A7`, arrow faded          |

**Nav buttons**: small square icon buttons, border-based, hover → stronger border, disabled → faded.

### Motion & Interaction
- All transitions: **150ms ease-out**.
- Card hover: border thickness change **only**.
- Button hover: color shift **only**.
- No scaling, no bounce, no drop-shadow expansion.

### Presentations / Decks
- Simplified palette: **Blue shades + Indigo + Navy + White**.
- Manrope Bold/SemiBold headlines + Manrope Regular body.
- Charts: highlight series with Blue 500/600; use Grey for grids/axes.

### Social Creatives (Ads)
- Follow the **standard ad template** structure (see below).
- Navy background (`#181830`) permitted for ad creatives.

### Merchandise / Wearables / Tags
- Conservative palette and high contrast.
- Stick to primary colors (Blue, Navy, White).

---

## Standard Creative Templates

### Ad Creative: Mandatory Elements
Every ad creative must include:

1. **Top-left**: Codebasics SVG logo (blue `#3B82F6`).
2. **Top-right**: YouTube badge: YouTube play icon + **“1 Million+ Subscribers”** + **“4.9 Rating”**.
   - Always exactly **“1 Million+”** (not “1.4M+”, not “1.4 Million+”).
3. **Headline**: Saira Condensed 900, uppercase, with **ONE** lime accent word/phrase.
4. **Visual body**: comparison/timeline/cards/etc.
5. **Bottom bar**: Program name + trust signals + CTA button.

### Bottom Bar Pattern

```
[PROGRAM NAME]     Lifetime Version Access • 100% Refund Policy • Free Portfolio Website     [CTA →]
```

### CTA Button Options
- “Join Program for ₹XX,XXX →”
- “Start Your Journey →”
- “Build Real Projects →”
- “Start for ₹105/Day →”
- “Preview Sample Lessons →”
- “Enroll Now →”

### Lime Accent Rule
Only **one** word/short phrase per creative gets lime `#D7EF3F`.

Examples:
- “STOP LEARNING **DEAD TOOLS.**”
- “REAL PROJECTS VS **TUTORIALS**”
- “WHICH CANDIDATE GETS **THE CALLBACK?**”

---

## YouTube Thumbnail Rules

Thumbnails are **educational** (top of funnel), not bootcamp ads.

### Thumbnail Formula
1. Founder face: **30–40%** of frame, expressive.
2. Bold headline: **3–6 words**, massive (80–120px).
3. Tool/tech logos: alongside/below headline.
4. Gradient background: navy-to-purple.
5. **Do not include**: Codebasics logo, YouTube badge, CTA buttons, prices, trust signals.

### Thumbnail Font Styles
- Saira Condensed 900, strong solid colors.
- Optional outlines/strokes for “provocative” topics.
- Mixed weight (300 + 900) allowed for contrast.

---

## The Cinematic Universe

Use brand characters to dramatize the learner journey.

- **Peter Pandey**: confused beginner; highlight “before” state.
- **Tony Sharma**: shortcut/certificate culture; mock bad habits.
- **Bruce Haryali**: over-thinker; tool fatigue and analysis paralysis.
- **Dhaval/Hemanand**: guides; calm authority.

Rules:
- Mock the mistake, **never the learner**.
- Keep humor secondary to clarity.

---

## The “AtliQ” Standard

Any project visuals, dashboards, datasets, or business context must use **AtliQ** branding.
Never use generic lorem-ipsum business names.

AtliQ universe:
- AtliQ Hardware: consumer electronics
- AtliQ Grands: hospitality
- AtliQ Mart: FMCG retail

---

## Copywriting Guardrails

### Always Do
- Lead with transformation/insight, not price.
- Use real project names (AtliQ Hardware dashboards, supply chain, etc.).
- Include trust signals (refund policy, lifetime access, portfolio site).
- Treat the reader as a smart professional.

### Never Do
- Fake urgency, fear-based marketing.
- Strikethrough pricing.
- Exact salary promises.
- Naming competitors negatively.
- Overpromising speed/ease.

---

## Implementation Notes

### Tokenized Theme (Recommended)
Define these tokens in your design system so artifacts can map consistently:

| Token             | Value     | Usage                             |
| ----------------- | --------- | --------------------------------- |
| `cb.blue`         | `#3B82F6` | Primary action / CTAs / logo      |
| `cb.blue-hover`   | `#2F68C5` | Button/link hover state           |
| `cb.blue-subtle`  | `#EBF2FE` | Secondary button hover background |
| `cb.purple`       | `#6F53C1` | Secondary brand accent            |
| `cb.indigo`       | `#3F4C78` | Muted structural color            |
| `cb.navy`         | `#181830` | Ad / dark-mode backgrounds        |
| `cb.white`        | `#FFFFFF` | Default page background           |
| `cb.surface`      | `#F5F9FF` | Highlight section background      |
| `cb.border`       | `#E4E8EB` | Card default border (Grey 200)    |
| `cb.border-hover` | `#D1D7DC` | Card hover border (Grey 300)      |
| `cb.text`         | `#1C1D1F` | Default body text (Grey 800)      |
| `cb.text-muted`   | `#9DA3A7` | Disabled / placeholder (Grey 400) |

### Strict Prohibitions
- No colors outside the defined palette.
- No custom shadows.
- No inconsistent border radius.
- No experimental UI styles.
- No font other than **Manrope**.
- No gradient backgrounds on web pages.
- No pill shapes beyond 16px button radius.
- No scaling or bounce animations.

### Accessibility
- Default dark text (`#1C1D1F`) on white/light backgrounds.
- Blue 500 on white meets AA contrast (4.55:1).
- Labels and body text should never drop below 14px.

### When Generating Web Artifacts
- **Light-first**: white (`#FFFFFF`) default background.
- Alternate sections: Surface Blue (`#F5F9FF`).
- Headline: Manrope Bold/SemiBold, -2% letter spacing.
- Body: Manrope Medium/Regular.
- Action color: Blue 500 (`#3B82F6`) throughout.
- Cards: border-only structure, no shadows.
- Transitions: 150ms ease-out on borders and colors only.
- Apply copy guardrails (gimmick-free, no fake urgency, no salary promises).
