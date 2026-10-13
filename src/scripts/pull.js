// const response = await fetch(
//     `/api/lpns/${encodeURIComponent(lpn)}`,
//     {
//         method: "DELETE"
//     }
// );

// const result = await response.json();

// if (!response.ok) {
//     throw new Error(result.error || "Failed to pull LPN.");
// }

document.addEventListener("DOMContentLoaded", () => {
    const pullForm = document.getElementById("pullForm");
    const lpnInput = document.getElementById("lpnInput");
    const pullButton = document.getElementById("pullButton");
    const moveMessage = document.getElementById("moveMessage");

    if (!pullForm || !lpnInput || !pullButton || !moveMessage) {
        console.error("The pull form is missing one or more required elements.");
        return;
    }

    pullForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const lpn = lpnInput.value.trim();

        if (!lpn) {
            moveMessage.textContent = "Please enter an LPN number.";
            return;
        }

        // Prevent repeated submissions while the request is processing.
        pullButton.disabled = true;
        lpnInput.disabled = true;
        moveMessage.textContent = "Removing pallet...";
        moveMessage.className = "";

        try {
            const response = await fetch(
                `/api/lpns/${encodeURIComponent(lpn)}`,
                {
                    method: "DELETE"
                }
            );

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "Failed to pull LPN.");
            }

            // Animate only after the server confirms deletion.
            pullForm.classList.add("pulling");

            moveMessage.textContent =
                result.message || `LPN ${lpn} was successfully removed.`;
            moveMessage.className = "pull-success";

            // Reset the form after the animation finishes.
            window.setTimeout(() => {
                pullForm.reset();
                pullForm.classList.remove("pulling");
                pullButton.disabled = false;
                lpnInput.disabled = false;
                lpnInput.focus();
            }, 850);
        } catch (error) {
            console.error("Failed to pull LPN:", error);

            moveMessage.textContent = error.message;
            moveMessage.className = "pull-error";

            pullButton.disabled = false;
            lpnInput.disabled = false;
        }
    });
});