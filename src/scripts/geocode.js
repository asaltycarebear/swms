// Stockwell Inventory - Distribution Center Geocoder
// Geocodes two addresses using Nominatim and vanilla JavaScript.

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("geocode-form");
    const warehouseInput = document.getElementById("warehouse-address");
    const distributionInput = document.getElementById("distribution-address");
    const submitButton = document.getElementById("geocode-submit");
    const statusMessage = document.getElementById("geocode-status");

    const resultsSection = document.getElementById("geocode-results");
    const warehouseResult = document.getElementById("warehouse-result");
    const distributionResult = document.getElementById("distribution-result");

    const distanceSection = document.getElementById("geocode-distance");
    const distanceValue = document.getElementById("geocode-distance-value");
    const directionsLink = document.getElementById("geocode-directions-link");

    const mapSection = document.getElementById("geocode-map-section");
    const mapFrame = document.getElementById("geocode-map");

    const requiredElements = [
        form,
        warehouseInput,
        distributionInput,
        submitButton,
        statusMessage,
        resultsSection,
        warehouseResult,
        distributionResult,
        distanceSection,
        distanceValue,
        directionsLink,
        mapSection,
        mapFrame
    ];

    if (requiredElements.some((element) => !element)) {
        console.error("Geocoder: One or more required HTML elements are missing.");
        return;
    }

    // Nominatim usage policy: https://operations.osmfoundation.org/policies/nominatim/
    const NOMINATIM_URL =
        "https://nominatim.openstreetmap.org/search";

    const MIN_REQUEST_INTERVAL = 1100;
    let lastRequestTime = 0;

    // Cache successful lookups for this page session.
    const addressCache = new Map();

    function showStatus(message, type = "info") {
        statusMessage.textContent = message;
        statusMessage.className = `geocode-status ${type}`;
        statusMessage.hidden = false;
    }

    function hideResults() {
        resultsSection.hidden = true;
        distanceSection.hidden = true;
        mapSection.hidden = true;
        mapFrame.removeAttribute("src");
    }

    function wait(milliseconds) {
        return new Promise((resolve) => {
            setTimeout(resolve, milliseconds);
        });
    }

    // Keep requests at least 1.1 seconds apart.
    async function waitForRequestSlot() {
        const elapsed = Date.now() - lastRequestTime;
        const remaining = MIN_REQUEST_INTERVAL - elapsed;

        if (remaining > 0) {
            await wait(remaining);
        }

        lastRequestTime = Date.now();
    }

    async function geocodeAddress(address) {
        const cacheKey = address.trim().toLowerCase();

        if (addressCache.has(cacheKey)) {
            return addressCache.get(cacheKey);
        }

        await waitForRequestSlot();

        const url = new URL(NOMINATIM_URL);

        url.searchParams.set("q", address);
        url.searchParams.set("format", "jsonv2");
        url.searchParams.set("limit", "1");
        url.searchParams.set("addressdetails", "1");

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(
                `Location lookup failed (HTTP ${response.status}).`
            );
        }

        const locations = await response.json();

        if (!Array.isArray(locations)) {
            throw new Error("The location service returned invalid data.");
        }

        if (locations.length === 0) {
            throw new Error(`No matching location found for: ${address}`);
        }

        const location = locations[0];
        const latitude = Number(location.lat);
        const longitude = Number(location.lon);

        if (
            !Number.isFinite(latitude) ||
            !Number.isFinite(longitude) ||
            latitude < -90 ||
            latitude > 90 ||
            longitude < -180 ||
            longitude > 180
        ) {
            throw new Error("The location service returned invalid coordinates.");
        }

        const result = {
            address: location.display_name || address,
            latitude,
            longitude
        };

        addressCache.set(cacheKey, result);

        return result;
    }

    // Populate one of the two existing HTML result cards.
    function displayLocation(card, location) {
        card.querySelector(".geocode-result-address").textContent =
            location.address;

        card.querySelector(".geocode-latitude").textContent =
            location.latitude.toFixed(6);

        card.querySelector(".geocode-longitude").textContent =
            location.longitude.toFixed(6);

        const mapLink = card
            .querySelector(".geocode-map-link");

        mapLink.href =
            `https://www.openstreetmap.org/?mlat=${location.latitude}` +
            `&mlon=${location.longitude}` +
            `#map=16/${location.latitude}/${location.longitude}`;
    }

    function getDistanceKm(first, second) {
        const earthRadiusKm = 6371;
        const toRadians = (degrees) => degrees * Math.PI / 180;
        const latitudeDifference =
            toRadians(second.latitude - first.latitude);
        const longitudeDifference =
            toRadians(second.longitude - first.longitude);

        const haversine =
            Math.sin(latitudeDifference / 2) ** 2 +
            Math.cos(toRadians(first.latitude)) *
            Math.cos(toRadians(second.latitude)) *
            Math.sin(longitudeDifference / 2) ** 2;

        return earthRadiusKm * 2 * Math.atan2(
            Math.sqrt(haversine),
            Math.sqrt(1 - haversine)
        );
    }

    function displayMap(first, second) {
        const padding = Math.max(
            Math.abs(first.latitude - second.latitude),
            Math.abs(first.longitude - second.longitude),
            0.01
        ) * 0.2;
        const west =
            Math.min(first.longitude, second.longitude) - padding;
        const south =
            Math.min(first.latitude, second.latitude) - padding;
        const east =
            Math.max(first.longitude, second.longitude) + padding;
        const north =
            Math.max(first.latitude, second.latitude) + padding;
        const mapUrl = new URL(
            "https://www.openstreetmap.org/export/embed.html"
        );

        mapUrl.searchParams.set(
            "bbox",
            `${west},${south},${east},${north}`
        );
        mapUrl.searchParams.set("layer", "mapnik");
        mapFrame.src = mapUrl;
        mapSection.hidden = false;
    }

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const warehouseAddress = warehouseInput.value.trim();
        const distributionAddress = distributionInput.value.trim();

        if (!warehouseAddress || !distributionAddress) {
            showStatus("Enter both addresses to compare locations.", "error");
            return;
        }

        hideResults();
        submitButton.disabled = true;
        showStatus("Looking up both locations...");

        try {
            const warehouse = await geocodeAddress(warehouseAddress);
            const distributionCenter =
                await geocodeAddress(distributionAddress);

            displayLocation(warehouseResult, warehouse);
            displayLocation(distributionResult, distributionCenter);

            const distanceKm = getDistanceKm(
                warehouse,
                distributionCenter
            );
            const distanceMiles = distanceKm * 0.621371;

            distanceValue.textContent =
                `${distanceKm.toFixed(1)} km (${distanceMiles.toFixed(1)} mi)`;

            const directionsUrl = new URL(
                "https://www.openstreetmap.org/directions"
            );
            directionsUrl.searchParams.set(
                "route",
                `${warehouse.latitude},${warehouse.longitude};` +
                `${distributionCenter.latitude},${distributionCenter.longitude}`
            );
            directionsLink.href = directionsUrl;

            resultsSection.hidden = false;
            distanceSection.hidden = false;
            displayMap(warehouse, distributionCenter);
            showStatus("Both locations were found.", "success");
        } catch (error) {
            console.error("Geocoder search failed:", error);
            showStatus(
                error.message || "Unable to find both locations.",
                "error"
            );
        } finally {
            submitButton.disabled = false;
        }
    });
});