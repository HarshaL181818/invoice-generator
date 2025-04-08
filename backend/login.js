require("dotenv").config({ path: "./.env" });
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { PDFDocument } = require("pdf-lib");
const mime = require("mime-types");

const User = require("./models/User");
const Request = require("./models/Request");

const app = express();
const PORT = process.env.PORT || 3001;
const SECRET_KEY = process.env.SECRET_KEY || "default_secret_key";
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/authDB";

// Middleware
app.use(cors({
  origin: "http://localhost:3000",
  credentials: true,
  methods: "GET,POST,PUT,DELETE,OPTIONS",
  allowedHeaders: "Content-Type,Authorization"
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// MongoDB connection
mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

// JWT Middleware
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Access denied. No token provided." });

  jwt.verify(token, SECRET_KEY, (err, decoded) => {
    if (err) return res.status(403).json({ message: "Invalid or expired token" });
    req.user = decoded;
    next();
  });
};

// Multer setup (only PDFs allowed)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "uploads");
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}_${file.originalname}`;
    cb(null, uniqueName);
  }
});
const fileFilter = (req, file, cb) => {
  if (file.mimetype === "application/pdf") {
    cb(null, true);
  } else {
    cb(new Error("Only PDF files are allowed"), false);
  }
};
const upload = multer({ storage, fileFilter });

// Register
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

// Login
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: user._id, email: user.email }, SECRET_KEY, { expiresIn: "1h" });
    res.json({ message: "Success", token });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Upload invoice
app.post("/requests", upload.single("file"), async (req, res) => {
  try {
    const { invoiceNumber, clientName, amount, date, status } = req.body;
    const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;

    const newRequest = new Request({
      invoiceNumber,
      clientName,
      amount,
      date,
      status,
      filePath: fileUrl
    });

    await newRequest.save();
    res.status(201).json({ message: "Invoice submitted for approval", fileUrl });
  } catch (err) {
    console.error("Upload Error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Preview any uploaded PDF inline
app.get("/preview/:filename", (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, "uploads", filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send("File not found");
  }

  const fileMime = mime.lookup(filePath) || "application/pdf";
  res.setHeader("Content-Type", fileMime);
  res.setHeader("Content-Disposition", `inline; filename="${filename}"`);

  fs.createReadStream(filePath).pipe(res);
});

// Approve request & add stamp
app.post("/requests/approve/:id", async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);
    if (!request) return res.status(404).json({ message: "Request not found" });

    const fileName = path.basename(request.filePath);
    const originalPath = path.join(__dirname, "uploads", fileName);

    const stampedFileName = `stamped_${fileName}`;
    const stampedPath = path.join(__dirname, "uploads", stampedFileName);
    const logoPath = path.join(__dirname, "assets", "logo.png");

    const pdfDoc = await PDFDocument.load(fs.readFileSync(originalPath));
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];

    const pngImage = await pdfDoc.embedPng(fs.readFileSync(logoPath));
    const { width, height } = pngImage.scale(0.2);
    firstPage.drawImage(pngImage, {
      x: firstPage.getWidth() - width - 50,
      y: 50,
      width,
      height,
    });

    const stampedBytes = await pdfDoc.save();
    fs.writeFileSync(stampedPath, stampedBytes);

    const stampedUrl = `${req.protocol}://${req.get("host")}/uploads/${stampedFileName}`;
    request.status = "approved";
    request.filePath = stampedUrl;
    await request.save();

    res.json({
      message: "Invoice approved and stamped",
      stampedUrl,
      previewUrl: `${req.protocol}://${req.get("host")}/preview/${stampedFileName}`
    });
  } catch (err) {
    console.error("Approval Error:", err);
    res.status(500).json({ message: "Server error during approval" });
  }
});

// Get all requests
app.get("/requests", async (req, res) => {
  try {
    const requests = await Request.find();
    res.status(200).json(requests);
  } catch (err) {
    console.error("Fetch Requests Error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
