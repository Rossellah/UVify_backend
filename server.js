// ======================================================
// 🌤️ UVify Backend Server
// Technologies: Express.js + Drizzle ORM + PostgreSQL (Neon)
// ======================================================

import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { db } from "./db.js";
import { users, uv_readings } from "./shared/schema.js";
import { eq, desc } from "drizzle-orm";

// -------------------------
// 🔧 Setup
// -------------------------
dotenv.config();
const app = express();
const PORT = process.env.PORT || 4000;

// ======================================================
// 🌐 Middleware (CORS FIXED + AUTO VERCEL SUPPORT)
// ======================================================
const allowedOrigins = [
  "http://localhost:5173",
  "https://v0-v0uvifyfrontendmain4.vercel.app",
  "https://v0-v0uvifyfrontendmain.vercel.app",
  "https://v0-uv-ifyfrontend.vercel.app",
  "https://uv-ifyfrontend.vercel.app",
  "https://b5479d6e-0dba-409a-b84d-f50f8210e9c6-00-qg71uy0n0wv4.pike.replit.dev",
  "https://v0-uv-ifyfrontend-git-main-rossellah-s-projects.vercel.app",
  "https://v0-uv-ifyfrontend-eight.vercel.app" // ✅ NEW FRONTEND
];

app.use(
  cors({
    origin: (origin, callback) => {
      // ✅ Allow localhost, allowedOrigins, and any *.vercel.app subdomain
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        /\.vercel\.app$/.test(origin)
      ) {
        callback(null, true);
      } else {
        console.warn(`🚫 CORS blocked request from origin: ${origin}`);
        callback(new Error("CORS not allowed for this origin: " + origin));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.options("*", cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ======================================================
// 🧠 Temporary In-Memory Data for Live Dashboard
// ======================================================
let history = [];

// ======================================================
// ✅ API ROUTES
// ======================================================

app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

app.post("/register", async (req, res) => {
  const { username, password, email, first_name, last_name, phone } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, message: "Missing username or password" });
  }

  try {
    const result = await db
      .insert(users)
      .values({ username, password, email, first_name, last_name, phone })
      .returning();
    res.json({ success: true, user: result[0] });
  } catch (error) {
    console.error("❌ Error registering user:", error);
    res.status(500).json({ success: false, message: "Failed to register user" });
  }
});

app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const [user] = await db.select().from(users).where(eq(users.email, email));

    if (!user) return res.status(401).json({ success: false, message: "User not found" });
    if (user.password !== password)
      return res.status(401).json({ success: false, message: "Invalid password" });

    res.json({ success: true, user });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ success: false, message: "Server error during login" });
  }
});

app.post("/history/:userId", async (req, res) => {
  const { userId } = req.params;
  const { date, time, uvi, level } = req.body;
  if (!date || !time || uvi === undefined || !level) {
    return res.status(400).json({ success: false, message: "Missing required fields" });
  }

  try {
    const result = await db
      .insert(uv_readings)
      .values({ user_id: Number(userId), date, time, uvi: Number(uvi), level })
      .returning();
    res.json({ success: true, entry: result[0] });
  } catch (error) {
    console.error("❌ Error saving UV reading:", error);
    res.status(500).json({ success: false, message: "Failed to save UV reading" });
  }
});

app.get("/history/:userId", async (req, res) => {
  const { userId } = req.params;
  try {
    const results = await db
      .select()
      .from(uv_readings)
      .where(eq(uv_readings.user_id, Number(userId)))
      .orderBy(desc(uv_readings.created_at));
    res.json(results);
  } catch (error) {
    console.error("❌ Error fetching user history:", error);
    res.status(500).json({ success: false, message: "Failed to fetch history" });
  }
});

app.delete("/history/:userId", async (req, res) => {
  const { userId } = req.params;
  try {
    await db.delete(uv_readings).where(eq(uv_readings.user_id, Number(userId)));
    res.json({ success: true, message: "All readings deleted for user" });
  } catch (error) {
    console.error("❌ Error deleting readings:", error);
    res.status(500).json({ success: false, message: "Failed to delete readings" });
  }
});

app.get("/profile/:userId", async (req, res) => {
  const { userId } = req.params;
  try {
    const [user] = await db.select().from(users).where(eq(users.user_id, Number(userId)));
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, user });
  } catch (err) {
    console.error("❌ Error fetching profile:", err);
    res.status(500).json({ success: false, message: "Server error fetching profile" });
  }
});

app.put("/profile/:userId", async (req, res) => {
  const { userId } = req.params;
  const { first_name, last_name, email, phone } = req.body;

  try {
    const [existingUser] = await db.select().from(users).where(eq(users.user_id, Number(userId)));
    if (!existingUser) return res.status(404).json({ success: false, message: "User not found" });

    const updated = await db
      .update(users)
      .set({ first_name, last_name, email, phone })
      .where(eq(users.user_id, Number(userId)))
      .returning();

    res.json({ success: true, user: updated[0] });
  } catch (err) {
    console.error("❌ Error updating profile:", err);
    res.status(500).json({ success: false, message: "Server error updating profile" });
  }
});

// ======================================================
// 🚀 Start Server
// ======================================================
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ UVify Backend running on http://0.0.0.0:${PORT}`);
});
