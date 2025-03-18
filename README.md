# Startup Cash Management Tool

A React-based tool for startups to manage and visualize their cash flow, runway, and financial events.

## Features

- Cash flow projection and visualization
- Runway calculation
- Financial event planning
- Weekly cash flow details
- Financial memo editor
- Cash management checklist

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- npm or yarn

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/startup-cash-management.git
cd startup-cash-management
```

2. Install dependencies
```bash
npm install
```

3. Start the development server
```bash
npm start
```

4. Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

## Deployment to Cloudflare Pages

1. Create a Cloudflare account if you don't have one
2. Install Wrangler CLI
```bash
npm install -g wrangler
```

3. Build the project
```bash
npm run build
```

4. Login to Cloudflare
```bash
wrangler login
```

5. Create a new Cloudflare Pages project
```bash
wrangler pages project create startup-cash-management
```

6. Deploy the project
```bash
wrangler pages publish build
```

## Usage

1. Set your starting cash position
2. Configure weekly revenue, payroll, and operating expenses
3. Add financial events like fundraising, new hires, or major contracts
4. View your projected cash flow and runway
5. Use the financial memo editor to document your plans and assumptions

## License

MIT
