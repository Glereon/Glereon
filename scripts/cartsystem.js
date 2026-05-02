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

// Delivery options with prices (simplified: to locker or to address)
const deliveryOptions = [
  { id: 'dpd_locker', name: 'DPD - To Locker', nameLt: 'DPD - Į paštomatą', price: 3.49, hasLockers: true },
  { id: 'dpd_address', name: 'DPD - To Address', nameLt: 'DPD - Į adresą', price: 6.49, hasLockers: false },
  { id: 'venipak_locker', name: 'Venipak - To Locker', nameLt: 'Venipak - Į paštomatą', price: 3.49, hasLockers: true },
  { id: 'venipak_address', name: 'Venipak - To Address', nameLt: 'Venipak - Į adresą', price: 6.49, hasLockers: false },
  { id: 'omniva_locker', name: 'Omniva - To Locker', nameLt: 'Omniva - Į paštomatą', price: 3.79, hasLockers: true },
  { id: 'omniva_address', name: 'Omniva - To Address', nameLt: 'Omniva - Į adresą', price: 6.49, hasLockers: false }
];

let selectedDelivery = null;
let selectedLocker = null;
let omnivaLockers = []; // Will be populated from API

// Fetch parcel lockers from Omniva API
async function fetchOmnivaLockers() {
  try {
    const apiUrl = window.location.hostname.includes('localhost') 
      ? '/api/omniva-lockers' 
      : 'https://glereon-production.up.railway.app/api/omniva-lockers';
    
    const response = await fetch(apiUrl);
    const data = await response.json();
    
    if (data.success && data.lockers) {
      omnivaLockers = data.lockers;
      console.log('Loaded', omnivaLockers.length, 'Omniva parcel lockers');
    }
  } catch (error) {
    console.error('Failed to fetch Omniva lockers:', error);
  }
}

// Get cities from omniva lockers
function getLockerCities() {
  const cities = [...new Set(omnivaLockers.map(l => l.city))];
  return cities.sort();
}

// Get lockers by city
function getLockersByCity(city) {
  return omnivaLockers.filter(l => l.city === city);
}

function showLockerDropdown() {
  const lang = getPageLanguage();
  const isLt = lang === 'lt';
  
  // Remove existing dropdown if any
  const existingDropdown = document.getElementById('lockerDropdown');
  if (existingDropdown) {
    existingDropdown.remove();
  }
  
  // Remove existing selected locker
  selectedLocker = null;
  
  // Group lockers by city from omnivaLockers (loaded from API)
  const lockersByCity = omnivaLockers.reduce((acc, locker) => {
    if (!acc[locker.city]) acc[locker.city] = [];
    acc[locker.city].push(locker);
    return acc;
  }, {});
  
  const dropdownHtml = `
    <div class="locker-dropdown" id="lockerDropdown">
      <label>${isLt ? 'Pasirinkite paštomatą:' : 'Select parcel locker:'}</label>
      <select id="lockerSelect">
        <option value="">${isLt ? '-- Pasirinkite miestą --' : '-- Select city --'}</option>
        ${Object.keys(lockersByCity).sort().map(city => 
          `<option value="${city}">${city}</option>`
        ).join('')}
      </select>
      <select id="lockerAddress" style="display:none;">
        <option value="">${isLt ? '-- Pasirinkite adresą --' : '-- Select address --'}</option>
      </select>
    </div>
  `;
  
  // Insert dropdown after delivery options
  const deliveryOptionsEl = document.getElementById('deliveryOptions');
  if (deliveryOptionsEl) {
    deliveryOptionsEl.insertAdjacentHTML('afterend', dropdownHtml);
    
    const citySelect = document.getElementById('lockerSelect');
    const addressSelect = document.getElementById('lockerAddress');
    
    citySelect.addEventListener('change', function() {
      const selectedCity = this.value;
      addressSelect.innerHTML = '<option value="">-- Pasirinkite adresą --</option>';
      
      if (selectedCity && lockersByCity[selectedCity]) {
        lockersByCity[selectedCity].forEach(locker => {
          addressSelect.innerHTML += `<option value="${locker.id}" data-address="${locker.address}" data-name="${locker.name}">${locker.address} - ${locker.name}</option>`;
        });
        addressSelect.style.display = 'block';
      } else {
        addressSelect.style.display = 'none';
      }
    });
    
    addressSelect.addEventListener('change', function() {
      const option = this.options[this.selectedIndex];
      if (option.value) {
        selectedLocker = {
          id: option.value,
          name: option.dataset.name,
          address: option.dataset.address
        };
      } else {
        selectedLocker = null;
      }
    });
  }
}

function hideLockerDropdown() {
  const existingDropdown = document.getElementById('lockerDropdown');
  if (existingDropdown) {
    existingDropdown.remove();
  }
  selectedLocker = null;
}

function getDeliveryOptionsHtml() {
  const lang = getPageLanguage();
  const isLt = lang === 'lt';
  
  return deliveryOptions.map(opt => {
    const name = isLt ? opt.nameLt : opt.name;
    return `
      <label class="delivery-option">
        <input type="radio" name="delivery" value="${opt.id}" data-price="${opt.price}">
        <span class="delivery-name">${name}</span>
        <span class="delivery-price">${opt.price.toFixed(2)}€</span>
      </label>
    `;
  }).join('');
}

function renderDeliveryOptions() {
  const deliveryContainer = document.getElementById('deliveryOptions');
  if (deliveryContainer) {
    deliveryContainer.innerHTML = getDeliveryOptionsHtml();
    
    // Add event listeners to delivery options
    document.querySelectorAll('input[name="delivery"]').forEach(radio => {
      radio.addEventListener('change', function() {
        selectedDelivery = deliveryOptions.find(d => d.id === this.value);
        
        // Show/hide locker dropdown based on selection
        if (selectedDelivery && selectedDelivery.hasLockers) {
          showLockerDropdown();
        } else {
          hideLockerDropdown();
        }
        
        updateCartDisplay();
      });
    });
  }
}

function getDeliveryCost() {
  return selectedDelivery ? selectedDelivery.price : 0;
}

function getDeliveryName() {
  if (!selectedDelivery) return '';
  const lang = getPageLanguage();
  const isLt = lang === 'lt';
  return isLt ? selectedDelivery.nameLt : selectedDelivery.name;
}

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
      const productElement = this.parentElement;
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
        
      }

// Update total with delivery cost
      const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
      const deliveryCost = getDeliveryCost();
      const total = subtotal + deliveryCost;
      cartTotal.textContent = total.toFixed(2);
      
      // Show/hide delivery selection if cart has items
      const deliverySection = document.getElementById('deliverySection');
      if (deliverySection) {
        deliverySection.style.display = cart.length > 0 ? 'block' : 'none';
      }
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
    
  
    // Checkout functionality
    async function checkout() {
      if (cart.length === 0) {
        alert('Your cart is empty');
        return;
      }

      // Show customer info form
      const customerInfo = document.getElementById('customerInfo');
      const checkoutBtn = document.getElementById('checkout-btn');
      
      if (customerInfo.style.display === 'none') {
        customerInfo.style.display = 'block';
        checkoutBtn.textContent = 'Proceed to Payment';
        return;
      }

// Validate customer info
      const name = document.getElementById('customerName').value.trim();
      const email = document.getElementById('customerEmail').value.trim();
      const phone = document.getElementById('customerPhone').value.trim();
      const address = document.getElementById('customerAddress').value.trim();

      if (!name || !email || !address) {
        alert('Please fill in all required fields');
        return;
      }

// Validate delivery selection
      if (!selectedDelivery) {
        alert('Please select a delivery method');
        return;
      }
      
      // Validate locker selection if locker delivery was chosen
      if (selectedDelivery && selectedDelivery.hasLockers) {
        if (!selectedLocker) {
          alert('Please select a parcel locker');
          return;
        }
      }

      // Calculate subtotal and total with delivery
      const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
      const deliveryCost = getDeliveryCost();
      const total = subtotal + deliveryCost;
      
// Prepare order data
      const orderData = {
        items: cart,
        subtotal: subtotal,
        delivery: {
          method: getDeliveryName(),
          cost: deliveryCost,
          locker: selectedLocker ? selectedLocker : null
        },
        total: total,
        customer: {
          name: name,
          email: email,
          phone: phone,
          address: selectedDelivery.hasLockers ? (selectedLocker ? selectedLocker.address : address) : address
        },
        orderId: 'ORDER-' + Date.now()
      };

      // Dynamic API URL for Railway backend
      const apiUrl = window.location.hostname.includes('localhost') ? '/api/create-checkout-session' : 'https://glereon-production.up.railway.app/api/create-checkout-session';
      
      // Try to send to backend
      try {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderData)
        });

        if (response.ok) {
          const data = await response.json();
          if (data.sessionId) {
            // Redirect to Stripe Checkout
            const stripe = Stripe('pk_test_51TQBk4JynRvgwp1ZpkLxId5Kkhwdcb6Zz8D0xXmV0irYSQyIWMDHoQyxXxbQ0ai9DDhwGeAz9ewYwijWbIH2A5nh00KdH4PxJR');
            const result = await stripe.redirectToCheckout({
              sessionId: data.sessionId
            });
            if (result.error) {
              alert('Error: ' + result.error.message);
            }
            return;
          }
        } else {
          console.error('Backend response:', response.status, response.statusText);
        }
      } catch (error) {
        console.error('Backend not available:', error);
      }

      // Fallback if backend not running
      alert('Payment integration requires backend server. Check console for details.');
      console.log('Order data for manual processing:', orderData);
    }

// Initialize
    document.addEventListener('DOMContentLoaded', function() {
      // Fetch Omniva lockers from API on page load
      fetchOmnivaLockers();
      
      updateCartDisplay();
      renderDeliveryOptions();
      
      // Static cart controls (attach once)
      document.getElementById("cartBtn").addEventListener("click", toggleCart);
      document.getElementById("closeBtn").addEventListener("click", toggleCart);
      document.getElementById("clearCrt").addEventListener("click", clearCart);
      document.getElementById("checkout-btn").addEventListener("click", checkout);
      
      // Event delegation for quantity and remove buttons
      const cartItemsContainer = document.getElementById('cartItems');
      if (cartItemsContainer) {
        cartItemsContainer.addEventListener('click', function(event) {
          const btn = event.target.closest('button');
          if (!btn) return;
          
          if (btn.classList.contains('quantity-btn')) {
            const index = parseInt(btn.dataset.index);
            const change = btn.classList.contains('minus') ? -1 : 1;
            updateQuantity(index, change);
          } else if (btn.classList.contains('remove-btn')) {
            const index = parseInt(btn.dataset.index);
            removeItem(index);
          }
        });
      }
      
      // Close modal when clicking outside
      document.getElementById('cartModal').addEventListener('click', function(event) {
        if (event.target === this) {
          toggleCart();
        }
      });
    });

