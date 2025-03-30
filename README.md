# Time Tracking and Member Management Application

A modern time tracking application built with React, TypeScript, and Firebase.

## Features

- Track working hours with start/stop functionality
- Manage members and their roles
- Reserve boats for members
- Add descriptions and project tags to time entries
- View history of time entries
- User authentication
- Responsive design

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a Firebase project and enable Authentication and Firestore
4. Create a `.env` file in the root directory with your Firebase configuration:
   ```
   REACT_APP_FIREBASE_API_KEY=your_api_key
   REACT_APP_FIREBASE_AUTH_DOMAIN=your_auth_domain
   REACT_APP_FIREBASE_PROJECT_ID=your_project_id
   REACT_APP_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   REACT_APP_FIREBASE_APP_ID=your_app_id
   ```
5. Start the development server:
   ```bash
   npm start
   ```

## Deployment

1. Update the `homepage` field in `package.json` with your GitHub Pages URL
2. Build the project:
   ```bash
   npm run build
   ```
3. Deploy to GitHub Pages:
   ```bash
   npm run deploy
   ```

## Technologies Used

- React with TypeScript
- Firebase (Authentication & Firestore)
- Material-UI
- date-fns
