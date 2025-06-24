// public/js/app.js

// This event listener is the key to making your buttons work.
// It waits until the entire HTML page is loaded before trying to find and activate the buttons.
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM fully loaded. Initializing Vāṇi landing page script.");

  // Dynamically import Firebase modules. This is a modern approach.
  Promise.all([
    import("https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js"),
    import("https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js"),
  ])
    .then(
      ([
        { initializeApp },
        { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup },
      ]) => {
        // -------------------
        // FIREBASE CONFIGURATION
        // -------------------
        const firebaseConfig = {
          apiKey: "AIzaSyBykquirDMg5oE4z7dZgP359yyci4ij8Us",
          authDomain: "vani-ai-3d2c0.firebaseapp.com",
          projectId: "vani-ai-3d2c0",
          storageBucket: "vani-ai-3d2c0.firebasestorage.app",
          messagingSenderId: "428459478350",
          appId: "1:428459478350:web:31dedd6e356b326e52e21f",
          measurementId: "G-R811MW3SVB",
        };

        // Initialize Firebase and Authentication
        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        const provider = new GoogleAuthProvider();

        // -------------------
        // DOM ELEMENT SELECTION
        // -------------------
        const loginButtons = document.querySelectorAll(".login-btn");
        const recordBtn = document.getElementById("recordBtn");
        const userCommandText = document.getElementById("userCommandText");

        // -------------------
        // AUTHENTICATION LOGIC
        // -------------------

        /**
         * Handles the Google Sign-In popup flow.
         */
        const signInWithGoogle = () => {
          signInWithPopup(auth, provider)
            .then((result) => {
              console.log("Successfully signed in!", result.user);
              // On success, redirect the user to the full-screen assistant page.
              window.location.href = "/assistant.html";
            })
            .catch((error) => {
              console.error("Login Error:", error.message);
              alert(`Login Error: ${error.message}`);
            });
        };

        // Attach the sign-in function to all login buttons
        loginButtons.forEach((button) => {
          button.addEventListener("click", signInWithGoogle);
        });

        // -------------------
        // WEB SPEECH API LOGIC
        // -------------------
        const SpeechRecognition =
          window.SpeechRecognition || window.webkitSpeechRecognition;

        if (SpeechRecognition && recordBtn) {
          const recognition = new SpeechRecognition();
          recognition.continuous = false;
          recognition.lang = "en-US";

          // This function runs when speech is successfully recognized
          recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            if (userCommandText)
              userCommandText.textContent = `Processing: "${transcript}"`;
            // Send the recognized text to our backend server
            sendCommandToServer(transcript);
          };

          recognition.onend = () => {
            if (recordBtn) {
              recordBtn.disabled = false;
              recordBtn.innerHTML = `<i class="fas fa-microphone-alt"></i> Use Voice Command`;
            }
          };

          recognition.onerror = (event) => {
            console.error("Speech Recognition Error", event.error);
            if (userCommandText)
              userCommandText.textContent =
                "Sorry, I didn't catch that. Please try again.";
            if (recordBtn) recordBtn.disabled = false;
          };

          // This handles the click on the voice button
          recordBtn.addEventListener("click", () => {
            if (!auth.currentUser) {
              alert("Please sign in first to use voice commands.");
              // For a better user experience, we can also trigger the sign-in flow directly
              signInWithGoogle();
              return;
            }
            recordBtn.disabled = true;
            recordBtn.textContent = "Listening...";
            recognition.start();
          });

          // Check login state to enable/disable the voice button
          onAuthStateChanged(auth, (user) => {
            if (recordBtn) recordBtn.disabled = !user;
          });
        } else {
          if (recordBtn) recordBtn.style.display = "none";
        }

        /**
         * Sends the recognized voice command to our backend server.
         */
        async function sendCommandToServer(command) {
          const user = auth.currentUser;
          if (!user) return;

          try {
            const idToken = await user.getIdToken(true);
            const response = await fetch("/api/start-task", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ userCommand: command, idToken: idToken }),
            });

            if (!response.ok) {
              throw new Error(
                `Server responded with status: ${response.status}`
              );
            }

            // If successful, redirect to the assistant page to see the agent work.
            window.location.href = "/assistant.html";
          } catch (error) {
            console.error("Failed to send command:", error);
            if (userCommandText)
              userCommandText.textContent =
                "Error: Could not connect to the server.";
          }
        }
      }
    )
    .catch((error) => {
      console.error("Error loading Firebase modules:", error);
    });
});
