// Products Data
let products = [];

async function fetchProducts() {
    try {
        const response = await fetch('/api/products');
        products = await response.json();

        // Initialize product quantities
        products.forEach(product => {
            productQuantities[product.sku] = 1;
        });

        renderProducts();
    } catch (error) {
        console.error('Error fetching products:', error);
        showNotification('❌ Error al cargar los productos');
    }
}

// State
let cart = [];
let currentFilter = 'todas';
let productQuantities = {};
let sentOrders = new Set(); // Track sent orders to prevent duplicates

// DOM Elements
const productsGrid = document.getElementById('productsGrid');
const cartModal = document.getElementById('cartModal');
const cartItems = document.getElementById('cartItems');
const emptyCart = document.getElementById('emptyCart');
const cartSummary = document.getElementById('cartSummary');
const cartTotal = document.getElementById('cartTotal');
const cartBadgeDesktop = document.getElementById('cartBadgeDesktop');
const cartBadgeMobile = document.getElementById('cartBadgeMobile');
const customerForm = document.getElementById('customerForm');
const orderNumber = document.getElementById('orderNumber');
const orderNumberValue = document.getElementById('orderNumberValue');
const successAlert = document.getElementById('successAlert');
const whatsappBtn = document.getElementById('whatsappBtn');
const emailBtn = document.getElementById('emailBtn');

// Event Listeners
document.getElementById('cartBtnDesktop').addEventListener('click', openCart);
document.getElementById('cartBtnMobile').addEventListener('click', openCart);
document.getElementById('closeCart').addEventListener('click', closeCart);
// Add click handlers with disabled state check
whatsappBtn.addEventListener('click', (e) => {
    if (whatsappBtn.disabled) {
        e.preventDefault();
        if (cart.length === 0) {
            showAlert('⚠️ El carrito está vacío. Agregue productos antes de enviar.', 'error');
        } else {
            const missing = getMissingFields();
            showAlert(`⚠️ Por favor complete los siguientes campos antes de enviar:\n${missing.join(', ')}`, 'error');
        }
    } else {
        sendToWhatsApp();
    }
});

emailBtn.addEventListener('click', (e) => {
    if (emailBtn.disabled) {
        e.preventDefault();
        if (cart.length === 0) {
            showAlert('⚠️ El carrito está vacío. Agregue productos antes de enviar.', 'error');
        } else {
            const missing = getMissingFields();
            showAlert(`⚠️ Por favor complete los siguientes campos antes de enviar:\n${missing.join(', ')}`, 'error');
        }
    } else {
        sendToEmail();
    }
});

// Filter buttons
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        currentFilter = e.target.dataset.filter;
        renderProducts();
    });
});

// Form validation with numeric enforcement
const formInputs = customerForm.querySelectorAll('input');
formInputs.forEach(input => {
    input.addEventListener('input', (e) => {
        // Enforce numeric input for specific fields
        if (input.id === 'phone' || input.id === 'number' || input.id === 'zipCode') {
            input.value = input.value.replace(/[^0-9]/g, '');
        }
        validateForm();
    });
});

// Close modal on outside click
cartModal.addEventListener('click', (e) => {
    if (e.target === cartModal) {
        closeCart();
    }
});

// Functions
function renderProducts() {
    const filteredProducts = currentFilter === 'todas'
        ? products
        : products.filter(p => p.category === currentFilter);

    productsGrid.innerHTML = filteredProducts.map(product => `
        <div class="product-card">
            <img src="${product.image}" alt="${product.title}" class="product-image">
            <div class="product-info">
                <div class="product-sku">SKU: ${product.sku}</div>
                <h3 class="product-title">${product.title}</h3>
                <p class="product-description">${product.description}</p>
                <span class="product-category">${product.category === 'niño' ? '👦 Niño' : '👧 Niña'}</span>
                <div class="product-price">$${product.price.toLocaleString('es-AR')}</div>
                
                <div class="quantity-controls">
                    <button class="quantity-btn" onclick="decrementQuantity('${product.sku}')">−</button>
                    <div class="quantity-display" id="qty-${product.sku}">${productQuantities[product.sku]}</div>
                    <button class="quantity-btn" onclick="incrementQuantity('${product.sku}')">+</button>
                </div>
                
                <button class="add-to-cart-btn" onclick="addToCart('${product.sku}')">
                    🛒 Agregar al Carrito
                </button>
            </div>
        </div>
    `).join('');
}

function incrementQuantity(sku) {
    productQuantities[sku]++;
    document.getElementById(`qty-${sku}`).textContent = productQuantities[sku];
}

function decrementQuantity(sku) {
    if (productQuantities[sku] > 1) {
        productQuantities[sku]--;
        document.getElementById(`qty-${sku}`).textContent = productQuantities[sku];
    }
}

function addToCart(sku) {
    const product = products.find(p => p.sku === sku);
    const quantity = productQuantities[sku];

    const existingItem = cart.find(item => item.sku === sku);

    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        cart.push({
            ...product,
            quantity: quantity
        });
    }

    // Reset quantity to 1
    productQuantities[sku] = 1;
    document.getElementById(`qty-${sku}`).textContent = 1;

    updateCartBadge();
    showNotification('✅ Producto agregado al carrito');
}


function incrementCartItem(sku) {
    const item = cart.find(i => i.sku === sku);
    if (item) {
        item.quantity++;
        updateCartBadge();
        renderCart();
    }
}

function decrementCartItem(sku) {
    const item = cart.find(i => i.sku === sku);
    if (item) {
        item.quantity--;
        if (item.quantity === 0) {
            cart = cart.filter(i => i.sku !== sku);
            showNotification('🗑️ Producto eliminado del carrito');
        }
        updateCartBadge();
        renderCart();
        validateForm(); // Re-validate to disable buttons if cart is empty
    }
}

function updateCartBadge() {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartBadgeDesktop.textContent = totalItems;
    cartBadgeMobile.textContent = totalItems;
}

function renderCart() {
    if (cart.length === 0) {
        emptyCart.style.display = 'block';
        cartSummary.style.display = 'none';
        cartItems.innerHTML = ''; // Clear any remaining items
        return;
    }

    emptyCart.style.display = 'none';
    cartSummary.style.display = 'block';

    cartItems.innerHTML = cart.map(item => `
        <div class="cart-item">
            <img src="${item.image}" alt="${item.title}" class="cart-item-image">
            <div class="cart-item-info">
                <div class="cart-item-title">${item.title}</div>
                <div class="cart-item-sku">SKU: ${item.sku}</div>
                <div class="cart-item-price">$${item.price.toLocaleString('es-AR')} × ${item.quantity} = $${(item.price * item.quantity).toLocaleString('es-AR')}</div>
                <div class="cart-item-controls">
                    <button class="cart-item-qty-btn" onclick="decrementCartItem('${item.sku}')">−</button>
                    <div class="cart-item-quantity">Cant: ${item.quantity}</div>
                    <button class="cart-item-qty-btn" onclick="incrementCartItem('${item.sku}')">+</button>
                </div>
            </div>
        </div>
    `).join('');

    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    cartTotal.textContent = `$${total.toLocaleString('es-AR')}`;
}

function openCart() {
    renderCart();
    cartModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeCart() {
    cartModal.classList.remove('active');
    document.body.style.overflow = 'auto';
}

function validateForm() {
    const firstName = document.getElementById('firstName').value.trim();
    const lastName = document.getElementById('lastName').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const street = document.getElementById('street').value.trim();
    const number = document.getElementById('number').value.trim();
    const city = document.getElementById('city').value.trim();
    const zipCode = document.getElementById('zipCode').value.trim();

    const isValid = firstName && lastName && phone && street && number && city && zipCode;
    const hasCart = cart.length > 0;

    // Enable/disable buttons based on validation
    whatsappBtn.disabled = !isValid || !hasCart;
    emailBtn.disabled = !isValid || !hasCart;

    return isValid && hasCart;
}

function getMissingFields() {
    const fields = [];
    if (!document.getElementById('firstName').value.trim()) fields.push('Nombre');
    if (!document.getElementById('lastName').value.trim()) fields.push('Apellido');
    if (!document.getElementById('phone').value.trim()) fields.push('Teléfono');
    if (!document.getElementById('street').value.trim()) fields.push('Calle');
    if (!document.getElementById('number').value.trim()) fields.push('Altura');
    if (!document.getElementById('city').value.trim()) fields.push('Localidad');
    if (!document.getElementById('zipCode').value.trim()) fields.push('Código Postal');
    return fields;
}

function generateOrderNumber() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    return `ORD-${timestamp}-${random}`;
}

function sendToWhatsApp() {
    // Check if form is valid
    if (!validateForm()) {
        const missing = getMissingFields();
        showAlert(`⚠️ Por favor complete los siguientes campos antes de enviar:\n${missing.join(', ')}`, 'error');
        return;
    }

    // Generate order number if not exists
    let orderNum = orderNumberValue.textContent;
    if (!orderNum) {
        orderNum = generateOrderNumber();
        orderNumberValue.textContent = orderNum;
        orderNumber.classList.add('active');
    }

    // Check if order was already sent
    if (sentOrders.has(orderNum)) {
        showAlert(`⚠️ La orden ${orderNum} ya fue enviada y no puede enviarse nuevamente. Por favor recargue la página para emitir otra orden.`, 'error');
        return;
    }

    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const firstName = document.getElementById('firstName').value;
    const lastName = document.getElementById('lastName').value;

    let message = `Hola! Quiero realizar el siguiente pedido:\n\n`;
    message += `📋 Orden: ${orderNum}\n`;
    message += `👤 Cliente: ${firstName} ${lastName}\n\n`;
    message += `🛒 Productos:\n`;

    cart.forEach(item => {
        message += `• ${item.title} (${item.sku}) - Cantidad: ${item.quantity} - $${(item.price * item.quantity).toLocaleString('es-AR')}\n`;
    });

    message += `\n💰 Total: $${total.toLocaleString('es-AR')}`;

    // Mark order as sent
    sentOrders.add(orderNum);

    // Open WhatsApp (no console logs)
    const whatsappUrl = `https://wa.me/5491131095557?text=${encodeURIComponent(message)}`;
    const win = window.open(whatsappUrl, '_blank');

    if (win) {
        showAlert('✅ Su orden ha sido enviada correctamente. Por favor envíe el mensaje a nuestro WhatsApp para poder tomarla.', 'success');
    }
}

function sendToEmail() {
    // Check if form is valid
    if (!validateForm()) {
        const missing = getMissingFields();
        showAlert(`⚠️ Por favor complete los siguientes campos antes de enviar:\n${missing.join(', ')}`, 'error');
        return;
    }

    // Generate order number if not exists
    let orderNum = orderNumberValue.textContent;
    if (!orderNum) {
        orderNum = generateOrderNumber();
        orderNumberValue.textContent = orderNum;
        orderNumber.classList.add('active');
    }

    // Check if order was already sent
    if (sentOrders.has(orderNum)) {
        showAlert(`⚠️ La orden ${orderNum} ya fue enviada y no puede enviarse nuevamente. Por favor recargue la página para emitir otra orden.`, 'error');
        return;
    }

    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const firstName = document.getElementById('firstName').value;
    const lastName = document.getElementById('lastName').value;
    const phone = document.getElementById('phone').value;
    const street = document.getElementById('street').value;
    const number = document.getElementById('number').value;
    const city = document.getElementById('city').value;
    const zipCode = document.getElementById('zipCode').value;

    let body = `Orden: ${orderNum}\n\n`;
    body += `DATOS DEL CLIENTE:\n`;
    body += `Nombre: ${firstName} ${lastName}\n`;
    body += `Teléfono: ${phone}\n`;
    body += `Dirección: ${street} ${number}, ${city}, CP: ${zipCode}\n\n`;
    body += `PRODUCTOS:\n`;

    cart.forEach(item => {
        body += `${item.title} (${item.sku}) - Cantidad: ${item.quantity} - $${(item.price * item.quantity).toLocaleString('es-AR')}\n`;
    });

    body += `\nTOTAL: $${total.toLocaleString('es-AR')}`;

    // Mark order as sent
    sentOrders.add(orderNum);

    const subject = `Nueva Orden - ${orderNum}`;
    const mailtoUrl = `mailto:dagnerdev@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    // Open email client (no console logs)
    const win = window.open(mailtoUrl, '_blank');

    if (win) {
        showAlert('✅ Su orden ha sido enviada correctamente. Por favor envíe el email para poder tomarla.', 'success');
    }
}

function showAlert(message, type = 'success') {
    const alertText = successAlert.querySelector('.alert-text');
    alertText.textContent = message;

    successAlert.classList.remove('error');
    if (type === 'error') {
        successAlert.classList.add('error');
    }

    successAlert.classList.add('active');

    // Scroll to alert to make it visible (especially on mobile)
    setTimeout(() => {
        successAlert.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });

        // Add shake animation for errors to draw attention
        if (type === 'error') {
            successAlert.style.animation = 'shake 0.5s';
            setTimeout(() => {
                successAlert.style.animation = '';
            }, 500);
        }
    }, 100);

    // Auto-hide after 5 seconds for success, 8 seconds for error
    setTimeout(() => {
        successAlert.classList.remove('active');
    }, type === 'error' ? 8000 : 5000);
}

function showNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 0.75rem;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        z-index: 1000;
        animation: slideIn 0.3s ease-in-out;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-in-out';
        setTimeout(() => notification.remove(), 300);
    }, 2000);
}

// Add animation styles
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(400px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(400px); opacity: 0; }
    }
`;
document.head.appendChild(style);

// Initialize
fetchProducts();
validateForm();
