import express from 'express';
import { WebSocketServer } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';

// Initialize express app
const app = express();
const port = 80;

// Get the current directory path using `import.meta.url`
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Store clients and their names
const clients = new Map(); // A map to track clients by their names

// Store all messages globally (to be sent once to new clients)
const allMessages = []; // Store all messages here

// Serve static files (like HTML, CSS, JS) from the 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// Serve the main HTML page when visiting the root URL
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Create an HTTP server
const server = app.listen(port, () => {
  console.log(`Server is listening on http://localhost:${port}`);
});

// Create a WebSocket server that uses the HTTP server
const wss = new WebSocketServer({ server });

wss.on('connection', (ws, req) => {
  // Parse the query parameters from the WebSocket connection request URL
  const url = new URL(req.url, `http://${req.headers.host}`);
  const name = url.searchParams.get('name');

  // Validate the "name" query parameter
  if (!name) {
    ws.close(4000, 'Name parameter is required.');
    return;
  }

  // Ensure the name is unique
  if (clients.has(name)) {
    ws.close(4001, 'Name must be unique.');
    return;
  }

  // Add the new client to the map
  clients.set(name, ws);
  console.log(`New client connected with name: ${name}`);

  // Send entire chat history to the new client (only once)
  ws.send(JSON.stringify({
    type: 'chat-history',
    messages: allMessages, // Send the complete chat history
  }));

  // Notify other clients that a new client has connected
  broadcastMessage({ type: 'user-join', name });

  // Handle messages received from clients
  ws.on('message', (clientMessage) => {
    try {
      // Create a message object
      const messageData = {
        type: 'user-message',
        sender: name,
        message: clientMessage.toString(),
      };

      // Store the message in the global chat history
      allMessages.push(messageData);

      // Broadcast the message to all clients
      broadcastMessage(messageData);
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });

  // Handle client disconnection
  ws.on('close', () => {
    console.log(`${name} disconnected`);
    clients.delete(name);
    broadcastMessage({ type: 'user-left', name });
  });

  // Handle WebSocket errors
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Function to broadcast a message to all clients
function broadcastMessage(message) {
  const messageString = JSON.stringify(message); // Ensure the message is a stringified JSON object
  clients.forEach((clientWs) => {
    if (clientWs.readyState === clientWs.OPEN) {
      clientWs.send(messageString);
    }
  });
}
