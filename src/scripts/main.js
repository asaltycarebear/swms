import { loadHeaderFooter } from "./utils.mjs";

async function init() {
    await loadHeaderFooter();

    // Small screen menu
    const menuButton = document.querySelector("#menu");
    const navMenu = document.querySelector("#nav-menu");

    if (menuButton && navMenu) {
        menuButton.addEventListener("click", () => {
            navMenu.classList.toggle("open");

            if (navMenu.classList.contains("open")) {
                menuButton.textContent = "✖";
            } else {
                menuButton.textContent = "☰";
            }
        });
    }

    // Highlight the current nav menu item
    const currentPage = window.location.pathname.split("/").pop();

    const navLinks = document.querySelectorAll("nav a");

    navLinks.forEach((link) => {
        const linkPage = link.getAttribute("href");

        if (linkPage === currentPage) {
            link.classList.add("active");
        }
    });
}

init();