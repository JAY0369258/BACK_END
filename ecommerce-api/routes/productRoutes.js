const express = require("express");
const router = express.Router();
const Product = require("../models/Product");
const authMiddleware = require("../middleware/auth");
const multer = require("multer");
const path = require("path");

// Configure Multer to store files locally
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // Lưu vào thư mục uploads
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname)); // Tạo tên file duy nhất
  },
});
const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png/;
    const extname = filetypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = filetypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error("Only images (jpg, jpeg, png) are allowed"));
    }
  },
});

// Get all products
router.get("/", async (req, res) => {
  try {
    const products = await Product.find().populate("category");
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Search and filter products
router.get("/search", async (req, res) => {
  try {
    const {
      q,
      category,
      minPrice,
      maxPrice,
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      order = "desc",
    } = req.query;
    const query = {};
    if (q) query.name = { $regex: q, $options: "i" };
    if (category) query.category = category;
    if (minPrice) query.price = { ...query.price, $gte: parseFloat(minPrice) };
    if (maxPrice) query.price = { ...query.price, $lte: parseFloat(maxPrice) };
    const skip = (page - 1) * limit;
    const sort = { [sortBy]: order === "desc" ? -1 : 1 };
    const products = await Product.find(query)
      .populate("category")
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));
    const total = await Product.countDocuments(query);
    res.json({
      products,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create product (admin only)
router.post("/", authMiddleware, upload.single("image"), async (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ message: "Unauthorized" });
  try {
    const productData = {
      name: req.body.name,
      price: req.body.price,
      description: req.body.description,
      category: req.body.category,
      stock: req.body.stock,
      image: req.file ? `/uploads/${req.file.filename}` : null, // Lưu đường dẫn cục bộ
    };
    const product = new Product(productData);
    await product.save();
    res.status(201).json(product);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update product (admin only)
router.put("/:id", authMiddleware, upload.single("image"), async (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ message: "Unauthorized" });
  try {
    const productData = {
      name: req.body.name,
      price: req.body.price,
      description: req.body.description,
      category: req.body.category,
      stock: req.body.stock,
    };
    if (req.file) productData.image = `/uploads/${req.file.filename}`; // Cập nhật đường dẫn mới
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      productData,
      { new: true }
    );
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete product
router.delete("/:id", authMiddleware, async (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ message: "Unauthorized" });
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json({ message: "Product deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
