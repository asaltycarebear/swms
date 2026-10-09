document.addEventListener("DOMContentLoaded", () => {
    const tableBody = document.querySelector("#itemsTable tbody");

    fetch("data/items.json")
        .then(response => {
            if (!response.ok) throw new Error("Failed to load JSON");
            return response.json();
        })
        .then(items => {
            items.forEach(item => {
                const row = document.createElement("tr");

                row.innerHTML = `
                    <td>${item.sku}</td>
                    <td>${item.description}</td>
                    <td>${item.make}</td>
                    <td>${item.model}</td>
                    <td class="noMobile">${item.weight}</td>
                    <td class="noMobile">${item.length}</td>
                    <td class="noMobile">${item.width}</td>
                    <td class="noMobile">${item.height}</td>
                    <td>${item.batchLot}</td>
                    <td>${item.productVersion}</td>
                    <td class="noMobile">${item.costPerItem}</td>
                    <td class="noMobile">${item.salePrice}</td>
                `;

                tableBody.appendChild(row);
            });
        })
        .catch(error => console.error("Error loading items:", error));
});
