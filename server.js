// server.js

// -------------------
// 1. IMPORT LIBRARIES
// -------------------
const express = require("express");
const path = require("path");
const admin = require("firebase-admin");
const axios = require("axios");
const qs = require("querystring"); // A built-in library for formatting data
require("dotenv").config();

// -------------------
// 2. INITIALIZE APP & LOAD SECRETS
// -------------------
const app = express();
const port = 3000;

const OMNI_API_KEY = process.env.OMNI_API_KEY;
const OMNI_API_URL = "https://api.omnidim.io/v1/call/dispatch";

// Load Twilio credentials from the .env file
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

if (!OMNI_API_KEY || !TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
  console.error(
    "\nFATAL ERROR: A required key is missing from your .env file."
  );
  process.exit(1);
}

const serviceAccount = require("./vani-ai-3d2c0-firebase-adminsdk-fbsvc-82535328f2.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

// -------------------
// 3. MIDDLEWARE & ROUTES
// -------------------
app.use(express.json());
app.use(express.static("public"));

app.get("/", (req, res) =>
  res.sendFile(path.join(__dirname, "public", "index.html"))
);
app.get("/dashboard", (req, res) =>
  res.sendFile(path.join(__dirname, "public", "dashboard.html"))
);

app.post("/api/start-task", async (req, res) => {
  const { userCommand, idToken } = req.body;
  if (!userCommand || !idToken)
    return res.status(400).json({ message: "Missing info." });

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const uid = decodedToken.uid;
    console.log(`Verified command: "${userCommand}" from user: ${uid}`);

    const omniResponse = await dispatchOmniTask(userCommand, uid);
    const taskId = omniResponse.call_sid || `task_${Date.now()}`;
    await logToFirestore(
      taskId,
      uid,
      userCommand,
      `Task dispatched to Vani AI agent.`
    );

    res.status(201).json({ message: "Task dispatched!", taskId });
  } catch (error) {
    console.error(
      "API Error in /start-task:",
      error.response ? error.response.data : error.message
    );
    res.status(500).json({ message: "Failed to dispatch task." });
  }
});

// --- NEW ROUTE FOR SENDING SMS ---
app.post("/api/send-sms", async (req, res) => {
  const { to, body } = req.body;
  console.log(`Received request to send SMS to: ${to}`);

  // This is the URL for Twilio's API
  const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;

  // This is the data Twilio expects, formatted correctly
  const data = qs.stringify({
    To: to,
    From: TWILIO_PHONE_NUMBER,
    Body: body,
  });

  // This creates the Basic Authentication header
  const authToken = Buffer.from(
    `${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`
  ).toString("base64");

  try {
    await axios.post(twilioUrl, data, {
      headers: {
        Authorization: `Basic ${authToken}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });
    console.log("SMS sent successfully via Twilio.");
    res.status(200).json({ message: "SMS sent successfully!" });
  } catch (error) {
    console.error(
      "Twilio API Error:",
      error.response ? error.response.data : error.message
    );
    res.status(500).json({ message: "Failed to send SMS." });
  }
});

// -------------------
// 4. HELPER FUNCTIONS
// -------------------
async function dispatchOmniTask(prompt, userId) {
  // Using your new Agent ID
  const agentId = 2092;
  console.log(`Dispatching prompt to agent ${agentId}...`);

  const payload = {
    agent_id: agentId,
    prompt: prompt,
    caller_id: "Vani AI",
    metadata: { originating_user_id: userId },
  };
  const headers = { Authorization: `Bearer ${OMNI_API_KEY}` };
  const response = await axios.post(OMNI_API_URL, payload, { headers });
  console.log("Omni API Response:", response.data);
  return response.data;
}

async function logToFirestore(taskId, userId, command, initialLog) {
  const taskRef = db.collection("tasks").doc(taskId);
  await taskRef.set({
    userId: userId,
    command: command,
    status: "dispatched",
    createdAt: new Date().toISOString(),
    logs: [{ timestamp: new Date(), message: initialLog }],
  });
}

// -------------------
// 5. START THE SERVER
// -------------------
app.listen(port, () => {
  console.log(`Vāṇi server is running. Open http://localhost:${port}`);
});
