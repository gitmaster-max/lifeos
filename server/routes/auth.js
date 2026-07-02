"use strict";
const express = require("express");
const bcrypt = require("bcryptjs");
const store = require("../data/store");
const { sign } = require("../middleware/auth");

const router = express.Router();

function isValidEmail(email) {
  return typeof email === "string" && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}

async function respondWithSession(res, user) {
  const family = store.findFamilyById(user.familyId);
  res.json({
    token: sign({ userId: user.id, familyId: user.familyId }),
    user: { id: user.id, name: user.name, email: user.email },
    family: { id: family.id, name: family.name, inviteCode: family.inviteCode },
  });
}

// POST /api/auth/signup { email, password, name, inviteCode? }
router.post("/signup", async (req, res) => {
  const { email, password, name, inviteCode } = req.body || {};
  if (!isValidEmail(email)) return res.status(400).json({ error: "Enter a valid email" });
  if (!password || password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters" });
  if (store.findUserByEmail(email)) return res.status(409).json({ error: "An account with this email already exists" });

  let family;
  if (inviteCode) {
    family = store.findFamilyByInviteCode(inviteCode);
    if (!family) return res.status(404).json({ error: "Invite code not found" });
  } else {
    family = await store.createFamily(name ? name + "'s Family" : undefined);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await store.createUser({ email, name: name || email.split("@")[0], passwordHash, familyId: family.id });
  respondWithSession(res, user);
});

// POST /api/auth/login { email, password }
router.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  const user = store.findUserByEmail(email || "");
  if (!user) return res.status(401).json({ error: "Invalid email or password" });
  const ok = await bcrypt.compare(password || "", user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Invalid email or password" });
  respondWithSession(res, user);
});

module.exports = router;
