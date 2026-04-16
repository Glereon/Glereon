    const phrases = {
        empty_cart: "Your cart is empty"};

    
    
  // Cart functionality
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    
    document.addEventListener('DOMContentLoaded', function() {
  function addToCart(productElement) {
    // Select the product title and price based on the product ID
    const product_title = productElement.querySelector('.product-title');
    const itemPrice = productElement.querySelector('.product-price');

    if (!product_title || !itemPrice) {
      console.error('Product title or price element not found');
      return;
    }

    const name = product_title.textContent.trim();
    let price = itemPrice.textContent.replace(/[^0-9.-]+/g, "");

    price = parseFloat(price);
    if (isNaN(price)) {
        console.error('Invalid price format');
        return;
    }

    const existingItem = cart.find(item => item.name === name);


    if (existingItem) {
      existingItem.qty += 1;
    } else {
      cart.push({
        name: name,
        price: price,
        qty: 1
      });
    }

    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartDisplay();
  }

  // Add event listeners to each "Add to Cart" button
  const addToCartButtons = document.querySelectorAll('.add-to-cart-btn');
  addToCartButtons.forEach(button => {
    button.addEventListener('click', function() {
      const productElement = this.parentElement; // Extract the product ID from the parent element's ID
      addToCart(productElement);
    });
  });
});
   
    function updateCartDisplay() {
      const cartCount = document.getElementById('cartCount');
      const cartItems = document.getElementById('cartItems');
      const cartTotal = document.getElementById('cartTotal');
      
      // Update cart count
      const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
      cartCount.textContent = totalItems;
      
      const quantity = 0
      // Update cart items display
      if (cart.length === 0) {
        cartItems.innerHTML = `<div class="empty-cart" data-translate="empty_cart">Your cart is empty</div>`;
      } else {
        cartItems.innerHTML = cart.map((item, index) => `
          <div class="cart-item">
            <div class="item-info">
              <div class="item-name">${item.name}</div>
              <div class="item-price">${item.price}€</div>
            </div>
            <div class="item-controls">
              <button class="quantity-btn" onclick="updateQuantity(${index}, -1)">-</button>
              <span> ${item.qty}</span>
              <button class="quantity-btn" onclick="updateQuantity(${index}, 1)">+</button>
              <button class="remove-btn" onclick="removeItem(${index})">×</button>
            </div>
          </div>
        `).join('');
      }
      
      // Update total
      const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
      cartTotal.textContent = total.toFixed(2);
    }

    function updateQuantity(index, change) {
      cart[index].qty += change;
      if (cart[index].qty <= 0) {
        cart.splice(index, 1);
      }
      localStorage.setItem('cart', JSON.stringify(cart));
      updateCartDisplay();
    }

    function removeItem(index) {
      cart.splice(index, 1);
      localStorage.setItem('cart', JSON.stringify(cart));
      updateCartDisplay();
      
    }

    function clearCart() {
      cart = [];
      localStorage.setItem('cart', JSON.stringify(cart));
      updateCartDisplay();
      
    }

    function toggleCart() {
      const modal = document.getElementById('cartModal');
      if (modal.style.display === 'flex') {
        modal.style.display = '';
      } else {
        updateCartDisplay();
        modal.style.display = 'flex';
      }
    }
    // cia kazkada reiks idet mokejimo buda
    function checkout() {
      alert('Checkout functionality would be implemented here!');
    }

    // Initialize
    document.addEventListener('DOMContentLoaded', function() {
      updateCartDisplay();
    });


