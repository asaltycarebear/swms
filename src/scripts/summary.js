

console.log("SUMMARY: JavaScript file loaded");

// alternate version for local storage available
// future update will include drop down filters

function initializeSummary() {
    console.log("SUMMARY: Initialization started");

    const table = document.getElementById("stocksummary");
    const tableBody = table?.querySelector("tbody");
    const modalContainer = document.getElementById("modalContainer");

    const loadButton = document.getElementById("loadTable");
    const clearButton = document.getElementById("clearTable");
    const exportButton = document.getElementById("exportCSV");
    const clearAfterExport = document.getElementById("clearAfterExport");

    console.log("SUMMARY: Buttons found", {
        loadButton,
        clearButton,
        exportButton
    });

    // Load JSON files.
    async function loadJSONData() {
        const [locationsResponse, lpnsResponse, itemsResponse] =
            await Promise.all([
                fetch("/api/locations"),
                fetch("/api/lpns"),
                fetch("/api/items")
            ]);

        if (
            !locationsResponse.ok ||
            !lpnsResponse.ok ||
            !itemsResponse.ok
        ) {
            throw new Error(
                "Could not load location.json, lpn.json, or items.json."
            );
        }

        const [locations, lpns, items] = await Promise.all([
            locationsResponse.json(),
            lpnsResponse.json(),
            itemsResponse.json()
        ]);

        return { locations, lpns, items };
    }


    // Find an LPN using its ID.
    function findLPN(lpns, lpnId) {
        return lpns.find(
            (record) =>
                String(record.id).trim() === String(lpnId).trim()
        );
    }

    // Get value from LPN field that can be stored as an array.
    function getLPNValue(record, field) {
        const value = record?.[field];
        return Array.isArray(value) ? value[0] : value;
    }

    // Find item matching the SKU and product version.
    function findItem(items, sku, version) {
        return items.find((item) => {
            const itemSKU = item.sku ?? item.SKU;
            const itemVersion =
                item.productVersion ?? item["product version"];

            return (
                String(itemSKU).trim() === String(sku).trim() &&
                String(itemVersion) === String(version)
            );
        });
    }

    // Add table cell safely.
    function addCell(row, value, className = "") {
        const cell = document.createElement("td");

        cell.textContent = value ?? "";

        if (className) {
            cell.className = className;
        }

        row.appendChild(cell);
    }

    // Load and populate the stock summary table.
    async function populateTable() {
        if (!tableBody) {
            alert('Could not find the table body for "stocksummary".');
            return;
        }

        loadButton.disabled = true;

        try {
            const { locations, lpns, items } = await loadJSONData();

            // Clear existing rows before loading fresh data. Trust...this was annoying...I miss SQL
            tableBody.replaceChildren();

            let rowCount = 0;

            // when LOCATION is the starting point.
            locations.forEach((location) => {
                // Each location contains an array of assigned LPN IDs.
                const locationLPNs = Array.isArray(location.LPN)
                    ? location.LPN
                    : [];

                locationLPNs.forEach((lpnId) => {
                    // Foreign key: find the LPN assigned to this location. thank you SQL for the nomenclature
                    const lpn = findLPN(lpns, lpnId);

                    if (!lpn) {
                        console.warn(`LPN ${lpnId} was not found in lpn.json.`);
                        return;
                    }

                    // Foreign key: get the SKU from the LPN.
                    const sku = getLPNValue(lpn, "SKU");
                    const productVersion = getLPNValue(
                        lpn,
                        "product version"
                    );

                    // Find the product details using SKU + version.
                    const item = findItem(items, sku, productVersion);

                    if (!item) {
                        console.warn(
                            `Item not found for SKU ${sku}, version ${productVersion}.`
                        );
                    }

                    const quantity =
                        Number(getLPNValue(lpn, "quantity")) || 0;

                    const itemWeight = Number(item?.weight) || 0;
                    const totalWeight = Math.ceil(itemWeight * quantity);

                    const row = document.createElement("tr");

                    // LPN details + location name + item details.
                    addCell(row, lpn.id, "lpn-click");
                    addCell(row, sku);
                    addCell(row, location.name);
                    addCell(row, quantity);
                    addCell(row, getLPNValue(lpn, "batch lots"), "noMobile");
                    addCell(row, productVersion, "noMobile");
                    addCell(row, item?.description, "noMobile");
                    addCell(row, item?.make, "noMobile");
                    addCell(row, item?.model, "noMobile");
                    addCell(row, totalWeight, "noMobile");
                    addCell(row, item?.length, "noMobile");
                    addCell(row, item?.width, "noMobile");
                    addCell(row, item?.height, "noMobile");
                    addCell(row, item?.costPerItem, "noMobile");
                    addCell(row, item?.salePrice, "noMobile");

                    tableBody.appendChild(row);

                    // Open the modal when the LPN cell is clicked.
                    row.querySelector(".lpn-click").addEventListener("click", () => {
                        openModal({
                            lpn: lpn.id,
                            sku,
                            quantity,
                            batchLot: getLPNValue(lpn, "batch lots"),
                            productVersion,
                            weight: itemWeight,
                            totalWeight
                        });
                    });

                    rowCount++;
                });
            });

            if (rowCount === 0) {
                const row = document.createElement("tr");
                const cell = document.createElement("td");

                cell.colSpan = 15;
                cell.textContent = "No LPNs are assigned to any locations.";
                cell.style.textAlign = "center";

                row.appendChild(cell);
                tableBody.appendChild(row);
            }
        } catch (error) {
            console.error("Error populating stock summary:", error);
            alert(`Unable to load the stock summary: ${error.message}`);
        } finally {
            loadButton.disabled = false;
        }
    }

    // Modal builder
    function openModal(pallet) {
        const totalWeight = pallet.totalWeight;

        modalContainer.innerHTML = `
        <div class="modal-overlay"></div>

        <div class="modal-box">
            <button class="modal-close" type="button">✖</button>

            <div class="modal-content">
                <p><strong>LPN:</strong> ${pallet.lpn}</p>
                <img
                    src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(pallet.lpn)}"
                    alt="LPN Code"
                >

                <p><strong>SKU:</strong> ${pallet.sku}</p>
                <img
                    src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(pallet.sku)}"
                    alt="SKU Code"
                >

                <p><strong>Quantity:</strong> ${pallet.quantity}</p>
                <p><strong>Batch + Version:</strong> ${pallet.batchLot}-${pallet.productVersion}</p>
                <p><strong>Item Weight:</strong> ${pallet.weight}</p>
                <p><strong>Total Weight:</strong> ${totalWeight}</p>
            </div>
        </div>
    `;

        modalContainer.querySelector(".modal-close")
            .addEventListener("click", closeModal);

        modalContainer.querySelector(".modal-overlay")
            .addEventListener("click", closeModal);
    }

    function closeModal() {
        modalContainer.innerHTML = "";
    }

    // Clear the displayed rows without deleting JSON data.
    function clearTable() {
        if (tableBody) {
            tableBody.replaceChildren();
        }
    }

    // Convert the table to CSV. This is for spreadsheet primary users. I need to work on using local storage as well as json files for redundancy
    function tableToCSV() {
        if (!table) return "";

        return Array.from(table.rows)
            .map((row) =>
                Array.from(row.cells)
                    .map((cell) => {
                        const value = cell.textContent.trim();
                        return `"${value.replace(/"/g, '""')}"`;
                    })
                    .join(",")
            )
            .join("\r\n");
    }

    // Export the table to a CSV file.
    function exportCSV() {
        if (!table || !tableBody || tableBody.rows.length === 0) {
            alert("Load the table before exporting.");
            return false;
        }

        const csv = tableToCSV();
        const blob = new Blob([csv], {
            type: "text/csv;charset=utf-8;"
        });

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = "stock_summary.csv";
        document.body.appendChild(link);
        link.click();
        link.remove();

        URL.revokeObjectURL(url);

        if (clearAfterExport?.checked) {
            clearTable();
            clearAfterExport.checked = false;
        }

        return true;
    }

    // The buttons!
    // Add the initial prompt animation.
    loadButton?.classList.add("load-prompt");

    // Restart a button animation each time it is triggered.
    function flashButton(button, animationClass) {
        if (!button) return;

        button.classList.remove(animationClass);

        // Force the browser to restart the CSS animation.
        void button.offsetWidth;

        button.classList.add(animationClass);
    }

    // The buttons!
    loadButton?.addEventListener("click", () => {
        console.log("SUMMARY: Load Table clicked");

        loadButton.classList.remove("load-prompt");
        populateTable();
    });

    clearButton?.addEventListener("click", () => {
        flashButton(clearButton, "flash-red");
        clearTable();
    });

    exportButton?.addEventListener("click", () => {
        // Only show green if an export actually happens.
        const exported = exportCSV();

        if (exported) {
            flashButton(exportButton, "flash-green");
        }
    });
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeSummary, {
        once: true
    });
} else {
    initializeSummary();
}