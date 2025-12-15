# English Sentences Study App

## Objective
This project is a web application designed to help users practice and improve their English pronunciation and memorization of sentences. It utilizes a flashcard system combined with speech recognition technology to verify pronunciation accuracy.

## Features
- **Study Mode**: Learn new sentences with their translations.
- **Review System**: A spaced repetition system with multiple levels to reinforce learning.
- **Speech Recognition**: Uses the Web Speech API to listen to the user's pronunciation and provide feedback.
- **Progress Tracking**: Dashboard to view study statistics and progress across different levels.
- **Auto-save**: Automatically tracks progress and promotes sentences to higher review levels upon successful recitation.

## Technologies Used
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Speech**: Web Speech API (Native Browser Support)

## Prerequisites
- Node.js (v18 or higher recommended)
- npm (Node Package Manager)
- A modern web browser with Web Speech API support (Chrome, Edge, Safari).

## Installation

1. Navigate to the project directory:
   ```bash
   cd english_phrases
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## Running the Application

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Open your browser and visit:
   ```
   http://localhost:3000
   ```

## Project Structure
- `app/`: Contains the application routes and pages (Dashboard, Study, Review).
- `components/`: Reusable UI components like FlashCard.
- `data/`: Contains the source data for sentences (`sentences.json`).
- `hooks/`: Custom React hooks, including `useSpeechRecognition`.
- `lib/`: Utility functions and local storage management.
- `types/`: TypeScript type definitions.

## Usage
1. **Dashboard**: View your current progress and select a mode.
2. **Study**: Click "Start Studying" to practice new sentences. Read the sentence aloud. If correct, it moves to the review queue.
3. **Review**: Select a specific level to review sentences you have already learned.
4. **Microphone**: Ensure your browser has permission to access the microphone.

---
*Note: This application relies on the browser's native speech recognition capabilities. Performance may vary depending on the browser and environment.*
# english-sentences-pronunciation
