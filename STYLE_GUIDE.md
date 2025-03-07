# Authorship Style Guide

This style guide ensures consistent UI development for the Authorship project. We use ShadCN components with Tailwind CSS v4 in a dark theme optimized for identity graph visualization and authoring contents like books and essays.

## Color Palette

### Primary Colors
- **Background**: Dark (#111827)
- **Card Background**: Slightly lighter (#1f2937)
- **Text**: Light gray (#f3f4f6)
- **Accent**: Purple (#8b5cf6)

### Semantic Colors
- **Success**: Green (#10b981)
- **Error/Destructive**: Red (#ef4444)
- **Info**: Blue (#3b82f6)
- **Teal**: #14b8a6

## Typography
- **Base Font**: System font stack (Apple, Segoe UI, etc.)
- **Headings**: Font weight 600 (semibold)
- **Body**: Font weight 400 (regular)
- **Font Sizes**:
  - Card titles: 1.25rem
  - Body text: 0.875rem
  - Small text: 0.75rem

## Component Guidelines

### Buttons
- Use the `Button` component from ShadCN with our custom variants
- Default styling: Dark background with light border
- Variants: default, destructive, outline, secondary, ghost, link
- Sizes: default, sm, lg, icon

```tsx
<Button>Default Button</Button>
<Button variant="destructive">Delete</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button size="sm">Small</Button>
```

### Cards
- Use the Card component set from ShadCN
- Structure: Card > CardHeader > CardTitle + CardDescription > CardContent > CardFooter
- Dark background with subtle border and shadow

```tsx
<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Description here</CardDescription>
  </CardHeader>
  <CardContent>
    Content goes here
  </CardContent>
  <CardFooter>
    Footer content
  </CardFooter>
</Card>
```

### Form Elements
- Inputs have dark background (#374151) with light borders
- Focus state: Purple border with subtle glow
- Labels: Light gray (#d1d5db), 0.875rem font size
- Consistent padding and rounded corners

```tsx
<div className="form-group">
  <label className="form-label">Label Text</label>
  <Input type="text" placeholder="Placeholder text" />
</div>
```

### Badges
- Use for status indicators and tags
- Variants: default, secondary, destructive, outline
- Rounded with subtle background colors

```tsx
<Badge>Default</Badge>
<Badge variant="secondary">Secondary</Badge>
<Badge variant="destructive">Error</Badge>
```

### Navigation
- Active state: Purple background with purple text
- Hover state: Slightly lighter background
- Include icons with text for better visibility

## Layout Guidelines
- Use consistent spacing: multiples of 0.25rem (4px)
- Container width: max-width of 1280px, centered
- Responsive breakpoints follow Tailwind defaults
- Card sections use 1.5rem padding
- Maintain consistent vertical rhythm with 1.5 line height

## Accessibility
- Ensure sufficient color contrast (WCAG AA minimum)
- Focus states are clearly visible with purple outline
- Interactive elements have appropriate hover/focus states
- Text is minimum 0.75rem for readability

## Icons
- Use Lucide React icons consistently
- Standard sizes:
  - icon-sm: 1rem (16px)
  - icon-md: 1.25rem (20px)
  - icon-lg: 2rem (32px)

## Character and Location Visualization

### Character Relationships
- Relationship lines use semantic colors:
  - Family: Blue (#3b82f6)
  - Friend: Green (#10b981)
  - Rival: Amber (#f59e0b)
  - Enemy: Red (#ef4444)
- Node sizes should be consistent (40px default)
- Hover states show additional information

### Location Mapping
- Location types use semantic colors:
  - City: Teal (#14b8a6)
  - Wilderness: Green (#10b981) 
  - Landmark: Amber (#f59e0b)
  - Building: Slate (#64748b)
- Connection lines have 2px stroke width
- Path types indicated by line style (solid, dashed, dotted)

## Editor Interface
- Editor background slightly darker than cards
- Syntax highlighting uses a consistent color scheme
- Line numbers in muted color (#6b7280)
- Active line subtly highlighted

## Modal Dialogs
- Use consistent header/footer styling
- Actions aligned to the right in footer
- Destructive actions use red styling
- Backdrop with 70% opacity black
- Z-index: 1000