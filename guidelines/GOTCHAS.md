# Gotchas: @donotdev/ui

Common mistakes related to routing, styling, layouts, and UI components.

---

## Routing [Phase 1, 3]

**Never import from `react-router-dom` - use framework routing.**

```tsx
// WRONG - breaks framework features
import { Link, useNavigate, useParams } from 'react-router-dom';

// CORRECT
import { Link, useNavigate, useParams } from '@donotdev/ui';
```

**Routes are auto-discovered** from `src/pages/*Page.tsx` with `pageMeta`. Don't use `<Routes>`, `<Route>`, or manual `<Outlet />`.

**Use `useRouteParam('id')` for typed route params** - not `useParams()` from react-router-dom.

**Navigation is auto-built.** Use `<DnDevNavigationMenu>` or `useNavigationItems()`. Don't build nav manually - you lose auth filtering and route discovery.

---

## Styling [Phase 3, 4]

**No inline `fontSize` or `font-size` - use `Text` level prop.**

```tsx
// WRONG
<Text style={{ fontSize: '18px' }}>Title</Text>

// CORRECT
<Text level="h2">Title</Text>
```

Levels: `h1`, `h2`, `h3`, `h4`, `body`, `small`, `caption`. Limit to 2-3 levels per page.

**RTL: Always use `start`/`end` - never `left`/`right`.**

```css
/* WRONG - breaks RTL */
text-align: left;

/* CORRECT - works in both LTR and RTL */
text-align: start;
```

Same for inline styles: `textAlign: 'start'` not `textAlign: 'left'`. Same for data attributes: `data-text-align="start|center|end"`.

---

## Components [Phase 3]

**Always `lookup_symbol` before using any `@donotdev` component.** Never guess props.

Common wrong props:
- `Button`: no `size`, `tone`, `gap` - use `variant`, `display`
- `Text`: no `size`, `tone`, `color` - use `level`, `variant`
- `Stack`: no `spacing`, `size` - use `gap`
- `Card`: no `padding`, `margin`, `size` - use `title`, `subtitle`, `content`, `footer`
- `Grid`: no `columns` - use `cols`

**If you can't do it with framework components:** Stop. Tell the user what's missing. Don't invent custom workarounds.
