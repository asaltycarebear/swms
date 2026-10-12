const response = await fetch(
    `/api/lpns/${encodeURIComponent(lpn)}`,
    {
        method: "DELETE"
    }
);

const result = await response.json();

if (!response.ok) {
    throw new Error(result.error || "Failed to pull LPN.");
}