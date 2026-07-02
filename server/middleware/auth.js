"use strict";
const jwt = require("jsonwebtoken");

const SECRET = process.env.JWT_SECRET;
if (!SECRET) throw new Error("JWT_SECRET is not set — copy server/.env.example to server/.env and set one");

function sign(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: "30d" });
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing bearer token" });
  try {
    req.auth = jwt.verify(token, SECRET);
    next();
  } catch (_) {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

module.exports = { sign, requireAuth };
