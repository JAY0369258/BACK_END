const API_URL = "http://localhost:3000";

function getToken() {
  const token = localStorage.getItem("token");
  console.log("getToken - Token:", token);
  return token;
}

async function login() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const loginError = document.getElementById("login-error");
  console.log("login - Attempting with email:", email);
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });
    console.log("login - Response status:", response.status);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || "Failed to login");
    }
    const { token, role } = await response.json();
    console.log("login - Token received:", token, "Role:", role);
    localStorage.setItem("token", token);
    await updateUserStatus();
    alert("Logged in successfully!");
    if (role === "admin") {
      window.location.href = "admin.html";
    } else {
      window.location.href = "index.html";
    }
  } catch (error) {
    console.error("login - Error:", error);
    if (loginError) loginError.textContent = `Error: ${error.message}`;
  }
}

async function register() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const role = document.getElementById("role").value;
  const registerError = document.getElementById("register-error");
  console.log("register - Attempting with email:", email, "role:", role);
  try {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password, role }),
    });
    console.log("register - Response status:", response.status);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || "Failed to register");
    }
    const data = await response.json();
    console.log("register - Response:", data);
    alert("Registered successfully! Please login.");
    window.location.href = "login.html";
  } catch (error) {
    console.error("register - Error:", error);
    if (registerError) registerError.textContent = `Error: ${error.message}`;
  }
}

function logout() {
  console.log("logout - Removing token from localStorage");
  localStorage.removeItem("token");
  updateUserStatus();
  alert("Logged out successfully!");
  window.location.href = "login.html";
}

async function addToCart(productId) {
  const token = getToken();
  console.log("addToCart - Token:", token);
  console.log("addToCart - Product ID:", productId);
  if (!token) {
    console.log("addToCart - No token, redirecting to login.html");
    alert("Please login to add items to cart");
    window.location.href = "login.html";
    return;
  }
  try {
    console.log("addToCart - Sending POST /cart with body:", {
      productId,
      quantity: 1,
    });
    const response = await fetch(`${API_URL}/cart`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ productId, quantity: 1 }),
    });
    console.log("addToCart - Response status:", response.status);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("addToCart - Error response:", errorData);
      if (response.status === 401) {
        console.log(
          "addToCart - 401 Unauthorized, clearing token and redirecting"
        );
        localStorage.removeItem("token");
        alert("Session expired. Please login again.");
        window.location.href = "login.html";
        return;
      }
      throw new Error(
        errorData.message ||
          `Failed to add to cart (status: ${response.status})`
      );
    }
    const cart = await response.json();
    console.log("addToCart - Cart updated:", cart);
    alert("Product added to cart!");
    await fetchCart();
    await updateCartCount();
  } catch (error) {
    console.error("addToCart - Error:", error);
    alert(`Error adding to cart: ${error.message}`);
  }
}

async function fetchCart() {
  const token = getToken();
  if (!token) {
    console.log("fetchCart - No token, clearing cart display");
    const cartItems = document.getElementById("cart-items");
    if (cartItems)
      cartItems.innerHTML = "<p>Please login to view your cart.</p>";
    return;
  }
  try {
    console.log("fetchCart - Fetching cart from:", `${API_URL}/cart`);
    const response = await fetch(`${API_URL}/cart`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("fetchCart - Error response:", errorData);
      if (response.status === 401) {
        localStorage.removeItem("token");
        const cartItems = document.getElementById("cart-items");
        if (cartItems)
          cartItems.innerHTML = "<p>Session expired. Please login again.</p>";
        updateUserStatus();
        return;
      }
      throw new Error(errorData.message || "Failed to fetch cart");
    }
    const cart = await response.json();
    console.log("fetchCart - Cart data:", cart);
    const cartItems = document.getElementById("cart-items");
    if (!cartItems) {
      console.warn("fetchCart - Cart items element not found");
      return;
    }
    cartItems.innerHTML = "";
    if (!cart.items || cart.items.length === 0) {
      cartItems.innerHTML = "<p>Your cart is empty.</p>";
      return;
    }
    cart.items.forEach((item) => {
      const product = item.product;
      const div = document.createElement("div");
      div.className = "cart-item card mb-3";
      div.innerHTML = `
        <div class="card-body">
          ${
            product.image
              ? `<img src="${API_URL}${product.image}" alt="${product.name}" class="img-fluid mb-2" style="max-width: 80px;">`
              : ""
          }
          <h5 class="card-title">${product.name}</h5>
          <p class="card-text">Price: $${product.price}</p>
          <p class="card-text">Quantity: ${item.quantity}</p>
          <button class="btn btn-danger btn-sm" onclick="removeFromCart('${
            product._id
          }')">Remove</button>
        </div>
      `;
      cartItems.appendChild(div);
    });
    const totalPrice = cart.items.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0
    );
    const cartTotal = document.getElementById("cart-total");
    if (cartTotal) cartTotal.textContent = `Total: $${totalPrice.toFixed(2)}`;
  } catch (error) {
    console.error("fetchCart - Error:", error);
    const cartItems = document.getElementById("cart-items");
    if (cartItems)
      cartItems.innerHTML = `<p class="text-danger">Error loading cart: ${error.message}</p>`;
  }
}

async function removeFromCart(productId) {
  const token = getToken();
  if (!token) {
    alert("Please login to remove items from cart");
    window.location.href = "login.html";
    return;
  }
  try {
    console.log(
      "removeFromCart - Sending POST /cart/remove with productId:",
      productId
    );
    const response = await fetch(`${API_URL}/cart/remove`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ productId }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (response.status === 401) {
        localStorage.removeItem("token");
        alert("Session expired. Please login again.");
        window.location.href = "login.html";
        return;
      }
      throw new Error(errorData.message || "Failed to remove item");
    }
    alert("Item removed from cart!");
    await fetchCart();
    await updateCartCount();
  } catch (error) {
    console.error("removeFromCart - Error:", error);
    alert(`Error removing item: ${error.message}`);
  }
}

async function updateCartCount() {
  const cartCount = document.getElementById("cart-count");
  if (!cartCount) return;
  try {
    const token = getToken();
    if (!token) {
      cartCount.textContent = "0";
      return;
    }
    const response = await fetch(`${API_URL}/cart`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem("token");
        cartCount.textContent = "0";
        updateUserStatus();
        return;
      }
      throw new Error("Failed to fetch cart");
    }
    const cart = await response.json();
    cartCount.textContent = cart.items ? cart.items.length : 0;
    console.log("updateCartCount - Cart count:", cartCount.textContent);
  } catch (error) {
    console.error("updateCartCount - Error:", error);
    cartCount.textContent = "0";
  }
}

async function fetchProducts() {
  try {
    console.log("fetchProducts - Fetching products");
    const response = await fetch(`${API_URL}/products`);
    if (!response.ok) {
      throw new Error("Failed to fetch products");
    }
    const products = await response.json();
    console.log("fetchProducts - Products received:", products);
    const productList = document.getElementById("product-list");
    if (!productList) {
      console.warn("fetchProducts - Product list element not found");
      return;
    }
    productList.innerHTML = "";
    if (!Array.isArray(products) || products.length === 0) {
      productList.innerHTML = "<p>No products available.</p>";
      return;
    }
    products.forEach((product) => {
      const div = document.createElement("div");
      div.className = "card mb-3";
      div.innerHTML = `
        <div class="card-body">
          <h5 class="card-title">${product.name}</h5>
          <p class="card-text">Price: $${product.price.toFixed(2)}</p>
          <p class="card-text">Description: ${product.description || "N/A"}</p>
          <p class="card-text">Brand: ${
            product.brand || "N/A"
          }</p> <!-- Thêm hiển thị brand -->
          ${
            product.image
              ? `<img src="${API_URL}${product.image}" class="card-img-top" alt="${product.name}" style="max-width: 200px;">`
              : ""
          }
          <button class="btn btn-primary btn-sm" onclick="addToCart('${
            product._id
          }')">Add to Cart</button>
        </div>
      `;
      productList.appendChild(div);
    });
  } catch (error) {
    console.error("fetchProducts - Error:", error);
    const productList = document.getElementById("product-list");
    if (productList)
      productList.innerHTML = `<p class="text-danger">Error loading products: ${error.message}</p>`;
  }
}

async function updateUserStatus() {
  const userStatus = document.getElementById("user-status");
  const adminLink = document.getElementById("admin-link");
  const loginLink = document.getElementById("login-link");
  const logoutLink = document.getElementById("logout-link");

  const token = getToken();
  if (!token) {
    console.log("updateUserStatus - No token, setting status to Not logged in");
    if (userStatus) userStatus.textContent = "Not logged in";
    if (adminLink) adminLink.style.display = "none";
    if (loginLink) loginLink.style.display = "block";
    if (logoutLink) logoutLink.style.display = "none";
    return;
  }
  try {
    const user = await fetchCurrentUser();
    if (user) {
      console.log("updateUserStatus - User fetched:", user);
      if (userStatus) userStatus.textContent = `Logged in as ${user.role}`;
      if (adminLink)
        adminLink.style.display = user.role === "admin" ? "block" : "none";
      if (loginLink) loginLink.style.display = "none";
      if (logoutLink) logoutLink.style.display = "block";
      if (logoutLink) logoutLink.onclick = logout;
    } else {
      console.log("updateUserStatus - No user, clearing token");
      localStorage.removeItem("token");
      if (userStatus) userStatus.textContent = "Not logged in";
      if (adminLink) adminLink.style.display = "none";
      if (loginLink) loginLink.style.display = "block";
      if (logoutLink) logoutLink.style.display = "none";
    }
  } catch (error) {
    console.error("updateUserStatus - Error:", error);
    localStorage.removeItem("token");
    if (userStatus) userStatus.textContent = "Not logged in";
    if (adminLink) adminLink.style.display = "none";
    if (loginLink) loginLink.style.display = "block";
    if (logoutLink) logoutLink.style.display = "none";
  }
}

async function fetchCurrentUser() {
  try {
    const response = await fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (!response.ok) {
      console.error("fetchCurrentUser - Response not ok:", response.status);
      throw new Error("Failed to fetch user");
    }
    return await response.json();
  } catch (error) {
    console.error("fetchCurrentUser - Error:", error);
    return null;
  }
}

async function submitOrder() {
  const shippingForm = document.getElementById("shippingForm");
  if (!shippingForm.checkValidity()) {
    shippingForm.reportValidity();
    return;
  }
  const shippingInfo = {
    recipientName: document.getElementById("recipientName").value,
    street: document.getElementById("street").value,
    district: document.getElementById("district").value,
    city: document.getElementById("city").value,
    phone: document.getElementById("phone").value,
    notes: document.getElementById("notes").value,
  };
  const paymentMethod = document.querySelector(
    'input[name="paymentMethod"]:checked'
  ).value;
  console.log(
    "submitOrder - Shipping info:",
    shippingInfo,
    "Payment Method:",
    paymentMethod
  );
  try {
    await placeOrder(shippingInfo, paymentMethod);
    const modal = bootstrap.Modal.getInstance(
      document.getElementById("shippingModal")
    );
    modal.hide();
  } catch (error) {
    console.error("submitOrder - Error:", error);
    alert(`Error placing order: ${error.message}`);
  }
}

async function placeOrder(shippingInfo, paymentMethod) {
  const token = getToken();
  console.log("placeOrder - Token:", token);
  if (!token) {
    console.log("placeOrder - No token, redirecting to login.html");
    alert("Please login to place an order");
    window.location.href = "login.html";
    return;
  }
  try {
    console.log("placeOrder - Checking cart before placing order");
    const cartResponse = await fetch(`${API_URL}/cart`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!cartResponse.ok) {
      if (cartResponse.status === 401) {
        localStorage.removeItem("token");
        alert("Session expired. Please login again.");
        window.location.href = "login.html";
        return;
      }
      throw new Error("Failed to fetch cart");
    }
    const cart = await cartResponse.json();
    console.log("placeOrder - Cart data:", cart);
    if (!cart.items || cart.items.length === 0) {
      alert("Your cart is empty. Add products before placing an order.");
      return;
    }
    console.log(
      "placeOrder - Sending POST /orders with shipping info and payment method:",
      shippingInfo,
      paymentMethod
    );
    const response = await fetch(`${API_URL}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ shippingInfo, paymentMethod }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("placeOrder - Error response:", errorData);
      if (response.status === 401) {
        localStorage.removeItem("token");
        alert("Session expired. Please login again.");
        window.location.href = "login.html";
        return;
      }
      throw new Error(errorData.message || "Failed to place order");
    }
    const order = await response.json();
    console.log("placeOrder - Order created:", order);
    alert("Order placed successfully!");
    await fetchCart();
    await updateCartCount();
    window.location.href = "orders.html";
  } catch (error) {
    console.error("placeOrder - Error:", error);
    throw error;
  }
}

async function fetchAdminProducts() {
  const token = getToken();
  if (!token) {
    alert("Please login to view products");
    window.location.href = "login.html";
    return;
  }
  try {
    console.log("fetchAdminProducts - Fetching products");
    const response = await fetch(`${API_URL}/products`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      throw new Error("Failed to fetch products");
    }
    const products = await response.json();
    console.log("fetchAdminProducts - Products received:", products);
    const productList = document.getElementById("product-list");
    if (!productList) {
      console.warn("fetchAdminProducts - Product list element not found");
      return;
    }
    productList.innerHTML = "";
    if (!Array.isArray(products) || products.length === 0) {
      productList.innerHTML = "<p>No products available.</p>";
      return;
    }
    products.forEach((product) => {
      const div = document.createElement("div");
      div.className = "card mb-3";
      div.innerHTML = `
        <div class="card-body">
          <h5 class="card-title">${product.name}</h5>
          <p class="card-text">Price: $${product.price.toFixed(2)}</p>
          <p class="card-text">Description: ${product.description || "N/A"}</p>
          <p class="card-text">Brand: ${
            product.brand || "N/A"
          }</p> <!-- Thêm hiển thị brand -->
          <p class="card-text">Image: ${
            product.image
              ? `<img src="${API_URL}${product.image}" width="100">`
              : "N/A"
          }</p>
          <button class="btn btn-info btn-sm" onclick="editProduct('${
            product._id
          }')">Edit</button>
          <button class="btn btn-danger btn-sm" onclick="deleteProduct('${
            product._id
          }')">Delete</button>
        </div>
      `;
      productList.appendChild(div);
    });
  } catch (error) {
    console.error("fetchAdminProducts - Error:", error);
    const productList = document.getElementById("product-list");
    if (productList)
      productList.innerHTML = `<p class="text-danger">Error loading products: ${error.message}</p>`;
  }
}

async function addProduct(formData) {
  const token = getToken();
  if (!token) {
    alert("Please login to add products");
    window.location.href = "login.html";
    return;
  }
  try {
    console.log("addProduct - Sending POST /products with formData");
    const response = await fetch(`${API_URL}/products`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (response.status === 401) {
        localStorage.removeItem("token");
        alert("Session expired. Please login again.");
        window.location.href = "login.html";
        return;
      }
      throw new Error(errorData.message || "Failed to add product");
    }
    const product = await response.json();
    console.log("addProduct - Product added:", product);
    alert("Product added successfully!");
    fetchAdminProducts();
  } catch (error) {
    console.error("addProduct - Error:", error);
    alert(`Error adding product: ${error.message}`);
  }
}

async function updateProduct(productId, formData) {
  const token = getToken();
  if (!token) {
    alert("Please login to update products");
    window.location.href = "login.html";
    return;
  }
  try {
    console.log("updateProduct - Sending PUT /products/" + productId);
    const response = await fetch(`${API_URL}/products/${productId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (response.status === 401) {
        localStorage.removeItem("token");
        alert("Session expired. Please login again.");
        window.location.href = "login.html";
        return;
      }
      throw new Error(errorData.message || "Failed to update product");
    }
    const product = await response.json();
    console.log("updateProduct - Product updated:", product);
    alert("Product updated successfully!");
    fetchAdminProducts();
  } catch (error) {
    console.error("updateProduct - Error:", error);
    alert(`Error updating product: ${error.message}`);
  }
}

async function deleteProduct(productId) {
  if (!confirm("Are you sure you want to delete this product?")) return;
  const token = getToken();
  if (!token) {
    alert("Please login to delete products");
    window.location.href = "login.html";
    return;
  }
  try {
    console.log("deleteProduct - Sending DELETE /products/" + productId);
    const response = await fetch(`${API_URL}/products/${productId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (response.status === 401) {
        localStorage.removeItem("token");
        alert("Session expired. Please login again.");
        window.location.href = "login.html";
        return;
      }
      throw new Error(errorData.message || "Failed to delete product");
    }
    console.log("deleteProduct - Product deleted:", productId);
    alert("Product deleted successfully!");
    fetchAdminProducts();
  } catch (error) {
    console.error("deleteProduct - Error:", error);
    alert(`Error deleting product: ${error.message}`);
  }
}

async function editProduct(productId) {
  const token = getToken();
  if (!token) {
    alert("Please login to edit products");
    window.location.href = "login.html";
    return;
  }
  try {
    console.log("editProduct - Fetching product:", productId);
    const response = await fetch(`${API_URL}/products/${productId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      throw new Error("Failed to fetch product");
    }
    const product = await response.json();
    console.log("editProduct - Product fetched:", product);
    document.getElementById("form-title").textContent = "Edit Product";
    document.getElementById("productId").value = product._id;
    document.getElementById("name").value = product.name;
    document.getElementById("price").value = product.price;
    document.getElementById("description").value = product.description || "";
    document.getElementById("brand").value = product.brand || ""; // Thêm trường brand
    document.getElementById("image").value = "";
    document.getElementById("submitProduct").textContent = "Update Product";
    document.getElementById("cancelEdit").style.display = "inline-block";
  } catch (error) {
    console.error("editProduct - Error:", error);
    alert(`Error fetching product: ${error.message}`);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const productForm = document.getElementById("productForm");
  const cancelEdit = document.getElementById("cancelEdit");
  if (productForm) {
    productForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const productId = document.getElementById("productId").value;
      const formData = new FormData();
      formData.append("name", document.getElementById("name").value);
      formData.append("price", document.getElementById("price").value);
      formData.append(
        "description",
        document.getElementById("description").value
      );
      const imageFile = document.getElementById("image").files[0];
      if (imageFile) formData.append("image", imageFile);
      console.log("Product form submitted - Product ID:", productId);
      if (productId) {
        await updateProduct(productId, formData);
      } else {
        await addProduct(formData);
      }
      productForm.reset();
      document.getElementById("productId").value = "";
      document.getElementById("form-title").textContent = "Add Product";
      document.getElementById("submitProduct").textContent = "Save Product";
      document.getElementById("cancelEdit").style.display = "none";
    });
  }
  if (cancelEdit) {
    cancelEdit.addEventListener("click", () => {
      productForm.reset();
      document.getElementById("productId").value = "";
      document.getElementById("form-title").textContent = "Add Product";
      document.getElementById("submitProduct").textContent = "Save Product";
      document.getElementById("cancelEdit").style.display = "none";
    });
  }
});
///
async function fetchAdminOrders() {
  const token = getToken();
  if (!token) {
    console.log("fetchAdminOrders - No token, redirecting to login.html");
    window.location.href = "login.html";
    return;
  }
  try {
    console.log(
      "fetchAdminOrders - Fetching orders from:",
      `${API_URL}/orders`
    );
    const response = await fetch(`${API_URL}/orders`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (response.status === 401) {
        localStorage.removeItem("token");
        alert("Session expired. Please login again.");
        window.location.href = "login.html";
        return;
      }
      throw new Error(errorData.message || "Failed to fetch orders");
    }
    const orders = await response.json();
    console.log("fetchAdminOrders - Orders received:", orders);
    const orderList = document.getElementById("order-list");
    if (!orderList) {
      console.warn("fetchAdminOrders - Order list element not found");
      return;
    }
    orderList.innerHTML = "";
    if (orders.length === 0) {
      orderList.innerHTML = "<p>No orders available.</p>";
      return;
    }
    orders.forEach((order) => {
      const div = document.createElement("div");
      div.className = "order card mb-3 col-md-12";
      div.innerHTML = `
        <div class="card-body">
          <h5 class="card-title">Order #${order._id}</h5>
          <p class="card-text">Customer Email: ${
            order.user ? order.user.email : "N/A"
          }</p>
          <p class="card-text">Recipient: ${
            order.shippingInfo
              ? order.shippingInfo.recipientName || "N/A"
              : "N/A"
          }</p>
          <p class="card-text">Phone: ${
            order.shippingInfo ? order.shippingInfo.phone || "N/A" : "N/A"
          }</p>
          <p class="card-text">Address: ${
            order.shippingInfo
              ? [
                  order.shippingInfo.street,
                  order.shippingInfo.district,
                  order.shippingInfo.city,
                ]
                  .filter(Boolean)
                  .join(", ") || "N/A"
              : "N/A"
          }</p>
          <p class="card-text">Total: $${(order.totalPrice || 0).toFixed(2)}</p>
          <p class="card-text">Status: ${order.status || "N/A"}</p>
          <p class="card-text">Payment Method: ${
            order.paymentMethod || "N/A"
          }</p>
          <p class="card-text">Created: ${
            order.createdAt ? new Date(order.createdAt).toLocaleString() : "N/A"
          }</p>
          <button class="btn btn-info btn-sm me-2" onclick="viewOrderDetails('${
            order._id
          }')">View Details</button>
          <button class="btn btn-warning btn-sm me-2" onclick="updateOrderStatus('${
            order._id
          }')">Update Status</button>
        </div>
      `;
      orderList.appendChild(div);
    });
  } catch (error) {
    console.error("fetchAdminOrders - Error:", error);
    const orderList = document.getElementById("order-list");
    if (orderList)
      orderList.innerHTML = `<p class="text-danger">Error loading orders: ${error.message}</p>`;
  }
}
async function viewOrderDetails(orderId) {
  const token = getToken();
  if (!token) {
    alert("Please login to view order details");
    window.location.href = "login.html";
    return;
  }
  try {
    console.log("viewOrderDetails - Fetching order:", orderId);
    const response = await fetch(`${API_URL}/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      throw new Error("Failed to fetch order details");
    }
    const order = await response.json();
    console.log("viewOrderDetails - Order fetched:", order);
    alert(
      `Order Details:\nTotal: $${order.total.toFixed(2)}\nStatus: ${
        order.status
      }\nShipping: ${JSON.stringify(order.shippingInfo)}\nItems: ${order.items
        .map((item) => `${item.product.name} x${item.quantity}`)
        .join(", ")}`
    );
  } catch (error) {
    console.error("viewOrderDetails - Error:", error);
    alert(`Error fetching order details: ${error.message}`);
  }
}
async function updateOrderStatus(orderId) {
  const token = getToken();
  if (!token) {
    alert("Please login to update order status");
    window.location.href = "login.html";
    return;
  }
  const newStatus = prompt(
    "Enter new status (processing/completed/cancelled):"
  );
  if (
    !newStatus ||
    !["processing", "completed", "cancelled"].includes(newStatus)
  ) {
    alert("Invalid status!");
    return;
  }
  try {
    console.log(
      "updateOrderStatus - Updating order:",
      orderId,
      "to status:",
      newStatus
    );
    const response = await fetch(`${API_URL}/orders/${orderId}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status: newStatus }),
    });
    if (!response.ok) {
      throw new Error("Failed to update order status");
    }
    const order = await response.json();
    console.log("updateOrderStatus - Order updated:", order);
    alert("Order status updated successfully!");
    fetchAdminOrders();
  } catch (error) {
    console.error("updateOrderStatus - Error:", error);
    alert(`Error updating order status: ${error.message}`);
  }
}
async function generateReport() {
  const token = getToken();
  if (!token) {
    console.log("generateReport - No token, redirecting to login.html");
    window.location.href = "login.html";
    return;
  }
  try {
    console.log(
      "generateReport - Fetching orders for report from:",
      `${API_URL}/orders`
    );
    const response = await fetch(`${API_URL}/orders`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || "Failed to fetch orders for report");
    }
    const orders = await response.json();
    console.log("generateReport - Orders received:", orders);

    const totalRevenue = orders.reduce(
      (sum, order) => sum + (order.totalPrice || 0),
      0
    );
    const totalOrders = orders.length;

    document.getElementById(
      "total-revenue"
    ).textContent = `$${totalRevenue.toFixed(2)}`;
    document.getElementById("total-orders").textContent = totalOrders;

    const detailedReport = document.getElementById("detailed-report");
    detailedReport.innerHTML = "<h6>Detailed Report</h6><ul>";
    orders.forEach((order) => {
      detailedReport.innerHTML += `<li>Order #${order._id}: $${(
        order.totalPrice || 0
      ).toFixed(2)} - ${order.status} (${new Date(
        order.createdAt
      ).toLocaleDateString()})</li>`;
    });
    detailedReport.innerHTML += "</ul>";
  } catch (error) {
    console.error("generateReport - Error:", error);
    const reportContent = document.getElementById("report-content");
    if (reportContent)
      reportContent.innerHTML = `<p class="text-danger">Error generating report: ${error.message}</p>`;
  }
}
async function fetchOrders() {
  const token = getToken();
  if (!token) {
    console.log("fetchOrders - No token, redirecting to login.html");
    window.location.href = "login.html";
    return;
  }
  try {
    console.log(
      "fetchOrders - Fetching orders from:",
      `${API_URL}/orders/user`
    );
    const response = await fetch(`${API_URL}/orders/user`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (response.status === 401) {
        localStorage.removeItem("token");
        alert("Session expired. Please login again.");
        window.location.href = "login.html";
        return;
      }
      throw new Error(errorData.message || "Failed to fetch orders");
    }
    const orders = await response.json();
    console.log("fetchOrders - Orders received:", orders); // Debug log
    const orderList = document.getElementById("order-list");
    if (!orderList) {
      console.warn("fetchOrders - Order list element not found");
      return;
    }
    orderList.innerHTML = "";
    if (!Array.isArray(orders) || orders.length === 0) {
      orderList.innerHTML = "<p>No orders available.</p>";
      return;
    }
    orders.forEach((order) => {
      if (!order || typeof order !== "object") {
        console.warn("fetchOrders - Invalid order data:", order);
        return;
      }
      const div = document.createElement("div");
      div.className = "order card mb-3 col-md-12";
      div.innerHTML = `
        <div class="card-body">
          <h5 class="card-title">Order #${order._id || "N/A"}</h5>
          <p class="card-text">Total: $${(order.totalPrice != null
            ? order.totalPrice
            : 0
          ).toFixed(2)}</p>
          <p class="card-text">Status: ${order.status || "N/A"}</p>
          <p class="card-text">Payment Method: ${
            order.paymentMethod || "N/A"
          }</p>
          <p class="card-text">Created: ${
            order.createdAt ? new Date(order.createdAt).toLocaleString() : "N/A"
          }</p>
          <p class="card-text">Recipient: ${
            order.shippingInfo
              ? order.shippingInfo.recipientName || "N/A"
              : "N/A"
          }</p>
          <p class="card-text">Phone: ${
            order.shippingInfo ? order.shippingInfo.phone || "N/A" : "N/A"
          }</p>
          <p class="card-text">Address: ${
            order.shippingInfo
              ? [
                  order.shippingInfo.street,
                  order.shippingInfo.district,
                  order.shippingInfo.city,
                ]
                  .filter(Boolean)
                  .join(", ") || "N/A"
              : "N/A"
          }</p>
          <button class="btn btn-info btn-sm" onclick="viewOrderDetails('${
            order._id || ""
          }')">View Details</button>
        </div>
      `;
      orderList.appendChild(div);
    });
  } catch (error) {
    console.error("fetchOrders - Error:", error);
    const orderList = document.getElementById("order-list");
    if (orderList)
      orderList.innerHTML = `<p class="text-danger">Error loading orders: ${error.message}</p>`;
  }
}
