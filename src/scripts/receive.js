
// *** Buttons for toggling forms ***

const showReceiveBtn = document.getElementById("showReceive");
const showNewItemBtn = document.getElementById("showNewItem");

const receiveForm = document.getElementById("receiveForm");
const newItemForm = document.getElementById("newItemForm");

function showReceiveForm() {
    receiveForm.classList.remove("hidden");
    newItemForm.classList.add("hidden");

    showReceiveBtn.classList.add("active");
    showNewItemBtn.classList.remove("active");
}

function showNewItemForm() {
    newItemForm.classList.remove("hidden");
    receiveForm.classList.add("hidden");

    showNewItemBtn.classList.add("active");
    showReceiveBtn.classList.remove("active");
}

showReceiveBtn.addEventListener("click", showReceiveForm);
showNewItemBtn.addEventListener("click", showNewItemForm);

// Set default form.
showReceiveForm();

/*
 * New Item settings
 *
 * Keep false to save only to localStorage.
 * Change to true when the backend API is ready. Will make this a setting later
 */
const SAVE_TO_JSON = true;

// Build the item object from the form.
function buildNewItem() {
    return {
        sku: document.getElementById("newSku").value.trim(),
        description: document.getElementById("newDescription").value.trim(),
        make: document.getElementById("newMake").value.trim(),
        model: document.getElementById("newModel").value.trim(),
        weight: Number(document.getElementById("newWeight").value) || 0,
        length: Number(document.getElementById("newLength").value) || 0,
        width: Number(document.getElementById("newWidth").value) || 0,
        height: Number(document.getElementById("newHeight").value) || 0,
        batchLot: document.getElementById("newItemBatchLot").value.trim(),
        productVersion: Number.parseInt(document.getElementById("newItemProductVersion").value, 10) || 0,
        costPerItem: Number(document.getElementById("newCostPerItem").value) || 0,
        salePrice: Number(document.getElementById("newItemSalePrice").value) || 0
    };
}

// Save the item to localStorage.
function saveItemToLocalStorage(item) {
    const items = JSON.parse(localStorage.getItem("items")) || [];

    // Prevent duplicate SKUs.
    if (items.some(existingItem => existingItem.sku === item.sku)) {
        throw new Error("An item with this SKU already exists.");
    }

    items.push(item);
    localStorage.setItem("items", JSON.stringify(items));

    return item;
}

async function addItemToJson(item) {
    const response = await fetch("/api/items", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(item)
    });

    const result = await response.json();

    if (!response.ok) {
        throw new Error(
            result.error || "Failed to update items.json."
        );
    }

    return result;
}



// Submit handler: save locally first, then optionally update JSON.
newItemForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const item = buildNewItem();

    try {
        // Always save locally first.
        saveItemToLocalStorage(item);

        // Only update items.json when enabled.
        if (SAVE_TO_JSON) {
            try {
                await addItemToJson(item);
            } catch (error) {
                console.error("JSON update failed:", error);
                alert(
                    "The item was saved locally, but the server update failed."
                );
                return;
            }
        }

        // Clear the form if requested.
        if (
            document.getElementById("newItemClearAfterSubmit").checked
        ) {
            newItemForm.reset();
        }

        // Send item information to the confirmation page.
        const query = new URLSearchParams(item).toString();
        window.location.href = "confirm.html?" + query;

    } catch (error) {
        alert(error.message);
    }
});

// Receive Form submit handler
receiveForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    // Get form values
    const sku = document.getElementById("receiveSku").value.trim();
    const quantity = Number.parseInt(
        document.getElementById("receiveQuantity").value,
        10
    );
    const batchLot = document.getElementById("receiveBatchLot").value.trim();
    const version = Number.parseInt(
        document.getElementById("receiveProductVersion").value,
        10
    );

    // Validate form values
    if (
        !sku ||
        !batchLot ||
        !Number.isInteger(quantity) ||
        quantity <= 0 ||
        !Number.isInteger(version) ||
        version < 0
    ) {
        alert("Please enter a valid SKU, quantity, batch lot, and product version.");
        return;
    }

    // Load items.json only
    let items = [];

    try {
        const response = await fetch("/api/items");

        if (!response.ok) {
            throw new Error("Cannot load items.json.");
        }

        items = await response.json();
    } catch (error) {
        alert("Error loading items.json: " + error.message);
        return;
    }

    // Find matching item by SKU and product version
    const matchedItem = items.find(
        item =>
            item.sku === sku &&
            Number(item.productVersion) === version
    );

    if (!matchedItem) {
        alert(
            "This SKU and Product Version do not exist in items.json. " +
            "Please enter an existing item. Or add a New Item if it is the first time you have recived this SKU"
        );
        return;
    }

    // Calculate total pallet weight
    const itemWeight = Number(matchedItem.weight);

    if (!Number.isFinite(itemWeight) || itemWeight < 0) {
        alert("The item's weight is invalid.");
        return;
    }

    const totalWeight = itemWeight * quantity;

    // Generate LPN: MMDDYYYY + 3-digit sequence
    const today = new Date();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const yyyy = today.getFullYear();

    const datePrefix = `${mm}${dd}${yyyy}`;

    // Send the LPN to the backend
    let lpnCreated = false;
    let lpn;

    try {
        const existingLpnsResponse = await fetch("/api/lpns");

        if (!existingLpnsResponse.ok) {
            throw new Error("Cannot load existing LPNs.");
        }

        const existingLpns = await existingLpnsResponse.json();
        const lastServerSeq = existingLpns.reduce((maxSeq, existingLpn) => {
            const existingId = String(existingLpn.id || "");

            if (!existingId.startsWith(datePrefix)) {
                return maxSeq;
            }

            const sequence = existingId.slice(datePrefix.length);

            return /^\d+$/.test(sequence)
                ? Math.max(maxSeq, Number(sequence))
                : maxSeq;
        }, 0);

        const lastSeq = JSON.parse(
            localStorage.getItem("lpnSequence")
        ) || { date: "", seq: 0 };
        const localSeq =
            lastSeq.date === datePrefix ? Number(lastSeq.seq) || 0 : 0;
        const nextSeq = Math.max(lastServerSeq, localSeq) + 1;
        lpn = `${datePrefix}${String(nextSeq).padStart(3, "0")}`;

        // Build the LPN record for lpn.json
        const newLpn = {
            id: lpn,
            SKU: [sku],
            quantity: [quantity],
            "quantity type": ["Each"],
            "product version": [version],
            "batch lots": [batchLot],
            weight: totalWeight
        };

        const response = await fetch("/api/lpns", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(newLpn)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || "Failed to save LPN.");
        }

        lpnCreated = true;

        const locationResponse = await fetch("/api/move-lpn", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ lpn, locationName: "reception" })
        });

        const locationResult = await locationResponse.json();

        if (!locationResponse.ok) {
            throw new Error(
                locationResult.error || "Failed to add LPN to reception."
            );
        }

        // Build pallet object for the rest of the app
        const newPallet = {
            lpn,
            sku,
            location: locationResult.locationName,
            quantity,
            batchLot,
            productVersion: version,
            description: matchedItem.description,
            make: matchedItem.make,
            model: matchedItem.model,
            weight: totalWeight,
            itemWeight,
            length: matchedItem.length,
            width: matchedItem.width,
            height: matchedItem.height,
            costPerItem: matchedItem.costPerItem,
            salePrice: matchedItem.salePrice
        };

        // Save pallet details locally for existing app pages
        const pallets = JSON.parse(localStorage.getItem("pallets")) || [];
        pallets.push(newPallet);
        localStorage.setItem("pallets", JSON.stringify(pallets));

        // Save sequence only after the backend accepts the LPN
        localStorage.setItem(
            "lpnSequence",
            JSON.stringify({ date: datePrefix, seq: nextSeq })
        );

        // Optionally keep a local copy of the LPN records
        const lpns = JSON.parse(localStorage.getItem("lpns")) || [];
        lpns.push(newLpn);
        localStorage.setItem("lpns", JSON.stringify(lpns));

        // Clear form if requested
        if (document.getElementById("receiveClearAfterSubmit").checked) {
            receiveForm.reset();
        }

        // Redirect to confirmation page
        const formData = {
            lpn,
            sku,
            quantity,
            batchLot,
            productVersion: version,
            weight: totalWeight
        };

        const query = new URLSearchParams(formData).toString();
        window.location.href = "/confirm.html?" + query;

    } catch (error) {
        console.error("LPN save failed:", error);
        const message = lpnCreated
            ? `LPN ${lpn} was saved, but could not be added to reception: ${error.message}`
            : "Could not save the received pallet: " + error.message;
        alert(message);
    }
});
