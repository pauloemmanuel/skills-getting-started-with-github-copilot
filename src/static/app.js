document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Helper to avoid inserting raw HTML from user data
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      // Reset activity select (keep placeholder option)
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        // Build participants HTML
          const participants = Array.isArray(details.participants) ? details.participants : [];

          activityCard.innerHTML = `
            <h4>${escapeHtml(name)}</h4>
            <p>${escapeHtml(details.description)}</p>
            <p><strong>Schedule:</strong> ${escapeHtml(details.schedule)}</p>
            <p><strong>Availability:</strong> <span class="spots-left">${spotsLeft}</span> spots left</p>
          `;

          // Create participants block as DOM elements so we can attach handlers
          const participantsDiv = document.createElement("div");
          participantsDiv.className = "participants";

          const title = document.createElement("h5");
          title.className = "participants-title";
          title.textContent = "Participants";
          participantsDiv.appendChild(title);

          if (participants.length > 0) {
            const ul = document.createElement("ul");
            ul.className = "participants-list";

            participants.forEach((p) => {
              const li = document.createElement("li");
              li.className = "participant-item";

              const span = document.createElement("span");
              span.textContent = p;

              const btn = document.createElement("button");
              btn.className = "delete-participant";
              btn.type = "button";
              btn.title = "Unregister";
              btn.dataset.activity = name;
              btn.dataset.email = p;
              btn.innerHTML = "&times;";

              li.appendChild(span);
              li.appendChild(btn);
              ul.appendChild(li);
            });

            participantsDiv.appendChild(ul);
          } else {
            const p = document.createElement("p");
            p.className = "no-participants";
            p.textContent = "No participants yet";
            participantsDiv.appendChild(p);
          }

          activityCard.appendChild(participantsDiv);

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
        messageDiv.textContent = result.message;
        messageDiv.className = "message success";
        signupForm.reset();

        // Refresh activities to show newly-registered participant
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "message error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Delegate click events for delete buttons
  activitiesList.addEventListener("click", async (event) => {
    const target = event.target;
    if (!target.classList.contains("delete-participant")) return;

    const activityName = target.dataset.activity;
    const email = target.dataset.email;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activityName)}/participants?email=${encodeURIComponent(email)}`,
        { method: "DELETE" }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "message success";
      } else {
        messageDiv.textContent = result.detail || "Failed to unregister";
        messageDiv.className = "message error";
      }

      messageDiv.classList.remove("hidden");

      // Refresh the activities list to reflect change
      fetchActivities();

      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 4000);
    } catch (err) {
      messageDiv.textContent = "Failed to unregister. Please try again.";
      messageDiv.className = "message error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering:", err);
    }
  });

  // Initialize app
  fetchActivities();
});
