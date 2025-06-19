const express = require("express");
const router = express.Router();
const Product = require("../models/Product");
const authMiddleware = require("../middleware/auth");
const multer = require("multer");
const path = require("path");

// Cấu hình multer để upload ảnh
const storage = multer.diskStorage({
  destination: "./uploads/",
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Giới hạn 5MB
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png/;
    const extname = filetypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = filetypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error("Only images (jpeg, jpg, png) are allowed"));
  },
});

// Middleware kiểm tra quyền admin
const isAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    console.log("isAdmin - Access denied for user:", req.user._id);
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
};

// Get all products
router.get("/", async (req, res) => {
  try {
    console.log("GET /products");
    const products = await Product.find();
    res.json(products);
  } catch (error) {
    console.error("GET /products - Error:", error);
    res.status(500).json({ message: error.message });
  }
});

// Get product by ID
router.get("/:id", async (req, res) => {
  try {
    console.log("GET /products/:id - ID:", req.params.id);
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.json(product);
  } catch (error) {
    console.error("GET /products/:id - Error:", error);
    res.status(500).json({ message: error.message });
  }
});

// Add product (admin only)
router.post(
  "/",
  authMiddleware,
  isAdmin,
  upload.single("image"),
  async (req, res) => {
    try {
      console.log("POST /products - Body:", req.body, "File:", req.file);
      const { name, price, description } = req.body;
      if (!name || !price) {
        return res.status(400).json({ message: "Name and price are required" });
      }
      const product = new Product({
        name,
        price: parseFloat(price),
        description,
        image: req.file ? `/uploads/${req.file.filename}` : null,
      });
      await product.save();
      console.log("POST /products - Product saved:", product);
      res.status(201).json(product);
    } catch (error) {
      console.error("POST /products - Error:", error);
      res.status(500).json({ message: error.message });
    }
  }
);

// Update product (admin only)
router.put(
  "/:id",
  authMiddleware,
  isAdmin,
  upload.single("image"),
  async (req, res) => {
    try {
      console.log(
        "PUT /products/:id - ID:",
        req.params.id,
        "Body:",
        req.body,
        "File:",
        req.file
      );
      const { name, price, description } = req.body;
      const updateData = {
        name,
        price: parseFloat(price),
        description,
      };
      if (req.file) {
        updateData.image = `/uploads/${req.file.filename}`;
      }
      const product = await Product.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true }
      );
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      console.log("PUT /products/:id - Product updated:", product);
      res.json(product);
    } catch (error) {
      console.error("PUT /products/:id - Error:", error);
      res.status(500).json({ message: error.message });
    }
  }
);

// Delete product (admin only)
router.delete("/:id", authMiddleware, isAdmin, async (req, res) => {
  try {
    console.log("DELETE /products/:id - ID:", req.params.id);
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    console.log("DELETE /products/:id - Product deleted:", product);
    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("DELETE /products/:id - Error:", error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
