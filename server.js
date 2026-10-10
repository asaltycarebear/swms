// required for backend json editor
// Installed exspress and cors for backend operation

import express from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";

const app = express();
const PORT = 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const itemsFile = path.join(__dirname, "src", "data", "items.json");

app.use(cors({
    origin: "http://localhost:5173"
}));

app.use(express.json());

// POST /api/items - add a new item to items.json
app.post("/api/items", async (req, res) => {
    try {
        const newItem = req.body;

        if (!newItem.sku || !newItem.description) {
            return res.status(400).json({
                error: "SKU and description are required."
            });
        }

        // Read the existing JSON array.
        const fileContents = await fs.readFile(itemsFile, "utf8");
        const items = JSON.parse(fileContents);

        // Prevent duplicate SKUs.
        if (items.some(item => item.sku === newItem.sku)) {
            return res.status(409).json({
                error: "An item with this SKU already exists."
            });
        }

        // Add the new item.
        items.push(newItem);

        // Write the updated array back to items.json.
        await fs.writeFile(
            itemsFile,
            JSON.stringify(items, null, 4) + "\n",
            "utf8"
        );

        return res.status(201).json({
            message: "Item added successfully.",
            item: newItem
        });
    } catch (error) {
        console.error("Failed to update items.json:", error);

        return res.status(500).json({
            error: "Failed to update items.json."
        });
    }
});

app.listen(PORT, () => {
    console.log(`Inventory API running at http://localhost:${PORT}`);
});
