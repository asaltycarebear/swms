

document.addEventListener("DOMContentLoaded", async () => {
    const tableBody = document.querySelector("#stocksummary tbody");
    const modalContainer = document.getElementById("modalContainer");
    // Load pallets from localStorage
    const pallets = JSON.parse(localStorage.getItem("pallets")) || [];

    if (pallets.length === 0) {
        const row = document.createElement("tr");
        const td = document.createElement("td");
        td.colSpan = 15;
        td.textContent = "No pallets received yet.";
        td.style.textAlign = "center";
        row.appendChild(td);
        tableBody.appendChild(row);
        return;
    }

    // Table row creation. LPN creating happen in receive.js and uses todays date + a sequence
    pallets.forEach(pallet => {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td class="lpn-click" data-lpn="${pallet.lpn}">${pallet.lpn}</td>
            <td>${pallet.sku}</td>
            <td>${pallet.location}</td>
            <td>${pallet.quantity}</td>
            <td class="noMobile">${pallet.batchLot}</td>
            <td class="noMobile">${pallet.productVersion}</td>
            <td class="noMobile">${pallet.description}</td>
            <td class="noMobile">${pallet.make}</td>
            <td class="noMobile">${pallet.model}</td>
            <td class="noMobile">${pallet.weight}</td>
            <td class="noMobile">${pallet.length}</td>
            <td class="noMobile">${pallet.width}</td>
            <td class="noMobile">${pallet.height}</td>
            <td class="noMobile">${pallet.costPerItem}</td>
            <td class="noMobile">${pallet.salePrice}</td>
        `;

        tableBody.appendChild(row);

        // Add click listener to LPN cell
        row.querySelector(".lpn-click").addEventListener("click", () => {
            openModal(pallet);
        });
    });

    // Modal builder (This is where the API is used)
    function openModal(pallet) {
        const totalWeight = (pallet.weight || 0) * (pallet.quantity || 0);

        modalContainer.innerHTML = `
            <div class="modal-overlay"></div>

            <div class="modal-box">
                <button class="modal-close">✖</button>

                <div class="modal-content">
                    <p><strong>LPN:</strong> ${pallet.lpn}</p>
                    <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(pallet.lpn)}" alt="LPN Code">

                    <p><strong>SKU:</strong> ${pallet.sku}</p>
                    <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(pallet.sku)}" alt="SKU Code">

                    <p><strong>Quantity:</strong> ${pallet.quantity}</p>
                    <p><strong>Batch + Version:</strong> ${pallet.batchLot}-${pallet.productVersion}</p>
                    <p><strong>Total Weight:</strong> ${totalWeight}</p>
                </div>
            </div>
        `;

        document.querySelector(".modal-close").addEventListener("click", closeModal);
        document.querySelector(".modal-overlay").addEventListener("click", closeModal);
    }

    function closeModal() {
        modalContainer.innerHTML = "";
    }
});

// Convert table to CSV
function tableToCSV(tableId) {
    const table = document.getElementById(tableId);
    let csv = [];

    for (let row of table.rows) {
        let cells = Array.from(row.cells).map(cell => `${cell.textContent.trim()}`);
        csv.push(cells.join(`,`));
    }
    return csv.join(`\n`);
}

// Export CSV function
function exportTable(tableId, clearAfter) {
    const csvData = tableToCSV(tableId);

    // Temp download link
    const blob = new Blob([csvData], { type: `text/csv` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement(`a`);
    a.href = url;
    a.download = `stock_summary.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Clear table and storage when checked
    if (clearAfter) {
        localStorage.removeItem(`pallets`);
        const table = document.getElementById(tableId);
        while (table.rows.length > 1) { // KEEP HEADER ROW!!!!
            table.deleteRow(1);
        }
    }

    // Always uncheck the box, only note out on customer request. Very scary. To be fair, if you don't un
    const checkbox = document.getElementById(`clearAfterExport`);
    if (checkbox) checkbox.checked = false;
}


// Clear Table
function clearTable(tableId) {
    localStorage.removeItem(`pallets`);
    const table = document.getElementById(tableId);
    while (table.rows.length > 1) { // KEEP HEADER ROW!!!!
        table.deleteRow(1);
    }
}

// Event listener for both export and clearing
document.addEventListener("DOMContentLoaded", () => {
    const exportButton = document.getElementById(`exportCSV`);
    if (exportButton) {
        exportButton.addEventListener("click", () => {
            const clearAfter = document.getElementById(`clearAfterExport`).checked;
            exportTable(`stocksummary`, clearAfter);
        });
    }

    const clearButton = document.getElementById(`clearTable`); // Need to learn how to center this popup
    if (clearButton) {
        clearButton.addEventListener("click", () => {
            if (confirm(`Are you sure you want to clear the table?\n!!!!!!!!!!!!\nThis action cannot be undone.`)) {
                clearTable(`stocksummary`);
            }
        });
    }
});

