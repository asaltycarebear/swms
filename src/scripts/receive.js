// ***Buttons for toggling form***

const showReceiveBtn = document.getElementById("showReceive");
const showNewItemBtn = document.getElementById("showNewItem");

const receiveForm = document.getElementById("receiveForm");
const newItemForm = document.getElementById("newItemForm");

showReceiveBtn.classList.add("active");

showReceiveBtn.addEventListener("click", () => {
    receiveForm.classList.remove("hidden");
    newItemForm.classList.add("hidden");

    showReceiveBtn.classList.add("active");
    showNewItemBtn.classList.remove("active");
});

showNewItemBtn.addEventListener("click", () => {
    newItemForm.classList.remove("hidden");
    receiveForm.classList.add("hidden");

    showNewItemBtn.classList.add("active");
    showReceiveBtn.classList.remove("active");
});

// ***Create item in local storage. Need backend server for actual application***

newItemForm.addEventListener("submit", function (event) {
    event.preventDefault();

    // Build the item object from the form
    const item = {
        sku: document.getElementById("newSku").value.trim(),
        description: document.getElementById("newDescription").value.trim(),
        make: document.getElementById("newMake").value.trim(),
        model: document.getElementById("newModel").value.trim(),
        weight: parseFloat(document.getElementById("newWeight").value) || 0,
        length: parseFloat(document.getElementById("newLength").value) || 0,
        width: parseFloat(document.getElementById("newWidth").value) || 0,
        height: parseFloat(document.getElementById("newHeight").value) || 0,
        batchLot: document.getElementById("newItemBatchLot").value.trim(),
        productVersion: parseInt(document.getElementById("newItemProductVersion").value) || 0,
        costPerItem: parseFloat(document.getElementById("newCostPerItem").value) || 0,
        salePrice: parseFloat(document.getElementById("newItemSalePrice").value) || 0
    };

    // Load current list from localStorage
    let items = JSON.parse(localStorage.getItem("items")) || [];

    // Add this new item
    items.push(item);

    // Save back to localStorage
    localStorage.setItem("items", JSON.stringify(items));

    // Clear form if checkbox is checked
    if (document.getElementById("newItemClearAfterSubmit").checked) {
        newItemForm.reset();
    }

    // Build GET query string for confirmation page
    const query = new URLSearchParams(item).toString();

    // Redirect to confirmation page
    window.location.href = "confirm.html?" + query;
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




