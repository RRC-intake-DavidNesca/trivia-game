/**
 * Initializes the Trivia Game 
*/

// Run setup after initial HTML is parsed.
document.addEventListener("DOMContentLoaded", function () {
    // Cache the trivia form for submit handling.
    const form = document.getElementById("trivia-form");
    // Cache the container that will receive question blocks.
    const questionContainer = document.getElementById("question-container");
    // Cache the New Player button for starting a fresh round.
    const newPlayerButton = document.getElementById("new-player");
    // Cache the Clear Scores button for wiping saved scores.
    const clearScoresButton = document.getElementById("clear-scores");
    // Cache the username input for prefill and persistence.
    const usernameInput = document.getElementById("username");
    // Cache the Top score summary box (added in Commit 9).
    const topScoreBox = document.getElementById("top-score");

    // Prefill username from localStorage if available.
    checkUsername();
    // Fetch and render 10 questions from the API.
    fetchQuestions();
    // Render any existing scores on load (sorted and with top highlight).
    displayScores();

    // Persist current username while typing for convenience.
    usernameInput.addEventListener("input", function () {
        // Read and trim the typed value.
        const value = (usernameInput.value || "").trim();
        // If non-empty, store it; otherwise clear the stored value.
        if (value) {
            // Save current user name to localStorage.
            localStorage.setItem("triviaCurrentUser", value);
        } else {
            // Remove stored name if field emptied.
            localStorage.removeItem("triviaCurrentUser");
        }
    });

    // Fetch questions and display them with a loader.
    /**
     * Fetches trivia questions from the API and displays them.
     */
    function fetchQuestions() {
        // Show loader; hide questions.
        showLoading(true); // Show loading state

        // Request 10 multiple-choice questions from Open Trivia DB.
        fetch("https://opentdb.com/api.php?amount=10&type=multiple")
            // Parse response as JSON.
            .then((response) => response.json())
            // Use parsed data to render questions.
            .then((data) => {
                // Insert questions into the container.
                displayQuestions(data.results);
                // Hide loader; show questions.
                showLoading(false); // Hide loading state
            })
            // Handle network or parse errors.
            .catch((error) => {
                // Log the error for debugging.
                console.error("Error fetching questions:", error);
                // Hide loader even if error occurred.
                showLoading(false); // Hide loading state on error
            });
    }

    // Toggle loader vs. question container visibility.
    /**
     * Toggles the display of the loading state and question container.
     *
     * @param {boolean} isLoading - Indicates whether the loading state should be shown.
     */
    function showLoading(isLoading) {
        // Select the loader element.
        const loadingEl = document.getElementById("loading-container");
        // Select the question container.
        const questionsEl = document.getElementById("question-container");
        // If loading, show loader and hide questions; else invert.
        if (isLoading) {
            // Reveal loader (per DOM/classList pattern from notes). :contentReference[oaicite:1]{index=1}
            loadingEl.classList.remove("hidden");
            // Hide questions during loading.
            questionsEl.classList.add("hidden");
        } else {
            // Hide loader when done.
            loadingEl.classList.add("hidden");
            // Show questions when ready.
            questionsEl.classList.remove("hidden");
        }
    }

    // Render the fetched questions into HTML.
    /**
     * Displays fetched trivia questions.
     * @param {Object[]} questions - Array of trivia questions.
     */
    function displayQuestions(questions) {
        // Clear any previously inserted questions.
        questionContainer.innerHTML = ""; // Clear existing questions
        // Add each question block with randomized answer order.
        questions.forEach((question, index) => {
            // Create a wrapper for the question and its options.
            const questionDiv = document.createElement("div");
            // Use a template string to insert prompt and options.
            questionDiv.innerHTML = `
                <p>${question.question}</p>
                ${createAnswerOptions(
                    question.correct_answer,
                    question.incorrect_answers,
                    index
                )}
            `;
            // Append the block to the main container.
            questionContainer.appendChild(questionDiv);
        });
    }

    // Build the radio inputs for answers (correct marked with data attribute).
    /**
     * Creates HTML for answer options.
     * @param {string} correctAnswer - The correct answer for the question.
     * @param {string[]} incorrectAnswers - Array of incorrect answers.
     * @param {number} questionIndex - The index of the current question.
     * @returns {string} HTML string of answer options.
     */
    function createAnswerOptions(
        correctAnswer,
        incorrectAnswers,
        questionIndex
    ) {
        // Merge correct and incorrect answers then shuffle.
        const allAnswers = [correctAnswer, ...incorrectAnswers].sort(
            () => Math.random() - 0.5
        );
        // Return label+radio markup; tag the correct answer.
        return allAnswers
            .map(
                (answer) => `
            <label>
                <input type="radio" name="answer${questionIndex}" value="${answer}" ${
                    answer === correctAnswer ? 'data-correct="true"' : ""
                }>
                ${answer}
            </label>
        `
            )
            // Concatenate into a single string.
            .join("");
    }

    // Wire up form submit, new-player, and clear-scores behaviors.
    form.addEventListener("submit", handleFormSubmit);
    // Start a fresh round when New Player is clicked.
    newPlayerButton.addEventListener("click", newPlayer);
    // Remove all saved scores when Clear Scores is clicked.
    clearScoresButton.addEventListener("click", clearScores);

    // Handle form submission: validate, score, persist, update UI.
    /**
     * Handles the trivia form submission.
     * @param {Event} event - The submit event.
     */
    function handleFormSubmit(event) {
        // Prevent page reload on submit.
        event.preventDefault();

        // Count the number of questions currently displayed.
        const totalQuestions = document.querySelectorAll(
            "#question-container > div"
        ).length;
        // Track correct answers.
        let score = 0;
        // Track unanswered questions.
        let unanswered = 0;

        // Evaluate each question’s selection.
        for (let i = 0; i < totalQuestions; i++) {
            // Build selector for the checked option of this question.
            const selector = `input[name="answer${i}"]:checked`;
            // Query for the user’s selection for this question.
            const selected = document.querySelector(selector);
            // If selected and marked correct, increment score; otherwise count unanswered.
            if (selected && selected.dataset && selected.dataset.correct === "true") {
                // Increase score for a correct answer.
                score++;
            } else if (!selected) {
                // Count unanswered to enforce completion.
                unanswered++;
            }
        }

        // If any question is unanswered, alert user and abort.
        if (unanswered > 0) {
            // Simple message asking the user to finish all items.
            alert("Please answer all questions before submitting the game.");
            // Stop here; do not persist or update the table.
            return;
        }

        // Read and trim the player’s name.
        const rawName = (usernameInput.value || "").trim();
        // Use a default label if blank.
        const playerName = rawName || "Anonymous";
        // If a real name was provided, remember it for next time.
        if (rawName) {
            // Persist current user in localStorage.
            localStorage.setItem("triviaCurrentUser", rawName);
        }

        // Generate a timestamp for this attempt.
        const nowTs = Date.now();

        // Get the table body to insert a transient immediate row (replaced by displayScores()).
        const tbody = document.querySelector("#score-table tbody");
        // Create a table row to show the result immediately.
        const row = document.createElement("tr");
        // Create the name cell for this row.
        const nameCell = document.createElement("td");
        // Put the player’s name into the cell.
        nameCell.textContent = playerName;
        // Create the score cell for this row.
        const scoreCell = document.createElement("td");
        // Show the “correct/total” summary.
        scoreCell.textContent = `${score}/${totalQuestions}`;
        // Create the date cell for this row.
        const dateCell = document.createElement("td");
        // Show a local date/time string for the attempt.
        dateCell.textContent = new Date(nowTs).toLocaleString();
        // Append name cell to the row.
        row.appendChild(nameCell);
        // Append score cell to the row.
        row.appendChild(scoreCell);
        // Append date cell to the row.
        row.appendChild(dateCell);
        // Append the row to the table body (will be refreshed below).
        tbody.appendChild(row);

        // Save the result to localStorage (JSON + storage patterns per module). :contentReference[oaicite:2]{index=2}
        saveScoreToStorage(playerName, score, totalQuestions, nowTs);
        // Re-render the scoreboard from storage (sorted and with top highlight).
        displayScores();

        // Show a result banner with percentage feedback.
        showResultBanner(playerName, score, totalQuestions);

        // Reveal New Player button for another round.
        newPlayerButton.classList.remove("hidden");
        // Disable submit to prevent duplicate submissions.
        document.getElementById("submit-game").disabled = true;
    }

    // Safely read scores from localStorage.
    function getScoresFromStorage() {
        // Read raw JSON from storage.
        const raw = localStorage.getItem("scores");
        // If nothing stored, return an empty list.
        if (!raw) {
            return [];
        }
        // Try to parse JSON; handle errors gracefully.
        try {
            // Convert text into an array of score objects.
            return JSON.parse(raw);
        } catch (e) {
            // Log invalid JSON and fall back to empty list.
            console.error("Invalid scores in storage:", e); // :contentReference[oaicite:3]{index=3}
            // Return safe default.
            return [];
        }
    }

    // Write scores array back to localStorage.
    function setScoresInStorage(scoresArray) {
        // Convert array to JSON string.
        const text = JSON.stringify(scoresArray); // :contentReference[oaicite:4]{index=4}
        // Store string under the "scores" key.
        localStorage.setItem("scores", text);
    }

    // Append a single score record into storage (accepting a timestamp).
    function saveScoreToStorage(name, correct, total, ts) {
        // Read current list of scores.
        const scores = getScoresFromStorage();
        // Build a record with name, counts, and provided timestamp (or now).
        const record = { name: name, correct: correct, total: total, ts: typeof ts === "number" ? ts : Date.now() };
        // Append record to in-memory list.
        scores.push(record);
        // Persist updated list.
        setScoresInStorage(scores);
    }

    // Render scoreboard from storage, apply sorting, and highlight top rows.
    function displayScores() {
        // Select table body to populate.
        const tbody = document.querySelector("#score-table tbody");
        // Clear existing rows to avoid duplicates.
        tbody.innerHTML = "";
        // Read saved scores from storage.
        const scores = getScoresFromStorage();

        // Make a copy and sort by highest percentage, then newest.
        const sorted = scores.slice().sort(function (a, b) {
            // Compute percentages (guard against divide-by-zero).
            const aPct = a && a.total ? a.correct / a.total : 0;
            const bPct = b && b.total ? b.correct / b.total : 0;
            // Primary sort: higher percentage first.
            if (bPct !== aPct) return bPct - aPct;
            // Secondary sort: newer timestamps first (missing ts -> 0).
            const aTs = typeof a.ts === "number" ? a.ts : 0;
            const bTs = typeof b.ts === "number" ? b.ts : 0;
            return bTs - aTs;
        });

        // Compute the top percentage (rounded for fairness with ties).
        let topPercent = null;
        // If we have any scores, compute the best percentage as an integer percent.
        if (sorted.length > 0) {
            // Determine best percent among all records.
            topPercent = Math.round(((sorted[0].total ? sorted[0].correct / sorted[0].total : 0) * 100));
        }

        // Track how many share the top percentage for the summary.
        let topCount = 0;

        // Render each row (name, score, date), marking top rows.
        sorted.forEach(function (s) {
            // Create a new table row for this record.
            const tr = document.createElement("tr");
            // Compute this record’s integer percent.
            const pct = Math.round(((s.total ? s.correct / s.total : 0) * 100));
            // If equals the best percent, add highlight class and count it.
            if (topPercent !== null && pct === topPercent) {
                // Add CSS class to visually highlight top row.
                tr.classList.add("top");
                // Increase count of top scorers.
                topCount++;
            }
            // Create cell for name.
            const tdName = document.createElement("td");
            // Put player’s name text.
            tdName.textContent = s.name;
            // Create cell for score summary.
            const tdScore = document.createElement("td");
            // Add “correct/total” text.
            tdScore.textContent = s.correct + "/" + s.total;
            // Create cell for human-readable date/time.
            const tdDate = document.createElement("td");
            // If timestamp present, format it; else show dash.
            tdDate.textContent = typeof s.ts === "number" ? new Date(s.ts).toLocaleString() : "—";
            // Append name cell to row.
            tr.appendChild(tdName);
            // Append score cell to row.
            tr.appendChild(tdScore);
            // Append date cell to row.
            tr.appendChild(tdDate);
            // Append completed row to table body.
            tbody.appendChild(tr);
        });

        // Update or hide the Top score summary box based on data presence.
        if (sorted.length === 0) {
            // If no scores, clear text and hide the box.
            topScoreBox.textContent = "";
            // Add hidden class so it doesn’t show.
            topScoreBox.classList.add("hidden");
        } else {
            // Build a summary message with percent and tie count.
            const label = topCount === 1 ? "player" : "players";
            // Compose “Top score: XX% (N players)” summary.
            const summary = "🏆 Top score: " + topPercent + "% (" + topCount + " " + label + ")";
            // Put text into the summary box.
            topScoreBox.textContent = summary;
            // Ensure the summary box is visible.
            topScoreBox.classList.remove("hidden");
        }
    }

    // Prefill username from localStorage if available.
    function checkUsername() {
        // Read stored name from localStorage.
        const stored = localStorage.getItem("triviaCurrentUser");
        // If present, put it into the input.
        if (stored) {
            // Prefill the name field.
            usernameInput.value = stored;
        }
    }

    // Clear all saved scores with confirmation.
    function clearScores() {
        // Confirm the destructive action with the user.
        const ok = window.confirm("Clear all saved scores? This cannot be undone.");
        // If confirmed, proceed to clear; else abort.
        if (ok) {
            // Remove scores from localStorage.
            localStorage.removeItem("scores");
            // Re-render empty table and hide top summary.
            displayScores();
        }
    }

    // Create or update a result banner summarizing performance.
    function showResultBanner(name, correct, total) {
        // Compute whole-number percentage.
        const percent = Math.round((correct / total) * 100);
        // Get the game container as insertion point.
        const container = document.getElementById("game-container");
        // Try to find an existing banner for reuse.
        let banner = document.getElementById("result-banner");
        // If not found, create and insert before New Player button.
        if (!banner) {
            // Create a new div for the banner.
            banner = document.createElement("div");
            // Give it a known id to restyle and find later.
            banner.id = "result-banner";
            // Find the New Player button for placement.
            const beforeNode = document.getElementById("new-player");
            // Insert the banner before the New Player button.
            container.insertBefore(banner, beforeNode);
        }
        // Build the message text.
        const msg = name + ", you scored " + correct + "/" + total + " (" + percent + "%).";
        // Put message into the banner.
        banner.textContent = msg;
        // Reset any prior color classes.
        banner.className = "";
        // Choose color class by threshold.
        if (percent >= 80) {
            // Good performance style.
            banner.classList.add("result-good");
        } else if (percent >= 50) {
            // Okay performance style.
            banner.classList.add("result-ok");
        } else {
            // Low performance style.
            banner.classList.add("result-bad");
        }
    }

    // Reset UI for a new player and fetch new questions.
    function newPlayer() {
        // Clear the stored current user name.
        localStorage.removeItem("triviaCurrentUser");
        // Clear name input value.
        usernameInput.value = "";
        // Re-enable submit for the next attempt.
        document.getElementById("submit-game").disabled = false;
        // Hide New Player button until after next submit.
        newPlayerButton.classList.add("hidden");
        // Clear out old questions.
        questionContainer.innerHTML = "";
        // Remove result banner if present.
        const banner = document.getElementById("result-banner");
        // If banner exists, remove it.
        if (banner) {
            banner.remove();
        }
        // Show loader while loading new questions.
        showLoading(true);
        // Fetch a new set of questions.
        fetchQuestions();
        // Move focus back to the name field.
        usernameInput.focus();
    }
});
// End of DOMContentLoaded handler.
