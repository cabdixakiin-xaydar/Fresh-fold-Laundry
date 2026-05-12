---
name: Laundry Management System
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#414755'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#717786'
  outline-variant: '#c1c6d7'
  surface-tint: '#005bc1'
  primary: '#0058bc'
  on-primary: '#ffffff'
  primary-container: '#0070eb'
  on-primary-container: '#fefcff'
  inverse-primary: '#adc6ff'
  secondary: '#506071'
  on-secondary: '#ffffff'
  secondary-container: '#d3e4f8'
  on-secondary-container: '#566677'
  tertiary: '#555d63'
  on-tertiary: '#ffffff'
  tertiary-container: '#6e757c'
  on-tertiary-container: '#fcfcff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d8e2ff'
  primary-fixed-dim: '#adc6ff'
  on-primary-fixed: '#001a41'
  on-primary-fixed-variant: '#004493'
  secondary-fixed: '#d3e4f8'
  secondary-fixed-dim: '#b8c8db'
  on-secondary-fixed: '#0c1d2b'
  on-secondary-fixed-variant: '#394858'
  tertiary-fixed: '#dce3eb'
  tertiary-fixed-dim: '#c0c7cf'
  on-tertiary-fixed: '#151c22'
  on-tertiary-fixed-variant: '#40484e'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  display-lg:
    fontFamily: Hanken Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Hanken Grotesk
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Hanken Grotesk
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  headline-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 20px
  margin-mobile: 16px
  margin-desktop: 40px
---

## Brand & Style

This design system is built upon the pillars of **clinical precision, freshness, and operational efficiency.** It is designed for high-throughput professional environments where clarity and hygiene are paramount. The aesthetic avoids unnecessary decoration, opting instead for a "sterile" atmosphere that mirrors a clean, well-organized laundry facility.

The design style is a hybrid of **Minimalism** and **Corporate Modernism**. It leverages significant whitespace to prevent cognitive overload, while utilizing structured information density to ensure that professional users can track hundreds of concurrent orders without error. The emotional response should be one of total reliability and calmness—the digital equivalent of a freshly pressed linen.

## Colors

The palette for this design system is rooted in "Ozone Blues" and "Linen Whites." 

*   **Primary Blue:** A crisp, high-saturation blue representing water, cleanliness, and technology. It is used for primary actions and active states.
*   **Neutral Palette:** A range of cool grays and soft whites. The background uses a subtle off-white to reduce eye strain during long shifts, while borders and secondary text use cool-toned grays to maintain a "chilled" aesthetic.
*   **Status Indicators:** To ensure operational efficiency, status colors are highly vibrant and high-contrast. They must stand out clearly against the cool palette to signal order stages (e.g., "Ready," "In-Progress," "Urgent").

## Typography

This design system utilizes **Hanken Grotesk** for its contemporary, sharp, and highly legible characteristics. The typeface was chosen for its precise geometry, which reinforces the feeling of an organized, systematic workspace.

Key rules for implementation:
*   **Hierarchy:** Use bold weights for order numbers and customer names to ensure they are scannable from a distance (e.g., on a wall-mounted tablet).
*   **Labels:** All operational labels (e.g., "Weight," "Fabric Type") should use the `label-md` or `label-sm` styles in semi-bold to distinguish them from user-generated content.
*   **Contrast:** Secondary body text should be kept in a mid-range cool gray, while primary data remains in near-black for maximum accessibility.

## Layout & Spacing

The layout philosophy follows a **Fixed-Fluid Hybrid Grid**. For the desktop management dashboard, a 12-column system is used with generous gutters to maintain the "fresh" and "airy" feel of the design.

*   **Grid Structure:** 12 columns on desktop, 8 on tablet, and 4 on mobile. 
*   **Rhythm:** An 8px linear scale (base 4px) governs all padding and margins. 
*   **Density:** While the overall feel is "airy," the central data tables should maintain a compact vertical rhythm (using `sm` and `md` spacing) to maximize the information visible on the screen at once.
*   **White Space:** Large margins (`margin-desktop`) are used on the outer edges of the screen to frame the content, creating a professional, balanced presentation.

## Elevation & Depth

This design system avoids heavy shadows to maintain its sterile, clean aesthetic. Instead, depth is communicated through **Tonal Layering** and **Low-Contrast Outlines**.

*   **Surfaces:** The primary application background is `neutral-color-hex`. Content containers (cards) are pure white.
*   **Borders:** Rather than shadows, cards and inputs are defined by 1px solid borders in a very light cool gray (#E2E8F0).
*   **Active States:** When an element is selected or focused, it gains a subtle 2px Primary Blue glow with 10% opacity, rather than a traditional drop shadow.
*   **Floating Elements:** Modals or dropdowns use a "Soft Ambient" shadow—very large blur (24px) and very low opacity (5%) to suggest they are floating on a cushion of air.

## Shapes

The shape language is **Soft (Level 1)**. This choice strikes a balance between the precision of sharp corners and the friendliness of rounded ones.

*   **Buttons & Inputs:** Use a 4px (0.25rem) corner radius. This maintains a structured, professional appearance suitable for a management tool.
*   **Status Chips:** Use a full pill-shape (circular ends) to contrast against the rectangular grid of the rest of the UI, making them immediately recognizable as status indicators.
*   **Large Containers:** Main dashboard cards should also follow the `rounded-lg` (0.5rem) standard to subtly soften the "sterile" environment.

## Components

### Buttons
Primary buttons are solid Crisp Blue with white text. Secondary buttons are outlined in cool gray. All buttons feature a subtle 150ms transition on hover, shifting the background color slightly deeper.

### Chips (Status Tags)
Chips are the most colorful elements in this design system. They use a light-tint background of the status color with high-contrast dark text (e.g., a "Ready" chip has a pale green background and a deep forest green text).

### Lists & Data Tables
Tables are the heart of the system. They use a "Clean Row" style: no vertical dividers, only horizontal lines in the lightest gray. Hovering over a row should trigger a very subtle blue-tinted highlight.

### Input Fields
Inputs are minimalist. They feature a 1px gray border that turns Primary Blue on focus. Labels sit clearly above the input in `label-sm` bold.

### Laundry-Specific Components
*   **Progress Stepper:** A specialized component showing the "Wash > Dry > Fold > Ready" flow, using the Primary Blue for completed steps and a pulsing blue for the current step.
*   **Urgency Indicator:** A high-contrast amber or red vertical bar on the far left of an order card to signify "Express" or "Overdue" status.