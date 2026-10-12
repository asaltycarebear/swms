const API_BASE_URL = import.meta.env.DEV
    ? "http://localhost:3000"
    : "";

function apiUrl(endpoint) {
    return `${API_BASE_URL}${endpoint}`;
}


const moveForm = document.getElementById("moveForm");
const moveMessage = document.getElementById("moveMessage");
const moveButton = document.getElementById("moveButton");

moveForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const lpn = document.getElementById("lpnInput").value.trim();
    const locationName = document
        .getElementById("locationInput")
        .value.trim();

    if (!lpn || !locationName) {
        showMessage("Enter both an LPN number and a destination.", "error");
        return;
    }

    moveButton.disabled = true;
    showMessage("Moving LPN...", "");

    try {
        const response = await fetch(apiUrl("/api/move-lpn"), {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ lpn, locationName })
        });

        const responseText = await response.text();
        let result;

        try {
            result = JSON.parse(responseText);
        } catch {
            throw new Error(
                `The server returned an unexpected response(HTTP ${ response.status }).`
            );
        }

        if (!response.ok) {
            throw new Error(result.error || "Could not move the LPN.");
        }

        showMessage(
            `Successfully moved LPN ${ lpn } to ${ result.locationName }.`,
            "success"
        );

        moveForm.reset();
    } catch (error) {
        console.error("Move LPN failed:", error);
        showMessage(error.message, "error");
    } finally {
        moveButton.disabled = false;
    }
});

function showMessage(message, type) {
    moveMessage.textContent = message;
    moveMessage.className = type;
}