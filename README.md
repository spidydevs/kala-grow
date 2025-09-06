# Kala-Grow

**Productivity Powerhouse Platform**

A comprehensive productivity and business management platform built with React, TypeScript, and Supabase.

## Features

- 🎯 **Task Management** - Advanced task tracking with AI assistance
- 📊 **Analytics & Reporting** - Comprehensive business analytics
- 💰 **Revenue Management** - Financial tracking and reporting
- 🏢 **CRM System** - Customer relationship management
- 🎮 **Gamification** - Points, levels, and achievement system
- 👥 **Enterprise Features** - Role-based access control and user management
- 🤖 **AI Assistant** - Intelligent productivity assistance
- 📱 **Responsive Design** - Works seamlessly across all devices

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **Styling**: Tailwind CSS + Radix UI
- **State Management**: React Query
- **Build Tool**: Vite
- **Type Checking**: TypeScript (Strict Mode)

## Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd kala-grow
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Add your Supabase credentials
   ```

4. **Start development server**
   ```bash
   pnpm dev
   ```

5. **Open your browser**
   ```
   http://localhost:5173
   ```

## Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm build:prod` - Build with production optimizations
- `pnpm lint` - Run ESLint
- `pnpm preview` - Preview production build

## Project Structure

```
kala-grow/
├── src/
│   ├── components/          # Reusable UI components
│   ├── pages/              # Page components
│   ├── services/           # API services
│   ├── hooks/              # Custom React hooks
│   ├── contexts/           # React contexts
│   ├── lib/                # Utility libraries
│   └── utils/              # Helper functions
├── supabase/
│   ├── functions/          # Edge Functions
│   └── migrations/         # Database migrations
├── public/                 # Static assets
└── ...config files
```

## Environment Variables

Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is proprietary software. All rights reserved.
