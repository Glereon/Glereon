    const phrases = {
        empty_cart: "Your cart is empty"};

const productNameTranslations = {
  en: {
    "1": "Car Shampoo",
    "2": "Quick Detailer",
    "3": "Sealant",
    "4": "Tire and trim",
    "5": "Interior Cleaner",
    "6": "Glass Cleaner",
    "7": "Active Foam",
    "8": "Tar Remover",
    "9": "Clay Bar Lubricant",
    "10": "Wheel Cleaner",
    "11": "Degreaser",
    "12": "All Purpose Cleaner",
    "13": "Leather Cleaner",
    "14": "Leather Conditioner",
    "15": "Odor Neutralizer",
    "16": "Screen Cleaner",
    "17": "Glass Water Repellent",
    "18": "Engine Dressing",
    "19": "Insect Remover",
    "20": "Water Spot Remover",
    "21": "Waterless Wash"
  },
  lt: {
    "1": "Automobilinis Šampūnas",
    "2": "Greitas Vaškas",
    "3": "Sandariklis",
    "4": "Padangos Ir Apdaila",
    "5": "Salono Valiklis",
    "6": "Stiklo Valiklis",
    "7": "Aktyviosios Putos",
    "8": "Dervos Valiklis",
    "9": "Molio Bloko Lubrikantas",
    "10": "Ratu Valiklis",
    "11": "Riebalų Šalinimo Priemonė",
    "12": "Universalus Valiklis",
    "13": "Odos Valiklis",
    "14": "Odos Kondicionierius",
    "15": "Kvapų Neutralizatorius",
    "16": "Ekranų Valiklis",
    "17": "Stiklo Vandens Atstūmejas",
    "18": "Variklio Plastiko Priežiūra",
    "19": "Vabzdžių Valiklis",
    "20": "Vandens Dėmių Valiklis",
    "21": "Bevandeninis Ploviklis"
  }
};

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
    const productId = productElement.dataset.productId || name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    let price = itemPrice.textContent.replace(/[^0-9.-]+/g, "");

    price = parseFloat(price);
    if (isNaN(price)) {
        console.error('Invalid price format');
        return;
    }

    const existingItem = cart.find(item => item.id === productId);

    if (existingItem) {
      existingItem.qty += 1;
      existingItem.name = name;
      existingItem.price = price;
    } else {
      cart.push({
        id: productId,
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
   
    function getPageLanguage() {
      return document.documentElement.lang || 'en';
    }

    function syncCartNamesToPage() {
      const lang = getPageLanguage();
      cart.forEach(item => {
        const productEl = document.querySelector(`[data-product-id="${item.id}"]`);
        const pageTitle = productEl?.querySelector('.product-title')?.textContent.trim();

        if (pageTitle) {
          item.name = pageTitle;
        } else if (productNameTranslations[lang] && productNameTranslations[lang][item.id]) {
          item.name = productNameTranslations[lang][item.id];
        }
      });
    }

    function updateCartDisplay() {
      syncCartNamesToPage();
      const cartCount = document.getElementById('cartCount');
      const cartItems = document.getElementById('cartItems');
      const cartTotal = document.getElementById('cartTotal');
      
      // Update cart count
      const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
      cartCount.textContent = totalItems;
      
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
              <button class="quantity-btn minus" data-index="${index}">-</button>
              <span> ${item.qty}</span>
              <button class="quantity-btn plus" data-index="${index}">+</button>
              <button class="remove-btn" data-index="${index}">×</button>
            </div>
          </div>
        `).join('');
        
        // Add event listeners for dynamically created buttons
        const quantityBtns = cartItems.querySelectorAll('.quantity-btn');
        quantityBtns.forEach(btn => {
          btn.addEventListener('click', function() {
            const index = parseInt(this.dataset.index);
            const change = this.classList.contains('minus') ? -1 : 1;
            updateQuantity(index, change);
          });
        });
        
        const removeBtns = cartItems.querySelectorAll('.remove-btn');
        removeBtns.forEach(btn => {
          btn.addEventListener('click', function() {
            const index = parseInt(this.dataset.index);
            removeItem(index);
          });
        });
      }
      document.getElementById("cartBtn").addEventListener("click", toggleCart);
      document.getElementById("closeBtn").addEventListener("click", toggleCart);
      document.getElementById("clearCrt").addEventListener("click", clearCart);
      document.getElementById("checkout-btn").addEventListener("click", checkout);
      
      



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
      
      // Close modal when clicking outside
      document.getElementById('cartModal').addEventListener('click', function(event) {
        if (event.target === this) {
          toggleCart();
        }
      });
    });


