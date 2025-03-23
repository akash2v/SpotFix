# SpotFix - Issue Reporting App

SpotFix is a responsive web application that allows users to report issues and earn points for their contributions. This project is created by Akash Vishwakarma

## Features

- **Interactive Map**: Click anywhere on the map to report an issue
- **Issue Categories**: Categorize issues by type (Infrastructure, Cleanliness, Safety, etc.)
- **Severity Levels**: Mark issues as low, medium, or high priority
- **Gamification**: Earn Fix Points for reporting issues and completing daily challenges
- **Image Upload**: Attach photos to issue reports for better clarity
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Offline Support**: Submit issues even when offline (syncs when connection is restored)
- **PWA Support**: Install as a standalone app on mobile devices
- **Location Services**: Find and center on your current location

## Tech Stack

- HTML5, CSS3, JavaScript (Vanilla)
- Google Maps API for location services
- LocalStorage for data persistence
- Service Worker for offline functionality
- PWA features for app-like experience

## Installation

1. Clone the repository:

   ```
   git clone https://github.com/your-username/spotfix.git
   cd spotfix
   ```

2. Open `index.html` in your browser or use a local server:

   ```
   npx serve .
   ```

3. For production deployment, you can use services like Netlify, Vercel, or GitHub Pages.

## Project Structure

- `index.html` - Main HTML structure
- `style.css` - Styling and responsive design
- `script.js` - Core application logic
- `service-worker.js` - Offline capabilities and PWA support
- `manifest.json` - PWA configuration
- `.env` - Environment variables (API keys)

## Development

To set up the development environment:

1. Make sure you have your Google Maps API key in the `.env` file
2. For hot reloading, you can use tools like Live Server in VS Code
3. Test on multiple devices to ensure responsive design works correctly
