"use strict";
require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 4000;
const ORIGIN = process.env.CORS_ORIGIN || "*";

app.use(cors({ origin: ORIGIN }));
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ ok: true, service: "lifeos-server" }));
app.use("/api/auth", require("./routes/auth"));
app.use("/api/family", require("./routes/family"));
app.use("/api/data", require("./routes/data"));

app.use((req, res) => res.status(404).json({ error: "Not found" }));
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => console.log(`LifeOS API listening on http://localhost:${PORT}`));
