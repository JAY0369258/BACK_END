const API_URL = "http://localhost:3000";

// Get token from localStorage
function getToken() {
  return localStorage.getItem("token");
}

// Update user status in navigation
function updateUserStatus() {
  const userStatus = document.getElementById("user-status");
  userStatus.textContent = getToken() ? "Logged in" : "Not logged in";
}

//fetchProduct
async function fetchProducts() {
  try {
    const searchQuery = document.getElementById("search")?.value || "";
    const url = searchQuery
      ? `${API_URL}/products/search?q=${encodeURIComponent(searchQuery)}`
      : `${API_URL}/products`;
    console.log("Fetching products from:", url);
    const response = await fetch(url);
    if (!response.ok) throw new Error("Failed to fetch products");
    const data = await response.json();
    console.log("Response data:", data);
    const products = searchQuery ? data.products : data;
    const productList = document.getElementById("product-list");
    if (!productList) {
      console.error("product-list element not found");
      return;
    }
    productList.innerHTML = "";
    products.forEach((product) => {
      const div = document.createElement("div");
      div.className = "product card mb-3";
      div.innerHTML = `
        <div class="card-body">
          ${product.image
            ? `<img src="${API_URL}${product.image}" alt="${product.name}" class="img-fluid mb-3" style="max-width: 200px; border-radius: 5px;">`
            : '<p class="text-muted">No image available</p>'
          }
          <h3 class="card-title">${product.name}</h3>
          <p class="card-text">Price: $${product.price}</p>
          <p class="card-text">Description: ${product.description || 'No description'}</p>
          <p class="card-text">Category: ${product.category?.name || 'Unknown'}</p>
          <p class="card-text">Stock: ${product.stock}</p>
          <button class="btn btn-primary" onclick="addToCart('${product._id}')">Add to Cart</button>
        </div>
      `;
      productList.appendChild(div);
    });
  } catch (error) {
    console.error("Error fetching products:", error);
  }
}

// Add to cart
async function addToCart(productId) {
  if (!getToken()) {
    alert("Please login to add items to cart");
    window.location.href = "login.html";
    return;
  }
  try {
    const response = await fetch(`${API_URL}/cart`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({ productId, quantity: 1 }),
    });
    if (!response.ok) throw new Error((await response.json()).message);
    alert("Product added to cart");
  } catch (error) {
    alert("Error adding to cart: " + error.message);
  }
}

// Fetch cart
async function fetchCart() {
  if (!getToken()) {
    document.getElementById("cart-list").innerHTML =
      '<p class="alert alert-warning">Please login to view cart</p>';
    return;
  }
  try {
    const response = await fetch(`${API_URL}/cart`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (!response.ok) throw new Error((await response.json()).message);
    const cart = await response.json();
    const cartList = document.getElementById("cart-list");
    cartList.innerHTML = "";
    if (cart.items.length === 0) {
      cartList.innerHTML = '<p class="alert alert-info">Your cart is empty</p>';
      document.getElementById("place-order").disabled = true;
    } else {
      cart.items.forEach((item) => {
        const div = document.createElement("div");
        div.className = "cart-item card mb-3";
        div.innerHTML = `
          <div class="card-body">
            ${
              item.product.image
                ? `<img src="${API_URL}${item.product.image}" alt="${item.product.name}" class="img-fluid mb-3" style="max-width: 100px; border-radius: 5px;">`
                : '<p class="text-muted">No image available</p>'
            }
            <h3 class="card-title">${item.product.name}</h3>
            <p class="card-text">Price: $${item.product.price}</p>
            <p class="card-text">Quantity: ${item.quantity}</p>
            <button class="btn btn-danger" onclick="removeFromCart('${
              item.product._id
            }')">Remove</button>
          </div>
        `;
        cartList.appendChild(div);
      });
      document.getElementById("place-order").disabled = false;
      document.getElementById("place-order").onclick = placeOrder;
    }
  } catch (error) {
    document.getElementById(
      "cart-list"
    ).innerHTML = `<p class="alert alert-danger">Error: ${error.message}</p>`;
  }
}

// Remove from cart
async function removeFromCart(productId) {
  try {
    const response = await fetch(`${API_URL}/cart/${productId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (!response.ok) throw new Error((await response.json()).message);
    fetchCart();
  } catch (error) {
    alert("Error removing from cart: " + error.message);
  }
}

// Place order
async function placeOrder() {
  try {
    const response = await fetch(`${API_URL}/orders`, {
      method: "POST",
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (!response.ok) throw new Error((await response.json()).message);
    alert("Order placed successfully");
    fetchCart();
  } catch (error) {
    alert("Error placing order: " + error.message);
  }
}

// Login
async function login() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const errorDiv = document.getElementById("login-error");
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!response.ok) throw new Error((await response.json()).message);
    const data = await response.json();
    localStorage.setItem("token", data.token);
    errorDiv.textContent = "Login successful! Redirecting...";
    setTimeout(() => (window.location.href = "index.html"), 1000);
  } catch (error) {
    errorDiv.textContent = "Error: " + error.message;
  }
}

// Register
async function register() {
  const name = document.getElementById("name").value;
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const errorDiv = document.getElementById("register-error");
  try {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    if (!response.ok) throw new Error((await response.json()).message);
    errorDiv.textContent = "Registration successful! Redirecting to login...";
    setTimeout(() => (window.location.href = "login.html"), 1000);
  } catch (error) {
    errorDiv.textContent = "Error: " + error.message;
  }
}

// Fetch orders
async function fetchOrders() {
  if (!getToken()) {
    document.getElementById("order-list").innerHTML =
      '<p class="alert alert-warning">Please login to view orders</p>';
    return;
  }
  try {
    const response = await fetch(`${API_URL}/orders`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (!response.ok) throw new Error((await response.json()).message);
    const orders = await response.json();
    const orderList = document.getElementById("order-list");
    orderList.innerHTML = "";
    if (orders.length === 0) {
      orderList.innerHTML =
        '<p class="alert alert-info">You have no orders</p>';
    } else {
      orders.forEach((order) => {
        const div = document.createElement("div");
        div.className = "order card mb-3";
        div.innerHTML = `
          <div class="card-body">
            <h3 class="card-title">Order #${order._id}</h3>
            <p class="card-text">Total: $${order.total}</p>
            <p class="card-text">Status: ${order.status}</p>
            <p class="card-text">Items:</p>
            <ul>
              ${order.items
                .map(
                  (item) => `
                <li>
                  ${
                    item.product.image
                      ? `<img src="${API_URL}${item.product.image}" alt="${item.product.name}" style="max-width: 50px; border-radius: 5px;" class="me-2">`
                      : ""
                  }
                  ${item.product.name} - Quantity: ${item.quantity} - Price: $${
                    item.price
                  }
                </li>
              `
                )
                .join("")}
            </ul>
          </div>
        `;
        orderList.appendChild(div);
      });
    }
  } catch (error) {
    document.getElementById(
      "order-list"
    ).innerHTML = `<p class="alert alert-danger">Error: ${error.message}</p>`;
  }
}
async function fetchCategories() {
  try {
    const response = await fetch(`${API_URL}/categories`);
    if (!response.ok) throw new Error("Failed to fetch categories");
    const categories = await response.json();
    const categorySelect = document.getElementById("category");
    if (categorySelect) {
      categories.forEach((category) => {
        const option = document.createElement("option");
        option.value = category._id;
        option.textContent = category.name;
        categorySelect.appendChild(option);
      });
    }
  } catch (error) {
    console.error("Error fetching categories:", error);
  }
}

async function addProduct() {
  if (!getToken()) {
    alert("Please login as admin");
    window.location.href = "login.html";
    return;
  }
  const name = document.getElementById("name").value;
  const price = document.getElementById("price").value;
  const description = document.getElementById("description").value;
  const category = document.getElementById("category").value;
  const stock = document.getElementById("stock").value;
  const image = document.getElementById("image").files[0];
  const errorDiv = document.getElementById("add-product-error");

  const formData = new FormData();
  formData.append("name", name);
  formData.append("price", price);
  formData.append("description", description);
  formData.append("category", category);
  formData.append("stock", stock);
  if (image) formData.append("image", image);

  try {
    const response = await fetch(`${API_URL}/products`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
      body: formData,
    });
    if (!response.ok) throw new Error((await response.json()).message);
    errorDiv.textContent = "Product added successfully!";
    document.getElementById("add-product-form").reset();
  } catch (error) {
    errorDiv.textContent = "Error: " + error.message;
  }
}
