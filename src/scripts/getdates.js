function updateDates() {
    const currentYear = document.getElementById("currentyear");
    const lastModified = document.getElementById("lastModified");

    if (!currentYear || !lastModified) {
        return false;
    }

    currentYear.textContent = new Date().getFullYear();
    lastModified.textContent = `Last Modified: ${document.lastModified}`;
    return true;
}

if (!updateDates()) {
    const footerObserver = new MutationObserver(() => {
        if (updateDates()) {
            footerObserver.disconnect();
        }
    });

    footerObserver.observe(document.body, { childList: true, subtree: true });
}
