import desktopHero from "../images/hero.webp";
import mobileHero from "../images/heromobile.webp";

const heroImage = document.getElementById("hero-image");

if (!heroImage) {
    console.error("Home page hero image element was not found.");
} else {
    const mobileHeroMedia = window.matchMedia("(max-width: 600px)");

    function loadHeroImage() {
        heroImage.src = mobileHeroMedia.matches ? mobileHero : desktopHero;
    }

    loadHeroImage();
    mobileHeroMedia.addEventListener("change", loadHeroImage);
}
