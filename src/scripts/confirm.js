//need to add functionality to undo from this page if it was wrong later


document.addEventListener("DOMContentLoaded", () => {
    const params = new URLSearchParams(window.location.search);
    const box = document.getElementById("confirmationBox");

    if (![...params].length) {
        box.innerHTML = "<p>No form data received.</p>";
        return;
    }

    let html = "<ul>";
    params.forEach((value, key) => {
        html += `<li><strong>${key}:</strong> ${value}</li>`;
    });
    html += "</ul>";

    box.innerHTML = html;
});
