🐍 TileSnake.io
Conquer Territory. Outsmart Rivals. Dominate the Arena!

TileSnake.io is a fast-paced multiplayer territory-control game where players compete to expand their territory, eliminate opponents, capture powerful towers, and climb the leaderboard.

Venture outside your territory, create trails, and return safely to claim new land. But be careful! Your trail is vulnerable, and one wrong move could cost you the entire game.

🎮 Features
🌍 Real-Time Multiplayer – Battle against other players online.
🗺️ Territory Expansion – Create trails and capture new areas.
⚔️ Competitive Combat – Cut enemy trails to eliminate opponents.
⚡ Speed Boosts – Collect power-ups to increase your movement speed.
🛡️ Shields – Protect yourself with defensive power-ups.
🏰 Tower Capture – Surround towers with your territory to claim them and trigger powerful territory expansions.
🔥 Overdrive – Earn kills to activate powerful abilities.
🏆 Live Leaderboard – Compete for the largest territory and most kills.
👥 Play With Friends – Create multiplayer rooms and share invitation links.
📱 Mobile Support – Play using touchscreen swipe controls.
⚙️ Customizable Settings – Adjust UI size, minimap size, kill feed, and leaderboard visibility.
💾 Progress Tracking – Your best territory percentage is saved locally.
🕹️ How to Play
Enter your player name.
Press PLAY to join a multiplayer arena.
Leave your territory to create a trail.
Return safely to your territory to capture the enclosed area.
Cut opponents' trails to eliminate them.
Avoid enemies and protect your own trail.
Collect power-ups and capture towers.
Expand your territory and climb the leaderboard!
Controls
Action	Control
Move	WASD / Arrow Keys
Stop	Space
Change Direction	Opposite direction
Mobile Movement	Swipe
Stop on Mobile	Tap
Settings	P
🏰 Special Abilities
Ability	Description
⚡ Speed	Temporarily increases movement speed.
🛡️ Shield	Provides protection against attacks.
🔥 Overdrive	Earned through kills.
🏰 Towers	Capture towers to expand your territory over a radius.
🌐 Multiplayer

TileSnake.io supports online multiplayer through WebSockets.

Players can:

Join available multiplayer rooms.
Create or join rooms through invitation links.
Play with friends.
Automatically reconnect after connection interruptions.
Rejoin their previous lobby when possible.
Server Configuration

The game connects to the multiplayer server using a WebSocket URL.

Default production server:

js
wss://tilesnake-io.onrender.com


You can override the server using the ws URL parameter:

text
?ws=ws://localhost:8080

🛠️ Technologies Used
HTML5 – Game structure.
CSS3 – Interface and visual styling.
JavaScript – Game logic and rendering.
HTML5 Canvas – Real-time game graphics.
WebSockets – Multiplayer communication.
CrazyGames SDK v3 – Platform integration, advertisements, and multiplayer invitations.
LocalStorage – Player settings and local progress.
🚀 Getting Started
Requirements
A modern web browser.
A running TileSnake.io WebSocket multiplayer server.
Installation
Clone the repository:
bash
git clone YOUR_REPOSITORY_URL

Open the project directory:
bash
cd TileSnake.io

Start your multiplayer WebSocket server on port 8080.
Open the game using a local web server and connect to your server.

For example:

text
http://localhost:8000

🎨 Game Design

TileSnake.io features a futuristic neon aesthetic with:

Glowing player colours.
Dynamic territory effects.
Animated power-ups.
Interactive minimap.
Real-time leaderboard.
Smooth camera movement.
Responsive interface for desktop and mobile.
📸 Screenshots

Add screenshots of your game here:

md
![TileSnake.io Gameplay](screenshots/gameplay.png)
![TileSnake.io Menu](screenshots/menu.png)

📜 License

Add your preferred open-source license here.

🐍 TileSnake.io

Think fast. Draw your trail. Claim the territory.

Can you conquer the arena and become the ultimate TileSnake.io champion?

⭐ If you enjoy the project, consider giving the repository a star!
