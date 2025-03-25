require("dotenv").config({ path: "./.env" }); // Load environment variables
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("./models/User");

const app = express();
const PORT = process.env.PORT || 3001;
const SECRET_KEY = process.env.SECRET_KEY || "default_secret_key";
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/authDB";

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect to MongoDB
mongoose
    .connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("✅ MongoDB Connected"))
    .catch((err) => console.error("❌ MongoDB Connection Error:", err));

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1]; // Handle Bearer token
    if (!token) return res.status(401).json({ message: "Access denied. No token provided." });

    jwt.verify(token, SECRET_KEY, (err, decoded) => {
        if (err) return res.status(403).json({ message: "Invalid or expired token" });
        req.user = decoded;
        next();
    });
};

// Register Route
app.post("/register", async (req, res) => {
    const { name, email, password } = req.body;

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ message: "User already exists" });

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ name, email, password: hashedPassword });
        await newUser.save();

        res.status(201).json({ message: "User registered successfully" });
    } catch (err) {
        console.error("Register Error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// Login Route
app.post("/login", async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: "User not found" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

        const token = jwt.sign({ id: user._id }, SECRET_KEY, { expiresIn: "1h" });
        res.json({ message: "Success", token });
    } catch (err) {
        console.error("Login Error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// Protected Route for Invoice Generation
app.get("/generate", verifyToken, (req, res) => {
    res.json({ message: "Access granted to generate page" });
});

// Start Server
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
