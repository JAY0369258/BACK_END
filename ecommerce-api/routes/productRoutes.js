const express = require("express");
const router = express.Router();
const Product = require("../models/Product");
const authMiddleware = require("../middleware/auth");
const multer = require("multer");
const path = require("path");

// Configure Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});
const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (!file || !file.originalname) {
      return cb(new Error("No file provided or invalid file"));
    }
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
// Get all products
router.get("/", async (req, res) => {
  try {
    console.log("Fetching products...");
    const products = await Product.find()
      .populate({
        path: "category",
        select: "name description", // Chỉ lấy các trường cần thiết
      })
      .lean();
    console.log("Products fetched:", products.length);
    if (!products || products.length === 0) {
      return res.status(200).json([]); // Trả về mảng rỗng nếu không có sản phẩm
    }
    res.json(products);
  } catch (error) {
    console.error("Error fetching products:", error);
    res
      .status(500)
      .json({ message: `Failed to fetch products: ${error.message}` });
  }
});

// Other routes (giữ nguyên)
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate("category");
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.json(product);
  } catch (error) {
    console.error("Error fetching product:", error);
    res.status(500).json({ message: error.message });
  }
});

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
    console.error("Error searching products:", error);
    res.status(500).json({ message: error.message });
  }
});

router.post("/", authMiddleware, upload.single("image"), async (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ message: "Unauthorized" });
  try {
    const productData = {
      name: req.body.name,
      price: parseFloat(req.body.price),
      description: req.body.description,
      category: req.body.category,
      stock: parseInt(req.body.stock),
      image: req.file ? `/uploads/${req.file.filename}` : null,
    };
    if (
      !productData.name ||
      !productData.price ||
      !productData.category ||
      !productData.stock
    ) {
      return res.status(400).json({ message: "Missing required fields" });
    }
    const product = new Product(productData);
    await product.save();
    res.status(201).json(product);
  } catch (error) {
    console.error("Error creating product:", error);
    res.status(400).json({ message: error.message });
  }
});

router.put("/:id", authMiddleware, upload.single("image"), async (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ message: "Unauthorized" });
  try {
    const productData = {
      name: req.body.name,
      price: parseFloat(req.body.price),
      description: req.body.description,
      category: req.body.category,
      stock: parseInt(req.body.stock),
    };
    if (req.file) {
      const product = await Product.findById(req.params.id);
      if (!product)
        return res.status(404).json({ message: "Product not found" });
      if (product.image) {
        const fs = require("fs").promises;
        const oldImagePath = path.join(__dirname, "..", product.image);
        try {
          await fs.unlink(oldImagePath);
        } catch (err) {
          console.error("Error deleting old image:", err);
        }
      }
      productData.image = `/uploads/${req.file.filename}`;
    }
    if (
      !productData.name ||
      !productData.price ||
      !productData.category ||
      !productData.stock
    ) {
      return res.status(400).json({ message: "Missing required fields" });
    }
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      productData,
      { new: true }
    ).populate("category");
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(400).json({ message: error.message });
  }
});

router.delete("/:id", authMiddleware, async (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ message: "Unauthorized" });
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json({ message: "Product deleted" });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
