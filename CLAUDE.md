# Breeze

## Rules
- Never create mocks or examples, only use real endpoints and esnure the implementation to be feature complete.

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