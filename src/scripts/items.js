document.addEventListener("DOMContentLoaded", async () => {
    const tableBody = document.querySelector("#itemsTable tbody");

    if (!tableBody) {
        console.error('Could not find "#itemsTable tbody".');
        return;
    }

    try {
        const response = await fetch("/api/items");

        if (!response.ok) {
            throw new Error(
                `Failed to load items (HTTP ${response.status}).`
            );
        }

        const items = await response.json();

        tableBody.replaceChildren();

        items.forEach(item => {
            const row = document.createElement("tr");

            row.innerHTML = `
                <td>${item.sku ?? ""}</td>
                <td>${item.description ?? ""}</td>
                <td>${item.make ?? ""}</td>
                <td>${item.model ?? ""}</td>
                <td class="noMobile">${item.weight ?? ""}</td>
                <td class="noMobile">${item.length ?? ""}</td>
                <td class="noMobile">${item.width ?? ""}</td>
                <td class="noMobile">${item.height ?? ""}</td>
                <td>${item.batchLot ?? ""}</td>
                <td>${item.productVersion ?? ""}</td>
                <td class="noMobile">${item.costPerItem ?? ""}</td>
                <td class="noMobile">${item.salePrice ?? ""}</td>
            `;

            tableBody.appendChild(row);
        });
    } catch (error) {
        console.error("Error loading items:", error);

        const row = document.createElement("tr");
        const cell = document.createElement("td");

        cell.colSpan = 12;
        cell.textContent = "Unable to load inventory items.";
        row.appendChild(cell);
        tableBody.replaceChildren(row);
    }
});
