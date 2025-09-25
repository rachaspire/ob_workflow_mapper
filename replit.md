# React Flow KYB/KYC Process Visualization App

## Overview
This project is a React Flow application for visualizing KYB (Know Your Business) and KYC (Know Your Customer) processes. It provides an interactive flowchart interface showing data inputs, processing steps, and outputs in a business verification workflow.

## Project Architecture
- **Frontend Framework**: React 18 with Vite 5 as build tool
- **UI Components**: Radix UI components with Tailwind CSS for styling  
- **Flow Visualization**: React Flow library for interactive diagrams
- **Icons**: Lucide React for UI icons
- **Deployment**: Configured for Replit autoscale deployment

## Project Structure
```
src/
├── components/
│   ├── nodes/           # Custom React Flow node components
│   │   ├── DataNode.jsx     # Data input/output nodes
│   │   └── ProcessNode.jsx  # Process/workflow nodes
│   ├── ui/              # Reusable UI components (buttons, cards, etc.)
│   ├── CreateNodeForm.jsx   # Form for creating new nodes
│   └── NodeInspector.jsx    # Node detail inspector panel
├── lib/
│   └── utils.js         # Utility functions
├── App.jsx              # Main application component
├── Flow.jsx             # Main flow visualization component
├── index.css           # Global styles and Tailwind imports
└── main.jsx            # React app entry point
```

## Current State
- ✅ Dependencies installed
- ✅ Vite configured for Replit environment (port 5000)
- ✅ Frontend workflow running successfully
- ✅ Deployment configuration set up
- ✅ Module type configured to eliminate warnings

## Recent Changes
- Configured Vite server for Replit environment with host 0.0.0.0 and port 5000
- Added module type to package.json to eliminate Node.js warnings
- Set up autoscale deployment with build and preview commands

## User Preferences
- None specified yet

## Development Server
- Port: 5000
- Host: 0.0.0.0 (allows Replit proxy access)
- HMR configured for Replit environment
- Runs via `npm run dev`

## Deployment
- Type: Autoscale (stateless frontend)
- Build: `npm run build`
- Run: `npm run preview`