export function notFoundHandler(req, res) {
  if (req.path.startsWith("/api/")) {
    res.status(404).json({ error: "API endpoint not found" });
  } else {
    res.status(404).send("Not found");
  }
}
