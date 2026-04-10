# SmashScore - Badminton Tournament Tracker

**Demo Video**: [Watch on YouTube](https://youtu.be/gf38XfZbNDs)

SmashScore is a sleek, completely offline, and database-free single-page application built using pure HTML, Vanilla CSS, and Vanilla JavaScript. It allows users to easily track badminton matches, keep score according to standard badminton rules, and manage a tournament leaderboard seamlessly within their browser.

## Features

- **Tournament Manager**: Create a round-robin schedule by adding players. It automatically sets up matches between all registered players.
- **Quick Matches**: Want to track a spontaneous game without officially recording it in the tournament structure? You can instantly start an unranked Quick Match and assign categories (like Men's Singles, Women's Doubles, Mixed Doubles, etc.).
- **Live Scoreboard**: Automatically enforces Badminton's scoring rules.
  - Matches are typically Best of 3 sets. 
  - Standard 21-points-to-win logic.
  - Requires winning by 2 points (Deuce handling).
  - Capped automatically at 30 points.
- **Rankings / Leaderboard**: An automatically computed table that intelligently ranks players. The priority for rankings falls sequentially on: Matches Won, Set differential, and Point differentials.
- **Offline Data Storage**: Works entirely offline natively in your browser using `localStorage`. 
- **JSON Import / Export**: Avoid losing data purely to a browser clear cache! You can natively download your active state as a JSON file and upload it later to pick up right where you left off. 

## Beautiful UI

Built focusing entirely on a premium **Glassmorphism** styling:
- Dark aesthetic layout with deep blues/purples and radial gradients.
- Micro-animations that highlight game ticks and state transitions. 
- Fully responsive across Desktop and Mobile viewings.

---

## How to Run 

Since the app has **zero backend dependencies**, it can be opened easily using any modern browser in seconds without the need for installing complex Node or Python packages. 

**Option 1: Just Double Click**
Navigate into the `badminton-scorer` folder on your file explorer and simply double-click the `index.html` file to open it directly in Chrome/Edge/Firefox.

**Option 2: Running a Local Python Server**
Open your terminal in the `badminton-scorer` folder, then run the native Python module server:
```bash
python -m http.server 8080
```
Then visit `http://localhost:8080/` in your browser. 
