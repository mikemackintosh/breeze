# Breeze

Writing should be a _Breeze_. 

**This is an AI side project.**

## Features

- Markdown editor with CodeMirror
- Character relationship visualization
- Location and environment mapping
- AI writing assistance
- Modern UI with ShadCN components and Tailwind CSS

## Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm run dev
```

## Build and Package

Build the application:

```bash
npm run build
```

Package the application for distribution:

```bash
# For all platforms
npm run package

# For specific platforms
npm run package:mac
npm run package:win
npm run package:linux
```

## Development

Breeze is built with:

- Electron
- TypeScript
- Tailwind CSS
- CodeMirror
- ShadCN UI Components

### Project Structure

- `/electron` - Electron main process code
- `/src` - Source code for the renderer process and UI
  - `/src/services` - Backend services (AI, file, config)
  - `/src/styles` - CSS and styling
- `/dist` - Compiled output

## Style Guide

Please refer to the [Style Guide](STYLE_GUIDE.md) for UI component usage and design patterns.

## License

MIT