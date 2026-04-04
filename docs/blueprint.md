# **App Name**: INTRA SYNTAX CRYPTIC

## Core Features:

- Secure Team Authentication: Enables teams to log in securely using Firebase Authentication with custom tokens, protecting access to hunt levels.
- Two-Factor Admin Access: Provides a separate, secure login process for administrators, enforcing mandatory TOTP 2FA before dashboard access.
- Dynamic Hunt Progression: Manages the display of hunt levels, processes answer submissions, provides immediate feedback, and tracks team progress in Firestore.
- Real-time Leaderboard Display: Presents an automatically refreshing, live ranking of all participating teams based on their current level and solve times from Firestore.
- Admin Hint Control Tool: An administrative interface that allows the creation and manual release of hints for specific levels, updating their status in Firestore.
- Admin Penalty & Flagging Tool: Empowers administrators to apply time penalties to teams and flag suspicious activities for review, with data stored in Firestore.
- Activity Logging and Monitoring: Records and displays a detailed log of all administrator actions and system events for comprehensive oversight and auditing via Firestore.

## Style Guidelines:

- Primary color: A vibrant 'Space Violet' (#7C5CFF) is chosen for its futuristic and intellectual qualities, making interactive elements stand out against the dark backdrop. This color also serves as the single accent color for the application.
- Background color: A deep 'Abyss Charcoal' (#0A0A0A) establishes a dark, minimal, and immersive environment, reducing distraction and enhancing focus on the cryptic content.
- Surface colors: Subtle gradations of dark gray—'Shadow Gray' (#111111) and 'Mist Gray' (#1A1A1A)—are used for card backgrounds and distinct UI sections, providing clear visual hierarchy without introducing additional hues.
- Headline and Body text font: 'Inter' (sans-serif) for its modern, clean, and highly readable characteristics, aligning with a precise and distraction-free interface.
- Use minimalist, outline-style icons with a geometric touch, ensuring clarity and unobtrusiveness in the dark, cryptic theme.
- Layout employs an 8px grid system for consistent spacing and alignment. Key interactive elements feature 12px rounded corners. Specific layouts include centered cards for login, a full-screen centered design for the home page, and a dynamic 'bento grid' layout for the admin dashboard to maximize content visibility and usability.
- Subtle, low-motion transitions incorporating fade and scale effects are used exclusively to ensure a fast, fluid, and non-distracting user experience, especially during level transitions.