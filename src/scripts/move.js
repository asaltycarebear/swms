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

    // Clear any previous animation.
    moveForm.classList.remove("move-success-animation", "move-error-animation");

    try {
        const response = await fetch("/api/move-lpn", {
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

        // Show success and swipe the form to the right.
        showMessage(
            `Successfully moved LPN ${ lpn } to ${ result.locationName }.`,
            "success"
        );

        moveForm.classList.add("move-success-animation");

        // Reset and restore the form after the animation.
        window.setTimeout(() => {
            moveForm.reset();
            moveForm.classList.remove("move-success-animation");
            moveButton.disabled = false;
            document.getElementById("lpnInput").focus();
        }, 1200);

    } catch (error) {
        console.error("Move LPN failed:", error);

        showMessage(error.message, "error");
        moveForm.classList.add("move-error-animation");

        // Remove the shake class so another failure can animate.
        window.setTimeout(() => {
            moveForm.classList.remove("move-error-animation");
        }, 500);

        moveButton.disabled = false;
    }
});

function showMessage(message, type) {
    moveMessage.textContent = message;
    moveMessage.className = type ? `move-message ${type}` : "move-message";
}