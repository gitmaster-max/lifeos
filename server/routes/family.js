"use strict";
const express = require("express");
const store = require("../data/store");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

// GET /api/family/me — family info + member list
router.get("/me", (req, res) => {
  const family = store.findFamilyById(req.auth.familyId);
  if (!family) return res.status(404).json({ error: "Family not found" });
  res.json({
    id: family.id,
    name: family.name,
    inviteCode: family.inviteCode,
    members: store.familyMembers(family.id),
  });
});

module.exports = router;
