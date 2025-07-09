# TechOps Platform

A comprehensive WordPress login testing automation platform built with Next.js and Playwright.

## 🚀 Overview

This project automates the process of testing WordPress admin dashboard login functionality using Playwright. It provides a web interface for running tests, viewing results, and managing test configurations.

## ✨ Features

- **Automated WordPress Login Testing** - Reliable testing of WordPress admin access
- **Web-Based Dashboard** - Modern UI for running tests and viewing results
- **Screenshot Capture** - Automatic success/failure screenshot documentation (stored on Cloudinary)
- **Real-time Logging** - Live test execution logs and detailed error reporting
- **Test History** - Track test results and statistics over time
- **Responsive Design** - Works on desktop and mobile devices
- **Dark Mode Support** - Automatic theme switching based on system preferences

## 🛠️ Technology Stack

- **Frontend**: Next.js 15 with App Router, React 19, Tailwind CSS v4
- **Testing**: Playwright with Chromium browser automation
- **Database**: MongoDB (via Mongoose)
- **Image Storage**: Cloudinary
- **Styling**: Tailwind CSS with custom design system

## 📋 Prerequisites

- Node.js 18.0 or higher
- npm or yarn package manager
- Git for version control
- MongoDB database (local or cloud)
- Cloudinary account for image storage

## 🚀 Quick Start

### 1. Installation

```bash
# Clone the repository
git clone <repository-url>
cd techops-platform

# Install dependencies
npm install

# Install Playwright browsers
npx playwright install
```

### 2. Environment Variables

Create a `.env.local` file in the root directory and add your MongoDB and Cloudinary credentials:

```
MONGODB_URI=your_mongodb_connection_string
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### 3. Running the Application

```bash
npm run dev
# Open http://localhost:3000 in your browser
```

## 📊 API Documentation

### POST `/api/test/login`
**Description:** Execute a WordPress login test with custom configuration.

**Request Body:**
```json
{
  "url": "https://your-wordpress-site.com/wp-admin",
  "username": "your-username",
  "password": "your-password",
  "timeout": 30000, // optional, default 30000
  "headless": true, // optional, default true
  "selectors": { ... }, // optional, default WordPress selectors
  "screenshots": { "fullPage": true } // optional
}
```

**Response:**
```json
{
  "success": true,
  "imageUrl": "https://res.cloudinary.com/.../screenshot.png",
  "publicId": "cloudinary_public_id",
  "dbId": "mongodb_object_id",
  "logs": [ ... ]
}
```

### GET `/api/test/results`
**Description:** Retrieve all test results and statistics.

**Response:**
```json
[
  {
    "type": "Success" | "Failure",
    "imageUrl": "https://res.cloudinary.com/.../screenshot.png",
    "publicId": "cloudinary_public_id",
    "timestamp": "2025-07-01T12:00:00.000Z",
    ...
  },
  ...
]
```

### GET `/api/test/screenshot/[filename]`
**Description:** (Legacy) Serve screenshot images by filename. (Now screenshots are stored on Cloudinary; use the `imageUrl` from results.)

## 🧪 How It Works

1. The frontend sends a POST request to `/api/test/login` with WordPress credentials and options.
2. The backend runs a Playwright login test, captures a screenshot, uploads it to Cloudinary, and stores the result in MongoDB.
3. The frontend displays the latest result and provides a reports page for all historical results.

## 📁 Project Structure

```
techops-platform/
├── app/                          # Next.js App Router
│   ├── api/                      # API routes
│   │   └── test/                 # Test-related endpoints
│   │       ├── login/route.js    # Login test execution
│   │       ├── results/route.js  # Test results API
│   │       └── screenshot/       # Screenshot serving
│   ├── components/               # React components
│   │   ├── TestRunner.js         # Test execution interface
│   │   └── TestResults.js        # Results display component
│   ├── globals.css               # Global styles
│   ├── layout.js                 # Root layout
│   └── page.js                   # Homepage
├── scripts/                      # Automation scripts
│   └── login-test.js             # WordPress login test script
├── test-results/                 # Test outputs (auto-generated)
├── public/                       # Static assets
├── package.json                  # Dependencies and scripts
└── README.md                     # Project documentation
```

## 🔒 Security Considerations

- **Credentials:** WordPress credentials are sent in the request body and not stored on the server.
- **Screenshots:** Images are stored securely on Cloudinary.
- **API:** All endpoints include proper error handling and status codes.

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Open an issue on GitHub
- Check the documentation
- Review existing issues and discussions

## 🗺️ Roadmap

- [ ] Multiple WordPress site support
- [ ] Test scheduling and automation
- [ ] Email notifications for test failures
- [ ] Database integration for persistent storage
- [ ] Advanced reporting and analytics
- [ ] CI/CD integration
- [ ] Multi-browser testing support
