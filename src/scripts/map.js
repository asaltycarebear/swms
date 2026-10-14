
console.log("MAP: JavaScript file loaded");

document.addEventListener("DOMContentLoaded", () => {
    const searchForm = document.querySelector("#storeSearchForm");
    const locationInput = document.querySelector("#locationInput");
    const radiusSelect = document.querySelector("#radiusSelect");
    const searchButton = document.querySelector("#searchButton");
    const nearMeButton = document.querySelector("#nearMeButton");
    const searchStatus = document.querySelector("#searchStatus");
    const storeList = document.querySelector("#storeList");
    const resultCount = document.querySelector("#resultCount");

    if (
        !searchForm ||
        !locationInput ||
        !radiusSelect ||
        !searchButton ||
        !nearMeButton ||
        !searchStatus ||
        !storeList ||
        !resultCount
    ) {
        console.error("MAP: Required HTML elements are missing.");
        return;
    }

    function setBusy(isBusy, message) {
        searchButton.disabled = isBusy;
        nearMeButton.disabled = isBusy;

        if (message) {
            searchStatus.textContent = message;
        }
    }

    function showMessage(message) {
        storeList.replaceChildren();

        const listItem = document.createElement("li");
        listItem.textContent = message;
        storeList.append(listItem);

        resultCount.textContent = "";
    }

    async function fetchJSON(url, options = {}) {
        const response = await fetch(url, options);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "The request could not be completed.");
        }

        return data;
    }

    async function geocodeLocation(query) {
        const params = new URLSearchParams({ q: query });

        return fetchJSON(`/api/geocode?${params.toString()}`);
    }

    function getDistanceKm(lat1, lon1, lat2, lon2) {
        const earthRadiusKm = 6371;
        const toRadians = (degrees) => degrees * Math.PI / 180;

        const latitudeDifference = toRadians(lat2 - lat1);
        const longitudeDifference = toRadians(lon2 - lon1);

        const a =
            Math.sin(latitudeDifference / 2) ** 2 +
            Math.cos(toRadians(lat1)) *
            Math.cos(toRadians(lat2)) *
            Math.sin(longitudeDifference / 2) ** 2;

        return earthRadiusKm * 2 * Math.atan2(
            Math.sqrt(a),
            Math.sqrt(1 - a)
        );
    }

    function getStoreCoordinates(element) {
        const lat = Number(element.lat ?? element.center?.lat);
        const lon = Number(element.lon ?? element.center?.lon);

        if (
            !Number.isFinite(lat) ||
            !Number.isFinite(lon) ||
            lat < -90 ||
            lat > 90 ||
            lon < -180 ||
            lon > 180
        ) {
            return null;
        }

        return { lat, lon };
    }

    function getStoreName(tags = {}) {
        return (
            tags.name ||
            tags.brand ||
            tags.operator ||
            "Unnamed clothing retailer"
        );
    }

    function getStoreType(tags = {}) {
        if (/walmart/i.test(`${tags.name || ""} ${tags.brand || ""}`)) {
            return "Walmart";
        }

        if (/target/i.test(`${tags.name || ""} ${tags.brand || ""}`)) {
            return "Target";
        }

        if (tags.shop === "department_store") {
            return "Department store";
        }

        return "Clothing store";
    }

    function getStoreAddress(tags = {}) {
        const street = [
            tags["addr:housenumber"],
            tags["addr:street"]
        ].filter(Boolean).join(" ");

        const city = tags["addr:city"] || tags["addr:town"] || "";
        const state = tags["addr:state"] || "";
        const postcode = tags["addr:postcode"] || "";

        return [street, city, state, postcode]
            .filter(Boolean)
            .join(", ");
    }

    function renderStores(elements, center, radiusMeters) {
        const stores = elements
            .map((element) => {
                const coordinates = getStoreCoordinates(element);

                if (!coordinates) {
                    return null;
                }

                const distance = getDistanceKm(
                    center.lat,
                    center.lon,
                    coordinates.lat,
                    coordinates.lon
                );

                return {
                    element,
                    coordinates,
                    distance,
                    name: getStoreName(element.tags || {}),
                    type: getStoreType(element.tags || {}),
                    address: getStoreAddress(element.tags || {})
                };
            })
            .filter((store) => (
                store &&
                store.distance <= radiusMeters / 1000
            ))
            .sort((a, b) => a.distance - b.distance);

        storeList.replaceChildren();

        if (stores.length === 0) {
            showMessage(
                "No matching stores were found in this radius. Try a larger radius or another location."
            );
            return 0;
        }

        const fragment = document.createDocumentFragment();

        stores.forEach((store) => {
            const item = document.createElement("li");
            item.className = "store-card";

            const heading = document.createElement("h3");
            heading.textContent = store.name;

            const type = document.createElement("p");
            type.className = "store-type";
            type.textContent = store.type;

            item.append(heading, type);

            if (store.address) {
                const address = document.createElement("p");
                address.textContent = store.address;
                item.append(address);
            }

            const distance = document.createElement("p");
            distance.textContent =
                `${store.distance.toFixed(1)} km away`;
            item.append(distance);

            const mapLink = document.createElement("a");
            mapLink.href =
                `https://www.openstreetmap.org/?mlat=${store.coordinates.lat}` +
                `&mlon=${store.coordinates.lon}` +
                `#map=18/${store.coordinates.lat}/${store.coordinates.lon}`;
            mapLink.target = "_blank";
            mapLink.rel = "noopener noreferrer";
            mapLink.textContent = "View on OpenStreetMap";
            item.append(mapLink);

            fragment.append(item);
        });

        storeList.append(fragment);
        resultCount.textContent = `${stores.length} found`;

        return stores.length;
    }

    async function searchStores(center, description) {
        const radius = Number(radiusSelect.value);
        const params = new URLSearchParams({
            lat: String(center.lat),
            lon: String(center.lon),
            radius: String(radius)
        });

        setBusy(true, `Searching near ${description}…`);
        showMessage("Searching for nearby stores…");

        try {
            const data = await fetchJSON(`/api/stores?${params.toString()}`);

            const count = renderStores(
                data.elements || [],
                center,
                radius
            );

            searchStatus.textContent = count
                ? `Found ${count} matching stores near ${description}.`
                : `No matching stores found near ${description}.`;
        } catch (error) {
            console.error("MAP: Store search failed:", error);
            showMessage(error.message || "Unable to load stores.");
            searchStatus.textContent =
                "The store search failed. Please try again shortly.";
        } finally {
            setBusy(false);
        }
    }

    searchForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const query = locationInput.value.trim();

        if (!query) {
            searchStatus.textContent = "Enter a city or ZIP code.";
            locationInput.focus();
            return;
        }

        setBusy(true, "Finding that location…");
        showMessage("Finding location…");

        try {
            const location = await geocodeLocation(query);
            const center = {
                lat: Number(location.lat),
                lon: Number(location.lon)
            };

            if (
                !Number.isFinite(center.lat) ||
                !Number.isFinite(center.lon)
            ) {
                throw new Error("The location service returned invalid coordinates.");
            }

            await searchStores(
                center,
                location.display_name || query
            );
        } catch (error) {
            console.error("MAP: Location search failed:", error);
            showMessage(error.message || "Unable to find that location.");
            searchStatus.textContent =
                error.message || "Unable to find that location. Try a city and state.";
            setBusy(false);
        }
    });

    nearMeButton.addEventListener("click", () => {
        if (!navigator.geolocation) {
            searchStatus.textContent =
                "Your browser does not support location access. Enter a city or ZIP code instead.";
            return;
        }

        setBusy(true, "Requesting your location…");
        showMessage("Waiting for location permission…");

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const center = {
                    lat: position.coords.latitude,
                    lon: position.coords.longitude
                };

                await searchStores(center, "your current location");
            },
            (error) => {
                console.error("MAP: Location permission failed:", error);

                const message = error.code === 1
                    ? "Location permission was denied. Enter a city or ZIP code instead."
                    : "Unable to determine your location. Try entering a city or ZIP code.";

                searchStatus.textContent = message;
                showMessage(message);
                setBusy(false);
            },
            {
                enableHighAccuracy: false,
                timeout: 10000,
                maximumAge: 60000
            }
        );
    });
});
