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
const lpnsFile = path.join(__dirname, "src", "data", "lpn.json");
const locationsFile = path.join(__dirname, "src", "data", "location.json");

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

// POST /api/lpns - receive a pallet and add it to lpn.json
app.post("/api/lpns", async (req, res) => {
    try {
        const submittedLpn = req.body;

        // Extract values from the LPN object sent by receive.js
        const sku = submittedLpn.SKU?.[0];
        const quantity = Number(submittedLpn.quantity?.[0]);
        const version = Number(submittedLpn["product version"]?.[0]);
        const batchLot = submittedLpn["batch lots"]?.[0];

        // Validate required values
        if (
            !submittedLpn.id ||
            !sku ||
            !Number.isInteger(quantity) ||
            quantity <= 0 ||
            !Number.isInteger(version) ||
            version < 0 ||
            batchLot === undefined ||
            batchLot === ""
        ) {
            return res.status(400).json({
                error: "A valid LPN, SKU, quantity, product version, and batch lot are required."
            });
        }

        // Read items.json
        const itemsContents = await fs.readFile(itemsFile, "utf8");
        const items = JSON.parse(itemsContents);

        // Only allow SKUs and versions that exist in items.json
        const matchedItem = items.find(
            item =>
                item.sku === sku &&
                Number(item.productVersion) === version
        );

        if (!matchedItem) {
            return res.status(400).json({
                error: "This SKU and product version do not exist in items.json."
            });
        }

        // Calculate the total weight on the server
        const itemWeight = Number(matchedItem.weight);

        if (!Number.isFinite(itemWeight) || itemWeight < 0) {
            return res.status(400).json({
                error: "The item's weight in items.json is invalid."
            });
        }

        const totalWeight = itemWeight * quantity;

        // Read existing LPN records
        const lpnContents = await fs.readFile(lpnsFile, "utf8");
        const lpns = JSON.parse(lpnContents);

        // Prevent duplicate LPN IDs
        if (lpns.some(existingLpn => existingLpn.id === submittedLpn.id)) {
            return res.status(409).json({
                error: "This LPN already exists."
            });
        }

        // Build the LPN record using the required structure
        const newLpn = {
            id: submittedLpn.id,
            SKU: [sku],
            quantity: [quantity],
            "quantity type": ["Each"],
            "product version": [version],
            "batch lots": [batchLot],
            weight: totalWeight
        };

        // Add the new LPN to lpn.json
        lpns.push(newLpn);

        await fs.writeFile(
            lpnsFile,
            JSON.stringify(lpns, null, 4) + "\n",
            "utf8"
        );

        return res.status(201).json({
            message: "Pallet received successfully.",
            lpn: newLpn
        });

    } catch (error) {
        console.error("Failed to save LPN:", error);

        return res.status(500).json({
            error: "Failed to save LPN. Check the backend console."
        });
    }
});

// POST /api/move-lpn - move an LPN to a different location
app.post("/api/move-lpn", async (req, res) => {
    try {
        const lpn = String(req.body.lpn || "").trim();
        const locationName = String(req.body.locationName || "").trim();

        if (!lpn || !locationName) {
            return res.status(400).json({
                error: "LPN number and destination location are required."
            });
        }

        // Read existing LPN records and verify that the LPN exists
        const lpnContents = await fs.readFile(lpnsFile, "utf8");
        const lpns = JSON.parse(lpnContents);

        const lpnExists = lpns.some(
            record => String(record.id) === lpn
        );

        if (!lpnExists) {
            return res.status(404).json({
                error: `LPN "${lpn}" does not exist in lpn.json.`
            });
        }

        // Read the warehouse locations
        const locationContents = await fs.readFile(locationsFile, "utf8");
        const locations = JSON.parse(locationContents);

        // Find the destination by its name, ignoring capitalization
        const destination = locations.find(
            location =>
                String(location.name).trim().toLowerCase() ===
                locationName.toLowerCase()
        );

        if (!destination) {
            return res.status(404).json({
                error: `Location "${locationName}" was not found in location.json.`
            });
        }

        // Check whether the destination permits multiple LPNs
        const destinationLpns = Array.isArray(destination.LPN)
            ? destination.LPN.map(value => String(value))
            : [];

        const allowsMultipleLpns =
            String(destination["multi-sku"]).toLowerCase() === "true";

        // If multiple LPNs are not allowed, reject a different existing LPN
        const hasDifferentLpn = destinationLpns.some(
            existingLpn => existingLpn !== lpn
        );

        if (!allowsMultipleLpns && hasDifferentLpn) {
            return res.status(409).json({
                error: `Location "${destination.name}" already contains an LPN and does not allow multiple LPNs.`
            });
        }

        // Remove this LPN from every location, including duplicate entries
        for (const location of locations) {
            if (!Array.isArray(location.LPN)) {
                location.LPN = [];
            }

            location.LPN = location.LPN.filter(
                existingLpn => String(existingLpn) !== lpn
            );
        }

        // Add the LPN to its destination
        destination.LPN.push(lpn);

        // Save the updated location data
        await fs.writeFile(
            locationsFile,
            JSON.stringify(locations, null, 4) + "\n",
            "utf8"
        );

        return res.status(200).json({
            message: "LPN moved successfully.",
            lpn,
            locationName: destination.name
        });

    } catch (error) {
        console.error("Failed to move LPN:", error);

        return res.status(500).json({
            error: "Failed to move LPN. Check the backend console."
        });
    }
});

app.listen(PORT, () => {
    console.log(`Inventory API running at http://localhost:${PORT}`);
});
