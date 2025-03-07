# Breeze

## Rules
- Never create mocks or examples, only use real endpoints and esnure the implementation to be feature complete.

I am building a modern desktop application using ElectronJS, and I want you to assist me with scaffolding the structure, designing the user interface, applying CSS styles, and defining core functionality. The application should be heavily inspired by the layout, style, and functionality of Discord and Visual Studio Code (VS Code), blending:

Discord’s modern chat-like aesthetic with left-side navigation and dynamic content panes.
VS Code’s multi-pane flexibility, custom top and sidebar navigation, and efficient use of screen real estate.
🏛️ Application Structure
The application should use a multi-process architecture typical of advanced Electron apps, with:

Main Process (Electron’s backend for native integration, file access, and window management).
Renderer Process (the frontend UI, built using HTML, CSS, and JavaScript or TypeScript — React or vanilla JS acceptable).
Preload Script to securely expose tightly scoped native API bridges to the renderer process.
Additional Processes (Optional) for background sync, notifications, or extension/plugin handling.
📐 Layout Requirements
The overall layout should include:

1. Left Navigation Sidebar
Fixed width (about 240px wide).
Dark theme.
Inspired by Discord’s server list, but adapted for a multi-tool context.
Each item should have:
Icon (SVG or font icon)
Label (tooltip on hover)
State indicators (unread badge, active state)
2. Top Header Bar (Optional but Preferred)
Full width.
Similar to VS Code’s top action bar.
Houses:
App name/logo on the left.
Global search input in the center.
User profile, settings, and notifications on the right.
Support for draggable window area (frameless window).
3. Primary Content Area
Occupies the remaining space.
Should be tabbed or segmented into panels, like VS Code’s editor panes or Discord’s chat area.
Each panel should be:
Closable.
Resizable (split view).
Dockable (support vertical and horizontal splits).
4. Secondary Right Sidebar (Optional)
Can be collapsed/expanded.
For additional contextual tools (like VS Code’s extensions or Discord’s member list).
5. Bottom Status Bar
Full width.
Dark background.
Shows:
Current status (online/offline, sync status).
Notifications (if any).
Quick links or toggle buttons.
🎨 Visual Style Guide (CSS)
The theme should follow:

General Theme
Dark mode first (light mode optional later).
Inspired by:
Discord’s dark gray/charcoal base.
VS Code’s sharp edges and minimal gradients.
Colors
Primary Background: #2e2e2e (dark gray)
Sidebar Background: #1e1e1e
Panel Background: #252526
Text Color: #d4d4d4 (light gray)
Accent Color: #7289da (Discord blue) OR customizable.
Typography
Primary Font: Segoe UI, Roboto, or Inter.
Font Sizes:
Base: 14px
Sidebar Items: 13px
Headers: 16px bold
Spacing:
8px for small padding.
16px for larger gaps.
Component Styling
Component	Style
Buttons	Flat, no shadows, hover highlight with accent border.
Panels	Sharp borders, slight inner shadow for separation.
Inputs	Flat with subtle inner glow on focus.
Tabs	Simple text with hover underline, active tab highlighted.
Tooltips	Dark background, rounded corners, slight shadow.
⚙️ Functional Features
1. Split Panel Handling
Users should be able to:
Open multiple panels.
Split panels vertically or horizontally (like VS Code).
Close individual panels.
Drag to reorder.
2. Sidebar Navigation
Support:
Active and inactive states.
Hover tooltips.
Grouping items (collapsible sections).
3. Tab Management
Each opened view should have a tab at the top.
Tabs should support:
Reordering.
Closing.
Context menus for options (close all, close others).
4. Notifications
Bottom right toast notifications (optional).
Notification center in top bar (similar to Discord’s inbox).
5. Theme Support
Dark theme first.
Optional light theme.
Ability to switch themes via user preferences.
6. Global Search
Search input in the top bar.
Search opens a centered modal with results, similar to VS Code’s Command Palette.
🛠️ Technical Requirements
Framework
ElectronJS for desktop shell.
React (preferred) or vanilla JS for renderer.
TypeScript (optional but preferred).
Preload Script for secure communication between main and renderer.
Directory Structure
bash
Copy
Edit
/src
    /main  (Main process code)
    /renderer (UI code - React or Vanilla JS)
    /preload (Preload bridge scripts)
    /assets (Icons, logos)
    /styles (Global CSS or SCSS)
Key Files
File	Purpose
main.ts	Electron main process entry point
preload.ts	Secure API bridge
renderer.tsx	React entry point
App.tsx	Main app layout shell
Sidebar.tsx	Left navigation
HeaderBar.tsx	Top bar
ContentPanel.tsx	Split-view content handler
StatusBar.tsx	Bottom status bar
Tabs.tsx	Tab management component
📚 Example Pages (Initial Views)
Dashboard View - Placeholder for app’s home screen.
Chat/Console View - Text output console or chat area.
Settings View - App preferences/settings, including theme toggle.
💬 Desired Outcome
Please generate:

Directory structure.
Sample code files (React preferred).
Global styles (CSS or SCSS).
Initial window setup (frameless, draggable).
A working sidebar, header bar, tab system, and split-panel content area.
Dummy data to demonstrate navigation between views.
Basic IPC communication example (e.g., fetching app version from main process).
🧠 Additional Notes
The design should feel like a developer tool with Discord-level polish.
Performance matters — avoid loading all content upfront.
Flexibility — allow future customization via JSON configuration (sidebar items, colors, etc.).
Code should be clean, modular, and ready to expand.
🎁 Output Format
Provide:

Markdown file with directory structure and explanation.
Zipped file of code (if supported).
CSS/SCSS file for dark theme.
TypeScript or JavaScript files for Electron setup, UI components, IPC handling.
Screenshots of example running app (if supported).
📦 Important
This is for a real-world project, so focus on:

Modularity.
Scalability.
Performance.
Security (no direct Node access in renderer).
🔗 Optional Extras
If you can also generate:

Icons (SVG set).
Loading animations.
Example test cases (Jest or equivalent).
Please do.



## Build Commands
- `npm run build` - Build the application
- `npm run dev` - Run in development mode
- `npm start` - Start the application
- `npm run package` - Package the application for all platforms
- `npm run package:mac` - Package for macOS
- `npm run package:win` - Package for Windows
- `npm run package:linux` - Package for Linux

## Project Structure
- `/electron` - Electron main process code
- `/src` - Source code for the renderer process and UI
- `/src/services` - Backend services (AI, file, config)
- `/dist` - Compiled output

## Features
- Markdown editor with CodeMirror
- Chapter management system
- Character, location and asset organization
- AI assistance with OpenAI and Anthropic Claude
- Dark theme UI with VS Code-like appearance

## Code Preferences
- TypeScript for all new code
- Follow existing module patterns
- Use async/await for asynchronous operations
- Maintain strict separation between main and renderer processes
- Follow the existing UI styling patterns