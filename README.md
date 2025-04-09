# Buzzy.Chat - Web3 Chat Platform

A decentralized chat platform for web3 communities, built with React, Express, and blockchain authentication.

## Features

- 🔒 Secure Chat with end-to-end encryption
- 🌐 Web3 Integration with MetaMask and Coinbase Wallet
- 👥 Private & public chat rooms
- 🤝 Friend system with request management
- 🎨 Custom usernames & profiles
- 💬 Real-time messaging
- 😄 Emoji reactions
- ⌨️ Typing indicators

## Tech Stack

- Frontend: React, TypeScript, TailwindCSS
- Backend: Express.js, Node.js
- Database: NeonDB (Serverless Postgres)
- Authentication: Web3 (MetaMask/Coinbase Wallet)
- Real-time: WebSocket (local) or Pusher (production)

## Getting Started

1. Click the "Run" button to start the development server
2. The application will be available on port 5000
3. Connect your Web3 wallet (MetaMask or Coinbase Wallet)
4. Start chatting!

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Real-Time Messaging Options

Buzzy.Chat supports two methods for real-time messaging:

### WebSockets (Development)

WebSockets are used by default in development mode. This is a direct connection between the client and server that provides real-time message delivery.

### Pusher (Production/Netlify)

For production deployments, especially on platforms like Netlify that don't support WebSockets, Buzzy.Chat uses Pusher as a real-time messaging service.

#### Setting Up Pusher

1. Create a free account at [Pusher.com](https://pusher.com/)
2. Create a new Channels app in the Pusher dashboard
3. Note your app credentials:
   - App ID
   - Key
   - Secret
   - Cluster
4. Add these credentials to your `.env` file:
   ```
   PUSHER_APP_ID=your_app_id
   PUSHER_KEY=your_key
   PUSHER_SECRET=your_secret
   PUSHER_CLUSTER=your_cluster
   ```

The application will automatically detect whether to use WebSockets or Pusher based on:
- The presence of Pusher credentials in your environment
- Whether you're running on Netlify (automatically uses Pusher)

#### Verifying Pusher Connection

To verify if Pusher is working correctly:

1. Open your browser console on your deployed site
2. Run: `fetch('/.netlify/functions/debug-env').then(r => r.json()).then(console.log)`
3. You should see your Pusher configuration status

## Local Development Wallet Testing

When running the application on localhost, you can use test wallets without needing to install MetaMask or Coinbase Wallet:

1. Start the development server with `npm run dev`
2. Access the application on `http://localhost:5000`
3. Click on "Connect Wallet" 
4. In the dropdown menu, you'll see "Local Testing" options with test wallets
5. Select any test wallet to login without a real wallet

This feature is only available in the local development environment and allows you to test the application without connecting an actual Web3 wallet.

### Adding Test Wallets to the Database

For a complete testing experience, you can add pre-configured test wallets to your database:

1. Make sure your PostgreSQL database is running and configured properly
2. Make sure you've run database migrations with `npm run db:push`
3. Run the following command to add test wallets:
   ```
   npm run db:seed-test-wallets
   ```

This will add three test wallets to your database with the following details:

| Address | Username | Nickname |
|---------|----------|----------|
| 0x71C7656EC7ab88b098defB751B7401B5f6d8976F | test_user1 | Test User 1 |
| 0x2546BcD3c84621e976D8185a91A922aE77ECEc30 | test_user2 | Test User 2 |
| 0xbDA5747bFD65F08deb54cb465eB87D40e51B197E | test_user3 | Test User 3 |

These test wallets match the addresses used in the mock wallet implementation, allowing you to test user interactions between different accounts.

## Database Setup

The application supports both NeonDB (cloud/serverless PostgreSQL) and local PostgreSQL. You can easily switch between them by changing the `.env` configuration.

### Option 1: Using NeonDB (Cloud)
1. Sign up for a free account at [NeonDB](https://neon.tech)
2. Create a new PostgreSQL database
3. Copy your connection string
4. Create a `.env` file in the project root (or copy from `.env.example`) with:
   ```
   # NeonDB Configuration
   NEON_DATABASE_URL=your_neon_database_url_here
   USE_NEON_DB=true
   ```

### Option 2: Local PostgreSQL Installation (Windows)
1. Download PostgreSQL for Windows from the [official website](https://www.postgresql.org/download/windows/)
2. Run the installer with these settings:
   - Select all components during installation
   - Choose a password for the postgres superuser
   - Use the default port 5432
3. After installation, create a new database:
   - Open pgAdmin (installed with PostgreSQL)
   - Connect to your local server
   - Right-click on "Databases" and select "Create" → "Database"
   - Name your database (e.g., "buzzy_chat")
4. Create a `.env` file in the project root (or copy from `.env.example`) with:
   ```
   # Local PostgreSQL Configuration
   LOCAL_DATABASE_URL=postgresql://postgres:your_password@localhost:5432/buzzy_chat
   USE_NEON_DB=false
   ```

### Switching Between Databases

There are two easy ways to switch between database types:

#### Option 1: Using the CLI Scripts

We've added convenience scripts to quickly switch database types:

```bash
# Switch to local PostgreSQL
npm run db:local

# Switch to NeonDB (cloud)
npm run db:neon
```

After switching, restart your server to apply the changes.

#### Option 2: Manual Configuration

Alternatively, you can manually edit your `.env` file:

1. Open your `.env` file
2. Set `USE_NEON_DB=true` to use NeonDB (cloud)
3. Set `USE_NEON_DB=false` to use local PostgreSQL
4. Restart your server

This allows you to develop locally with PostgreSQL and deploy to production with NeonDB without changing your code.

5. Run the database migrations after setting up your database:
   ```bash
   npm run db:push
   ```

## Project Structure

```
├── client/          # Frontend React application
├── server/          # Backend Express server
├── shared/          # Shared types and schemas
└── public/          # Static assets
```

## Contributing

Feel free to open issues and submit pull requests to contribute to this project.

## License

MIT License

## Deploying to Netlify

This project can be deployed to Netlify for hosting. Follow these steps:

1. Create a Netlify account at [netlify.com](https://www.netlify.com/)
2. Install the Netlify CLI:
   ```bash
   npm install -g netlify-cli
   ```
3. Login to Netlify:
   ```bash
   netlify login
   ```
4. Initialize your site:
   ```bash
   netlify init
   ```
5. Set up environment variables in the Netlify dashboard:
   - `NEON_DATABASE_URL` - Your NeonDB connection string
   - `USE_NEON_DB` - Set to "true"
   - `PUSHER_APP_ID` - Your Pusher app ID
   - `PUSHER_KEY` - Your Pusher key
   - `PUSHER_SECRET` - Your Pusher secret
   - `PUSHER_CLUSTER` - Your Pusher cluster

6. Deploy your site:
   ```bash
   netlify deploy --prod
   ```

### Important Notes for Netlify Deployment

1. **Database Configuration**: This project uses NeonDB (serverless PostgreSQL) which works well with Netlify. Make sure you've set up your NeonDB database and provided the connection string as an environment variable.

2. **Real-time Communication**: Netlify Functions don't support WebSockets natively, so this project automatically uses Pusher for real-time communication when deployed to Netlify. Make sure you've set up all Pusher environment variables.

3. **Connection Status**: The chat interface shows a connection indicator that displays whether you're connected via Pusher or WebSockets.

4. **Hybrid Mode**: The application can fall back to HTTP polling if both WebSockets and Pusher are unavailable, ensuring chat functionality works in all environments.

5. **Function Timeout**: Netlify Functions have a timeout limit (default 10 seconds). Make sure your database operations complete within this timeframe.

6. **Cold Starts**: Serverless functions experience "cold starts" when they haven't been used recently. The first request might be slower than subsequent ones.
