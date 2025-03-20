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
- Real-time: WebSocket

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

### Option 1: Using NeonDB (Cloud)
1. Sign up for a free account at [NeonDB](https://neon.tech)
2. Create a new PostgreSQL database
3. Copy your connection string
4. Create a `.env` file in the project root with:
   ```
   DATABASE_URL=your_neon_database_url_here
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
4. Create a `.env` file in the project root with:
   ```
   DATABASE_URL=postgresql://postgres:your_password@localhost:5432/buzzy_chat
   ```
5. Run the database migrations:
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
