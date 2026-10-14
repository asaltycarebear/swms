// Stockwell Inventory - Distribution Center Geocoder
// Uses the Nominatim OpenStreetMap Search API.

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("geocode-form");
    const addressInput = document.getElementById("geocode-address");
    const submitButton = document.getElementById("geocode-submit");
    const statusMessage = document.getElementById("geocode-status");
    const resultsSection = document.getElementById("geocode-results");
    const resultsList = document.getElementById("geocode-results-list");

    if (
        !form ||
        !addressInput ||
        !submitButton ||
        !statusMessage ||
        !resultsSection ||
        !resultsList
    ) {
        console.error("Geocoder: Required HTML elements were not found.");
        return;
    }

    function showStatus(message, type = "info") {
        statusMessage.textContent = message;
        statusMessage.className = `geocode-status ${type}`;
        statusMessage.hidden = false;
    }

    function clearResults() {
        resultsList.replaceChildren();
        resultsSection.hidden = true;
    }

    function createMapLink(latitude, longitude) {
        const link = document.createElement("a");

        link.href =
            `https://www.openstreetmap.org/?mlat=${encodeURIComponent(latitude)}` +
            `&mlon=${encodeURIComponent(longitude)}` +
            `#map=16/${encodeURIComponent(latitude)}/${encodeURIComponent(longitude)}`;
        link.textContent = "View on OpenStreetMap";
        link.target = "_blank";
        link.rel = "noopener noreferrer";

        return link;
    }

    function createResultCard(location, index) {
        const card = document.createElement("article");
        card.className = "geocode-result-card";

        const heading = document.createElement("h3");
        heading.textContent = `Location ${index + 1}`;

        const address = document.createElement("p");
        address.className = "geocode-result-address";
        address.textContent = location.display_name || "Address unavailable";

        const latitude = document.createElement("p");
        latitude.textContent = `Latitude: ${location.lat}`;

        const longitude = document.createElement("p");
        longitude.textContent = `Longitude: ${location.lon}`;

        card.append(
            heading,
            address,
            latitude,
            longitude,
            createMapLink(location.lat, location.lon)
        );

        return card;
    }

    async function searchAddress(address) {
        const url = new URL("https://nominatim.openstreetmap.org/search");

        url.searchParams.set("q", address);
        url.searchParams.set("format", "jsonv2");
        url.searchParams.set("limit", "5");
        url.searchParams.set("addressdetails", "1");

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(
                `Location service returned HTTP ${response.status}.`
            );
        }

        return response.json();
    }

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const address = addressInput.value.trim();

        if (!address) {
            showStatus("Please enter an address.", "error");
            addressInput.focus();
            return;
        }

        clearResults();
        submitButton.disabled = true;
        submitButton.textContent = "Searching...";
        showStatus("Searching OpenStreetMap for matching locations...");

        try {
            const locations = await searchAddress(address);

            if (!Array.isArray(locations)) {
                throw new Error("The location service returned invalid data.");
            }

            if (locations.length === 0) {
                showStatus(
                    "No matching locations found. Try a more complete address.",
                    "error"
                );
                return;
            }

            const resultCards = locations
                .filter((location) => (
                    location.display_name &&
                    Number.isFinite(Number(location.lat)) &&
                    Number.isFinite(Number(location.lon))
                ))
                .map(createResultCard);

            if (resultCards.length === 0) {
                showStatus(
                    "No usable location results were returned.",
                    "error"
                );
                return;
            }

            resultsList.replaceChildren(...resultCards);
            resultsSection.hidden = false;
            showStatus(
                `Found ${resultCards.length} matching location(s).`,
                "success"
            );
        } catch (error) {
            console.error("Geocoder search failed:", error);
            showStatus(
                "Unable to retrieve locations. Check your connection and try again later.",
                "error"
            );
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = "Search Address";
        }
    });
});
