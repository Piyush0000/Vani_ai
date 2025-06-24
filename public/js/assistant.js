// public/js/assistant.js

document.addEventListener("DOMContentLoaded", () => {
  console.log("Assistant page loaded. Initializing tap-to-speak script.");

  // Get references to the HTML elements
  const startBtn = document.getElementById("startBtn");
  const assistantStatusEl = document.getElementById("assistantStatus");
  const quoteDisplayEl = document.getElementById("quoteDisplay");

  if (!startBtn) {
    console.error("Could not find the start button.");
    return;
  }

  // This is the function that will activate the Omni agent
  const activateVani = () => {
    console.log("Activating Vāṇi...");

    // Check if the Omni widget is ready on the page
    if (
      window.OmniDimension &&
      typeof window.OmniDimension.startCall === "function"
    ) {
      // Activate the Omni Widget's own UI and speech recognition
      window.OmniDimension.startCall({});

      // Update our UI to show that the main agent is active
      if (assistantStatusEl)
        assistantStatusEl.textContent = "Connecting to Vāṇi...";
      if (quoteDisplayEl) quoteDisplayEl.style.display = "none"; // Hide the quote
    } else {
      // This error appears if the Omni script hasn't loaded yet
      if (assistantStatusEl)
        assistantStatusEl.textContent =
          "Omni Agent not ready. Please wait a moment and try again.";
      console.error(
        "OmniDimension widget or startCall function not found on window object."
      );
    }
  };

  // Attach the activation function to the click event of the main avatar button
  startBtn.addEventListener("click", activateVani);
});
