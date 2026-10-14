// required for backend json editor

import express from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Original data committed with the project.
// Used for local development and as the initial data source on Render.
const SOURCE_DATA_DIR = path.join(__dirname, "src", "data");

// Local: src/data
// Render: /var/data, configured using the DATA_DIR environment variable.
const DATA_DIR = process.env.DATA_DIR || SOURCE_DATA_DIR;

const itemsFile = path.join(DATA_DIR, "items.json");
const lpnsFile = path.join(DATA_DIR, "lpn.json");
const locationsFile = path.join(DATA_DIR, "location.json");

const distDirectory = path.join(__dirname, "dist");

app.use(express.json());

// Read a JSON file and return its contents.
async function readJsonFile(filePath) {
    const contents = await fs.readFile(filePath, "utf8");
    return JSON.parse(contents);
}

// Save an updated JSON array.
async function writeJsonFile(filePath, data) {
    await fs.writeFile(
        filePath,
        JSON.stringify(data, null, 4) + "\n",
        "utf8"
    );
}

async function initializeDataFiles() {
    await fs.mkdir(DATA_DIR, { recursive: true });

    const files = [
        "items.json",
        "lpn.json",
        "location.json",
    ];

    for (const filename of files) {
        const destination = path.join(DATA_DIR, filename);

        try {
            // If the destination exists, preserve its current data.
            await fs.access(destination);
        } catch (error) {
            if (error.code !== "ENOENT") {
                throw error;
            }

            const source = path.join(SOURCE_DATA_DIR, filename);

            // Fail safely if an original data file is missing.
            await fs.access(source);

            await fs.copyFile(source, destination);

            console.log(`Initialized ${filename} in ${DATA_DIR}`);
        }
    }
}

//GET endpoints
app.get("/api/items", async (req, res) => {
    try {
        res.json(await readJsonFile(itemsFile));
    } catch (error) {
        console.error("Failed to read items.json:", error);
        res.status(500).json({ error: "Could not read items." });
    }
});

app.get("/api/lpns", async (req, res) => {
    try {
        res.json(await readJsonFile(lpnsFile));
    } catch (error) {
        console.error("Failed to read lpn.json:", error);
        res.status(500).json({ error: "Could not read LPNs." });
    }
});

app.get("/api/locations", async (req, res) => {
    try {
        res.json(await readJsonFile(locationsFile));
    } catch (error) {
        console.error("Failed to read location.json:", error);
        res.status(500).json({ error: "Could not read locations." });
    }
});


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
        await writeJsonFile(itemsFile, items);

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
        const items = await readJsonFile(itemsFile);

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

        await writeJsonFile(lpnsFile, lpns);

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
        await writeJsonFile(locationsFile, locations);

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

// DELETE /api/lpns/:id - pull an LPN out of inventory.
app.delete("/api/lpns/:id", async (req, res) => {
    try {
        const lpnId = String(req.params.id || "").trim();

        if (!lpnId) {
            return res.status(400).json({
                error: "An LPN number is required.",
            });
        }

        const lpns = await readJsonFile(lpnsFile);

        const lpnIndex = lpns.findIndex(
            record => String(record.id).trim() === lpnId
        );

        if (lpnIndex === -1) {
            return res.status(404).json({
                error: `LPN "${lpnId}" was not found.`,
            });
        }

        const locations = await readJsonFile(locationsFile);

        // Remove the LPN from all location assignments.
        for (const location of locations) {
            if (Array.isArray(location.LPN)) {
                location.LPN = location.LPN.filter(
                    id => String(id).trim() !== lpnId
                );
            }
        }

        // Remove the LPN record itself.
        const [removedLpn] = lpns.splice(lpnIndex, 1);

        // Save the updated JSON data.
        await writeJsonFile(locationsFile, locations);
        await writeJsonFile(lpnsFile, lpns);

        return res.status(200).json({
            message: `LPN "${lpnId}" pulled successfully.`,
            lpn: removedLpn,
        });
    } catch (error) {
        console.error("Failed to pull LPN:", error);

        return res.status(500).json({
            error: "Failed to pull LPN. Check the backend console.",
        });
    }
});

// Serve the built Vite frontend.
app.use(express.static(distDirectory));

// Initialize data before accepting API requests.
initializeDataFiles()
    .then(() => {
        app.listen(PORT, "0.0.0.0", () => {
            console.log(`SWMS server running on port ${PORT}`);
            console.log(`JSON data directory: ${DATA_DIR}`);
            console.log("Server environment:", process.env.NODE_ENV);
            console.log("DATA_DIR:", DATA_DIR);
            console.log("Items file:", itemsFile);
            console.log("LPN file:", lpnsFile);
            console.log("Locations file:", locationsFile);
            console.log("Frontend directory:", distDirectory);
        });
    })
    .catch((error) => {
        console.error("Failed to initialize data files:", error);
        process.exit(1);
    });