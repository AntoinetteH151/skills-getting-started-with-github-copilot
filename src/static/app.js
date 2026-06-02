document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  let lastRemoval = null;
  let messageTimer = null;

  function showMessage(text, type = "info", undoData = null) {
    lastRemoval = undoData;
    if (messageTimer) {
      clearTimeout(messageTimer);
    }

    if (undoData) {
      messageDiv.innerHTML = `
        <span>${text}</span>
        <button type="button" class="undo-btn">Undo</button>
      `;
    } else {
      messageDiv.textContent = text;
    }

    messageDiv.className = type;
    messageDiv.classList.remove("hidden");

    messageTimer = setTimeout(() => {
      messageDiv.classList.add("hidden");
      lastRemoval = null;
    }, 5000);
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message and reset activity selector
      activitiesList.innerHTML = "";
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        const participantItems = details.participants.length
          ? details.participants.map((email) => `
              <li class="participant-item">
                <span class="participant-email">${email}</span>
                <button
                  type="button"
                  class="remove-participant-btn"
                  data-activity="${name}"
                  data-email="${email}"
                  aria-label="Remove ${email}">
                  &times;
                </button>
              </li>
            `).join("")
          : "<li class=\"participant-item empty\">No participants yet</li>";

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-section">
            <p><strong>Participants:</strong></p>
            <ul class="participants-list">
              ${participantItems}
            </ul>
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        signupForm.reset();
        await fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to sign up. Please try again.", "error");
      console.error("Error signing up:", error);
    }
  });

  activitiesList.addEventListener("click", async (event) => {
    const deleteButton = event.target.closest(".remove-participant-btn");
    if (!deleteButton) {
      return;
    }

    const activity = deleteButton.dataset.activity;
    const email = deleteButton.dataset.email;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/participants?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();
      if (response.ok) {
        showMessage(result.message, "success", { activity, email });
        await fetchActivities();
      } else {
        showMessage(result.detail || "Unable to remove participant.", "error");
      }
    } catch (error) {
      showMessage("Failed to remove participant. Please try again.", "error");
      console.error("Error removing participant:", error);
    }
  });

  messageDiv.addEventListener("click", async (event) => {
    if (!event.target.matches(".undo-btn") || !lastRemoval) {
      return;
    }

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(lastRemoval.activity)}/signup?email=${encodeURIComponent(lastRemoval.email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();
      if (response.ok) {
        showMessage(`Restored ${lastRemoval.email} to ${lastRemoval.activity}.`, "success");
        await fetchActivities();
      } else {
        showMessage(result.detail || "Unable to undo removal.", "error");
      }
    } catch (error) {
      showMessage("Failed to undo removal. Please try again.", "error");
      console.error("Error undoing participant removal:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
