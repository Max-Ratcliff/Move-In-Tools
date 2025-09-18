# Cart Checkout Tracker

A simple web interface for staff to track cart checkouts with automatic 30-minute alerts.

## Features

- **Cart Checkout**: Staff can enter cart number and phone number
- **Real-time Tracking**: Shows elapsed time for each checked-out cart
- **30-minute Alerts**: Visual alerts when carts are overdue
- **Check-in System**: Easy one-click cart return
- **Data Persistence**: Uses localStorage to maintain data across sessions

## Development

### Prerequisites
- Node.js 14 or higher
- npm

### Getting Started

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm run dev
```

3. Open http://localhost:3000 in your browser

### Available Scripts

- `npm run dev` - Start development server with auto-reload
- `npm run start` - Start production server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## Deployment

### Vercel (Recommended)

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy:
```bash
vercel
```

Or connect your GitHub repository to Vercel for automatic deployments.

### Manual Deployment

The app is a static site - you can deploy the following files to any web server:
- `index.html`
- `styles.css`
- `script.js`

## Usage

1. **Check Out Cart**: Enter cart number and phone number, click "Check Out Cart"
2. **Monitor Carts**: View all checked-out carts with elapsed time
3. **Handle Alerts**: Red alerts appear for carts checked out 30+ minutes
4. **Check In Cart**: Click "Check In" button when cart is returned

## Browser Support

Works in all modern browsers that support:
- ES6 Classes
- localStorage
- CSS Grid/Flexbox