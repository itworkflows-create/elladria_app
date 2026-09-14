---
name: Elladria
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#45464d'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#76777d'
  outline-variant: '#c6c6cd'
  surface-tint: '#565e74'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#131b2e'
  on-primary-container: '#7c839b'
  inverse-primary: '#bec6e0'
  secondary: '#006a61'
  on-secondary: '#ffffff'
  secondary-container: '#86f2e4'
  on-secondary-container: '#006f66'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#2f1500'
  on-tertiary-container: '#c76c00'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2fd'
  primary-fixed-dim: '#bec6e0'
  on-primary-fixed: '#131b2e'
  on-primary-fixed-variant: '#3f465c'
  secondary-fixed: '#89f5e7'
  secondary-fixed-dim: '#6bd8cb'
  on-secondary-fixed: '#00201d'
  on-secondary-fixed-variant: '#005049'
  tertiary-fixed: '#ffdcc3'
  tertiary-fixed-dim: '#ffb77d'
  on-tertiary-fixed: '#2f1500'
  on-tertiary-fixed-variant: '#6e3900'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 20px
  margin-mobile: 16px
  margin-desktop: 40px
---

## Brand & Style
The design system is engineered to facilitate international mobility with a focus on institutional trust and human opportunity. It bridges the gap between Sri Lankan talent and Romanian employers through a **Corporate Modern** aesthetic that emphasizes stability, clarity, and cross-border professionalism.

The UI avoids decorative excess in favor of a clean, structured interface that evokes the feeling of a high-end diplomatic or recruitment agency. It utilizes a high-legibility framework with significant whitespace to reduce the cognitive load of navigating complex visa and relocation processes. The emotional response is one of security and forward momentum—reassuring candidates that their professional journey is in capable hands.

## Colors
The palette is rooted in a deep, authoritative Navy Blue (`#0F172A`) to establish immediate trust and institutional permanence. This is balanced by an Emerald Green (`#0D9488`) which signifies growth, success, and the "green light" for relocation milestones. 

- **Primary (Deep Navy):** Used for navigation, headers, and primary actions to reinforce authority.
- **Secondary (Teal/Emerald):** Reserved for success states, progress indicators, and growth-related callouts.
- **Accent (Amber):** Used sparingly for urgent notifications, pending status updates, and critical alerts.
- **Background:** A systematic hierarchy of `White (#FFFFFF)` for primary content areas and a very subtle `Slate-50 (#F8FAFC)` for secondary layout sections to maintain high contrast and readability.

## Typography
The design system utilizes **Inter** exclusively to ensure maximum legibility across different screens and languages. Inter’s tall x-height and neutral character make it ideal for data-heavy application forms and job descriptions.

- **Headlines:** Use Bold (700) weights with slight negative letter spacing for a modern, compact look.
- **Body Text:** Standardized on a 16px base for accessibility, ensuring long-form job contracts and guides are easy to read.
- **Labels:** Use Medium (500) or Semi-Bold (600) weights for better scannability in forms and status badges.

## Layout & Spacing
The layout follows a **Fluid Grid** model with a focus on card-based containment. 

- **Desktop:** 12-column grid with 20px gutters. Content is centered with a max-width of 1200px to prevent excessive line lengths in job descriptions.
- **Mobile:** 4-column grid with 16px margins. 
- **Rhythm:** An 8px base unit drives all padding and margin decisions. Cards should use `lg (24px)` padding to provide a sense of premium "breathing room," emphasizing quality over quantity.

## Elevation & Depth
Depth is conveyed through **Tonal Layers** and subtle **Ambient Shadows**. Instead of heavy shadows, this design system uses soft, low-opacity borders combined with elevation to distinguish between the background and interactive elements.

- **Level 0 (Background):** Slate-50 surface.
- **Level 1 (Cards/Inputs):** White surface with a 1px border (`#E2E8F0`) and a very soft shadow (0px 1px 3px rgba(0,0,0,0.05)).
- **Level 2 (Modals/Dropdowns):** White surface with a more defined shadow (0px 10px 15px -3px rgba(0,0,0,0.1)) to indicate a clear temporary overlay above the main workflow.

## Shapes
A **Soft** shape language is used to balance professional rigour with approachability. 

- **Base components** (Buttons, Inputs): 4px (`0.25rem`) corner radius.
- **Large containers** (Job Cards, Profile Sections): 8px (`0.5rem`) corner radius.
- **Badges/Chips:** Full rounded (pill-shaped) to distinguish them from interactive buttons.

## Components

### Buttons
- **Primary:** Deep Navy background with White text. High contrast for critical actions like "Apply Now."
- **Secondary:** White background with Deep Navy border and text. Used for "Save for Later" or "View Details."
- **Success:** Emerald Green background for "Confirm" or "Complete Profile" steps.

### Status Badges
- **Open:** Emerald Green background (10% opacity) with Emerald Green text.
- **Pending:** Amber background (10% opacity) with Amber text.
- **Closed:** Slate-500 background (10% opacity) with Slate-600 text.

### Form Inputs
- **Default:** White background with a light gray border. Focus state uses a 2px Deep Navy border to ensure the user knows exactly where they are typing.
- **Validation:** Error states must include both a red border and a small icon to ensure accessibility for color-blind users.

### Cards
- Job cards should feature a prominent company logo on the left, with the job title in `headline-md` and a clear "Salary/Location" label below it.
- Use horizontal dividers (`#F1F5F9`) only when necessary; otherwise, use spacing to separate content groups.

### Specialized Components
- **Progress Tracker:** A vertical or horizontal stepper using the Emerald Green to show the candidate’s journey from "Application Submitted" to "Visa Approved."
- **Document Uploader:** A dashed-border container with a distinct icon, providing clear visual feedback when a file (Passport, CV) is successfully staged.