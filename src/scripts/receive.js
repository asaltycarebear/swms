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

// Function 1: Save the item to localStorage.
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

// Function 2: Send the item to a backend that updates items.json. Backend project. When using the deployed site change the fetch to the correct render address
async function addItemToJson(item) {
    const response = await fetch("http://localhost:3000/api/items", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(item)
    });

    const result = await response.json();

    if (!response.ok) {
        throw new Error(result.error || "Failed to update items.json.");
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


// ***LPN receiving***

// Receive Form submit handler
receiveForm.addEventListener("submit", async function (event) { // <<<<<< async decleration
    event.preventDefault();

    // Get form values
    const sku = document.getElementById("receiveSku").value.trim();
    const quantity = parseInt(document.getElementById("receiveQuantity").value) || 0;
    const batchLot = document.getElementById("receiveBatchLot").value.trim();
    const version = parseInt(document.getElementById("receiveProductVersion").value) || 0;

    // Load items.json
    let items = [];
    try {
        const res = await fetch("data/items.json");
        if (!res.ok) throw new Error("Cannot load items.json");
        items = await res.json();
    } catch (err) {
        alert("Error fetching items.json: " + err.message);
        return;
    }

    // Find matching item by SKU + productVersion
    const matchedItem = items.find(i => i.sku === sku && i.productVersion == version);
    if (!matchedItem) {
        alert("No item matches this SKU + Product Version.");
        return;
    }

    // Generate LPN: MMDDYYYY + 3-digit sequence
    const today = new Date();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const yyyy = today.getFullYear();
    const datePrefix = `${mm}${dd}${yyyy}`;

    let lastSeq = JSON.parse(localStorage.getItem("lpnSequence")) || { date: "", seq: 0 };
    if (lastSeq.date === datePrefix) {
        lastSeq.seq += 1;
    } else {
        lastSeq.date = datePrefix;
        lastSeq.seq = 1;
    }

    const lpn = `${datePrefix}${String(lastSeq.seq).padStart(3, "0")}`;
    localStorage.setItem("lpnSequence", JSON.stringify(lastSeq));

    // Build pallet object (include matched item fields for display on summary)
    const newPallet = {
        lpn,
        sku,
        location: "Receiving",
        quantity,
        batchLot,
        productVersion: version,
        description: matchedItem.description,
        make: matchedItem.make,
        model: matchedItem.model,
        weight: matchedItem.weight,
        length: matchedItem.length,
        width: matchedItem.width,
        height: matchedItem.height,
        costPerItem: matchedItem.costPerItem,
        salePrice: matchedItem.salePrice
    };

    // Save to localStorage
    const pallets = JSON.parse(localStorage.getItem("pallets")) || [];
    pallets.push(newPallet);
    localStorage.setItem("pallets", JSON.stringify(pallets));

        // Clear form if checkbox checked HOWEVER with a confirmation page this become unnessesary. I want to leave it as an option. 
        // In the future I would rather have a whole list of recent received lpn's to be shown after the session is done, 
        // but for this assignment I am using a confirmation page.
    if (document.getElementById("receiveClearAfterSubmit").checked) {
        receiveForm.reset();
    }

    // Build query string for confirmation page and redirect
    const formData = {
        lpn,
        sku,
        quantity,
        batchLot,
        productVersion: version
    };
    const query = new URLSearchParams(formData).toString();
    window.location.href = "confirm.html?" + query;
});




