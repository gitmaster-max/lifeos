"use strict";
const express = require("express");
const store = require("../data/store");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

// GET /api/data — every key/value this family has synced
router.get("/", (req, res) => {
  res.json(store.getFamilyData(req.auth.familyId));
});

// PUT /api/data/:key { value } — upsert a single key
router.put("/:key", async (req, res) => {
  await store.setFamilyDataKey(req.auth.familyId, req.params.key, req.body ? req.body.value : undefined);
  res.json({ ok: true });
});

// POST /api/data/bulk { entries: { key: value, ... } } — used for the initial sync after sign-in
router.post("/bulk", async (req, res) => {
  const entries = (req.body && req.body.entries) || {};
  for (const [key, value] of Object.entries(entries)) {
    await store.setFamilyDataKey(req.auth.familyId, key, value);
  }
  res.json({ ok: true, count: Object.keys(entries).length });
});

module.exports = router;
