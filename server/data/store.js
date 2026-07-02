"use strict";
/* Tiny JSON-file datastore — zero native dependencies, good enough for an MVP.
   Swap for Postgres/SQLite later without touching route code (same functions below). */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const FILE = path.join(__dirname, "db.json");

function empty() {
  return { users: [], families: [], familyData: [] };
}

function load() {
  if (!fs.existsSync(FILE)) return empty();
  try { return JSON.parse(fs.readFileSync(FILE, "utf8")); } catch (_) { return empty(); }
}

// Writes are serialized behind a promise chain so concurrent requests never interleave.
let writeChain = Promise.resolve();
function save(db) {
  writeChain = writeChain.then(() => fs.promises.writeFile(FILE, JSON.stringify(db, null, 2)));
  return writeChain;
}

function id() { return crypto.randomBytes(12).toString("hex"); }
function inviteCode() { return crypto.randomBytes(4).toString("hex").toUpperCase(); }

// ---------- users ----------
function findUserByEmail(email) {
  const db = load();
  return db.users.find(u => u.email.toLowerCase() === String(email).toLowerCase());
}

function findUserById(userId) {
  const db = load();
  return db.users.find(u => u.id === userId);
}

async function createUser({ email, name, passwordHash, familyId }) {
  const db = load();
  const user = { id: id(), email, name, passwordHash, familyId, createdAt: Date.now() };
  db.users.push(user);
  await save(db);
  return user;
}

// ---------- families ----------
async function createFamily(name) {
  const db = load();
  const family = { id: id(), name: name || "My Family", inviteCode: inviteCode(), createdAt: Date.now() };
  db.families.push(family);
  await save(db);
  return family;
}

function findFamilyByInviteCode(code) {
  const db = load();
  return db.families.find(f => f.inviteCode === String(code).toUpperCase());
}

function findFamilyById(familyId) {
  const db = load();
  return db.families.find(f => f.id === familyId);
}

function familyMembers(familyId) {
  const db = load();
  return db.users.filter(u => u.familyId === familyId).map(u => ({ id: u.id, name: u.name, email: u.email }));
}

// ---------- family-scoped key/value data ----------
function getFamilyData(familyId) {
  const db = load();
  const out = {};
  db.familyData.filter(d => d.familyId === familyId).forEach(d => { out[d.key] = d.value; });
  return out;
}

async function setFamilyDataKey(familyId, key, value) {
  const db = load();
  const row = db.familyData.find(d => d.familyId === familyId && d.key === key);
  if (row) { row.value = value; row.updatedAt = Date.now(); }
  else { db.familyData.push({ familyId, key, value, updatedAt: Date.now() }); }
  await save(db);
}

module.exports = {
  findUserByEmail, findUserById, createUser,
  createFamily, findFamilyByInviteCode, findFamilyById, familyMembers,
  getFamilyData, setFamilyDataKey,
};
