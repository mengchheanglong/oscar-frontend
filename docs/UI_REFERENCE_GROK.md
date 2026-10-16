# Workspace UI reference: Grok

User direction: use Grok's full visual language for the personal workspace.
Reference inspected at https://grok.com/ on 2026-10-16, plus the user's signed-in
sidebar screenshot. Public home, attachment/mode controls, and appearance menu
were inspected in a real browser. Signed-in-only pages were not accessible in
that browser, so this is not a claim of a complete authenticated-site scrape.

## Measured reference

- Canvas: rgb(19, 18, 17), primary text rgb(252, 252, 252), secondary rgb(158, 158, 158).
- Reference font stack: universalSans, Inter, Roboto, Open Sans, Arial, system sans.
  Workspace retains its bundled Inter font as the available fallback.
- Public welcome heading: 24px, weight 550, line-height 32.4px. Signed-in reference
  has a larger work canvas; workspace uses 24px desktop and mobile.
- Public composer is 752px at a 1440px viewport; the supplied signed-in screenshot
  uses a wider composer. Workspace caps it at 752 CSS pixels, matching 940 display pixels at 125% zoom.
- Rounded pill controls, circular icon actions, muted surfaces, minimal borders.
- Public plus, send, settings and mark SVG paths are captured in workspace-icons.
  Workspace-specific glyphs are drawn on the matching 24px grid.

## Implementation

`src/app/workspace-theme.css` holds dark/light design tokens, component styling,
and a compatibility layer for existing neutral Tailwind classes. Status colors
remain meaningful in tasks and alerts. Root CSS variables also reach dialogs
and portals. Tailwind's existing codex aliases now point to workspace tokens.

Theme choice (dark/light/system) and sidebar collapse are stored only in this
browser. System theme follows OS changes. Theme initialization runs before
hydration; client controls load the same saved preference.

The shared sidebar has collapsible desktop navigation and a mobile drawer with
focus containment, Escape dismissal and focus restoration. Its search icon opens
the existing command palette. Projects, chat history, Files and Kanban remain
functional. The app root opens the assistant; login is a minimal centered form,
without demo credentials or placeholder social-auth buttons.

The composer uses the existing engines: Assistant and Hermes. It does not pretend
to offer Grok models, voice, Imagine or paid features. Dropdowns support keyboard
navigation and focus restoration. The plus menu opens Files or uploads files into
the selected project's document service; dropping files uses that same service.
Uploads are project documents, not transient per-message attachments. Backend
validation and project authorization remain authoritative. Partial upload failure
shows the number already saved. Switching projects prevents stale upload notices
from appearing in a different project. Uploading does not mean processing is done.

## Verification

Frontend lint, TypeScript, production build and local browser verification.
Browsers covered dark/light persistence, sidebar collapse persistence, keyboard
engine selection, existing conversations, mobile menus and Escape behavior,
search palette, task editor, Files, and sign-in styling. Composer uploads were
verified against the isolated develop backend, and both temporary test documents
were deleted through Files; a scoped API read confirmed zero remain. No model
request or user-content deletion was needed. Mobile page width equals its 390px
viewport. AIW accepted-decision lookup returned no records. No assigned task was
supplied or marked complete.


## Reference sizing refinement

The supplied side-by-side captures showed 125% display scaling: the former 320px
CSS sidebar appeared 400px wide, while the reference was 320 display pixels.
The sidebar is now 256 CSS pixels, with 36px desktop rows, 16px row icons and
13px labels. The composer is 752 CSS pixels. Overview is removed from primary
navigation; Search is available through the header icon and command palette.
Project administration remains accessible through Settings. At a 1534x732 CSS
viewport, browser measurement confirms 256px sidebar width, 236x36px rows and
zero Overview navigation links. Mobile keeps 40px rows and 40px minimum input
height. Unrelated in-progress Settings and Team work is preserved separately.
