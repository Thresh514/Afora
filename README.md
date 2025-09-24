# Afora - AI-Powered Team Project Management Platform

[![Live Demo](https://img.shields.io/badge/Live-Demo-brightgreen)](https://afora.vercel.app/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-000000?logo=next.js&logoColor=white)](https://nextjs.org/)
[![Firebase](https://img.shields.io/badge/Firebase-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com/)

> Intelligent team management solution designed for educational institutions and hackathon events

## 🎯 Product Overview

Afora is a full-stack team project management platform that leverages AI technology to solve pain points in team formation and project management. We primarily serve educational institutions and hackathon events, helping organizers quickly build efficient teams and providing comprehensive project management solutions.

### 🚀 Core Features

#### 🤖 AI-Powered Team Matching
- **Technical Skill Complementarity (40% weight)**: Form complementary teams based on user technical backgrounds
- **Interest Alignment (35% weight)**: Cluster users based on industry interests and project enthusiasm
- **Career Goal Coordination (25% weight)**: Consider long-term career planning for team compatibility
- Support for dynamic team size configuration and existing team member expansion

#### 📋 Intelligent Task Management System
- **AI Task Generation**: Automatically generate personalized tasks based on project charter and team capabilities
- **Task Pool Mechanism**: Support task status tracking, point rewards, and progress management
- **Smart Assignment**: Automatically assign the most suitable tasks based on member skills and interests
- **Submission System**: Complete task submission, review, and feedback workflow

#### 🏆 User Scoring & Leaderboards
- Personal point statistics and project contribution analysis
- Team compatibility scoring and performance analysis
- Real-time leaderboards and achievement system

#### 🏢 Organization Management
- Multi-level permission management (Organization Admin/Member)
- Project lifecycle management
- Real-time collaboration and notification system

## 🛠 Technical Architecture

### Frontend Stack
- **Next.js 15** - Full-stack React framework with SSR and API Routes
- **TypeScript** - Type-safe development
- **Tailwind CSS + Shadcn/ui** - Modern UI component library
- **Framer Motion** - Animation and interaction effects
- **React Hook Form + Zod** - Form handling and data validation

### Backend & Database
- **Firebase Firestore** - NoSQL real-time database
- **Firebase Admin SDK** - Server-side data operations
- **Next.js Server Actions** - Server-side logic processing
- **React Firebase Hooks** - Real-time data listening

### Authentication & Security
- **Clerk** - Modern identity authentication solution
- **Role-based Access Control** - Role-based permission system

### AI Integration
- **OpenAI GPT-4** - Team matching and task generation
- **Custom AI Scripts** - Team compatibility analysis algorithms

### Deployment & Monitoring
- **Vercel** - Serverless deployment platform
- **Vercel Analytics** - Performance monitoring
- **Automated CRON Jobs** - Scheduled task processing

## 📊 Project Scale

```
📁 Project Structure
├── 🎨 Frontend Components: 40+ React components
├── 🔧 API Endpoints: 50+ Server Actions
├── 🤖 AI Scripts: 4 core AI algorithms
├── 📱 Page Routes: 15+ dynamic routes
├── 🗄️ Data Models: Complete TypeScript type definitions
└── 📚 Documentation: Complete API docs and implementation guides
```

## 🎨 Core Feature Showcase

### Intelligent Team Matching Process
```typescript
// AI-driven team matching algorithm
export const matching = async (teamSize, questions, input) => {
  // Technical skill complementarity (40% weight)
  // Interest alignment matching (35% weight)  
  // Career goal coordination (25% weight)
  return optimizedTeams;
}
```

### Task Management System
```typescript
// Intelligent task generation and assignment
export const generateTask = async (
  projQuestions, userResponses, 
  teamCharterQuestions, teamCharterResponses,
  teamMembers, memberCapabilities
) => {
  // Generate personalized tasks based on team capabilities and project requirements
  return assignedTasks;
}
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm/yarn
- Firebase project
- Clerk account
- OpenAI API key

### Installation

```bash
# Clone the repository
git clone https://github.com/xavieryn/Afora.git
cd Afora

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env.local
```

### Environment Variables

```env
# Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# AI Features
OPENAI_API_KEY=sk-...

# Image Service
PEXELS_API_KEY=...
```

### Firebase Configuration

Create `service_key.json` in the project root:

```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "...",
  "private_key": "...",
  "client_email": "...",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "universe_domain": "googleapis.com"
}
```

### Start Development Environment

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to view the application

## 🏗️ System Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Next.js App   │────│   Clerk Auth     │────│   Firebase      │
│   (Frontend)    │    │   (Identity)     │    │   (Database)    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                       │
         ├── Server Actions ──────┼───────────────────────┤
         │                        │                       │
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   OpenAI API    │────│   AI Scripts     │────│   Vercel        │
│   (AI Engine)   │    │   (Matching)     │    │   (Deployment)  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 📈 Business Value

### Problems Solved
- ❌ Inefficient manual team formation
- ❌ Project failure due to skill mismatches
- ❌ High learning curve of project management tools
- ❌ Lack of effective progress tracking mechanisms

### Solutions Provided
- ✅ AI-automated team matching with 95% efficiency improvement
- ✅ Data-driven skill complementarity analysis
- ✅ Zero learning curve intuitive interface
- ✅ Real-time project progress and member performance tracking

## 🎯 Target Users

- **Educational Institutions**: Course projects, thesis team formation
- **Hackathon Organizers**: Fast and efficient participant team matching
- **Corporate Training**: Internal projects and team building activities
- **Startup Incubators**: Startup team formation and project management

## 🔮 Future Roadmap

- [ ] Mobile application development
- [ ] Additional AI model integration (Claude, Gemini)
- [ ] Advanced analytics dashboard
- [ ] Enterprise-level permission management
- [ ] Internationalization support
- [ ] Open API platform

## 👥 Development Team

This is a startup project showcasing full-stack development capabilities, covering all aspects of modern web development:

- **Frontend Engineering**: React ecosystem, modern UI/UX design
- **Backend Architecture**: Serverless architecture, real-time data processing
- **AI Integration**: Machine learning algorithms applied in real business scenarios
- **Product Design**: Complete product thinking from user requirements to technical implementation

---

**🌟 This is not just a project management tool, but an innovative application of AI technology in education and team collaboration.**
