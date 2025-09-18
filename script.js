class CartTracker {
    constructor() {
        this.carts = [];
        this.parkingPermits = [];
        this.updateInterval = null;
        this.alertedCarts = new Set();
        this.alertedPermits = new Set();
        this.init();
    }

    init() {
        this.loadFromStorage();
        this.bindEvents();
        this.startTimer();
        this.renderCarts();
        this.renderParking();
    }

    bindEvents() {
        const cartForm = document.getElementById('checkoutForm');
        const parkingForm = document.getElementById('parkingForm');

        cartForm.addEventListener('submit', (e) => this.handleCheckout(e));
        parkingForm.addEventListener('submit', (e) => this.handleParkingIssue(e));
    }

    handleCheckout(e) {
        e.preventDefault();

        const cartNumber = document.getElementById('cartNumber').value.trim();
        const phoneNumber = document.getElementById('phoneNumber').value.trim();

        if (!cartNumber || !phoneNumber) {
            alert('Please fill in all fields');
            return;
        }

        // Check if cart is already checked out
        if (this.carts.find(cart => cart.number === cartNumber)) {
            alert('Cart is already checked out');
            return;
        }

        const cart = {
            number: cartNumber,
            phoneNumber: phoneNumber,
            checkoutTime: new Date().toISOString(),
            id: Date.now().toString()
        };

        this.carts.push(cart);
        this.saveToStorage();
        this.renderCarts();

        // Clear form
        document.getElementById('cartNumber').value = '';
        document.getElementById('phoneNumber').value = '';
    }

    handleParkingIssue(e) {
        e.preventDefault();

        const licensePlate = document.getElementById('licensePlate').value.trim().toUpperCase();
        const phoneNumber = document.getElementById('parkingPhone').value.trim();

        if (!licensePlate || !phoneNumber) {
            alert('Please fill in all fields');
            return;
        }

        // Check if permit already exists for this license plate
        if (this.parkingPermits.find(permit => permit.licensePlate === licensePlate)) {
            alert('Parking permit already issued for this license plate');
            return;
        }

        const permit = {
            licensePlate: licensePlate,
            phoneNumber: phoneNumber,
            issueTime: new Date().toISOString(),
            id: Date.now().toString()
        };

        this.parkingPermits.push(permit);
        this.saveToStorage();
        this.renderParking();

        // Clear form
        document.getElementById('licensePlate').value = '';
        document.getElementById('parkingPhone').value = '';
    }

    handleCheckin(cartId) {
        this.carts = this.carts.filter(cart => cart.id !== cartId);
        this.alertedCarts.delete(cartId);
        this.saveToStorage();
        this.renderCarts();
        this.clearAlerts();
    }

    handlePermitRevoke(permitId) {
        this.parkingPermits = this.parkingPermits.filter(permit => permit.id !== permitId);
        this.alertedPermits.delete(permitId);
        this.saveToStorage();
        this.renderParking();
        this.clearAlerts();
    }

    calculateElapsedTime(checkoutTime) {
        const now = new Date();
        const checkout = new Date(checkoutTime);
        const elapsed = now - checkout;

        const minutes = Math.floor(elapsed / (1000 * 60));
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;

        if (hours > 0) {
            return `${hours}h ${remainingMinutes}m`;
        }
        return `${minutes}m`;
    }

    calculateCountdown(checkoutTime, timeLimit) {
        const now = new Date();
        const checkout = new Date(checkoutTime);
        const elapsed = now - checkout;
        const elapsedMinutes = Math.floor(elapsed / (1000 * 60));

        const remainingMinutes = timeLimit - elapsedMinutes;

        if (remainingMinutes <= 0) {
            return { text: 'OVERDUE', isOverdue: true, urgency: 'critical' };
        }

        const hours = Math.floor(remainingMinutes / 60);
        const minutes = remainingMinutes % 60;

        let urgency = 'normal';
        if (remainingMinutes <= 5) {
            urgency = 'critical';
        } else if (remainingMinutes <= 10) {
            urgency = 'warning';
        }

        let text;
        if (hours > 0) {
            text = `${hours}h ${minutes}m left`;
        } else {
            text = `${minutes}m left`;
        }

        return { text, isOverdue: false, urgency };
    }

    isOverdue(checkoutTime, timeLimit = 30) {
        const now = new Date();
        const checkout = new Date(checkoutTime);
        const elapsed = now - checkout;
        const minutes = Math.floor(elapsed / (1000 * 60));
        return minutes >= timeLimit;
    }

    isParkingOverdue(issueTime) {
        return this.isOverdue(issueTime, 15);
    }

    renderCarts() {
        const cartsList = document.getElementById('cartsList');

        if (this.carts.length === 0) {
            cartsList.innerHTML = '<div class="empty-state">No carts currently checked out</div>';
            return;
        }

        cartsList.innerHTML = this.carts.map(cart => {
            const elapsed = this.calculateElapsedTime(cart.checkoutTime);
            const countdown = this.calculateCountdown(cart.checkoutTime, 30);
            const isOverdue = this.isOverdue(cart.checkoutTime);
            const overdueClass = isOverdue ? 'overdue' : '';

            return `
                <div class="cart-item ${overdueClass}">
                    <div class="cart-info">
                        <div class="cart-number">Cart #${cart.number}</div>
                        <div class="cart-details">
                            Phone: ${cart.phoneNumber} |
                            Checked out: ${new Date(cart.checkoutTime).toLocaleString()}
                            <span class="time-elapsed ${overdueClass}">
                                (${elapsed} elapsed)
                            </span>
                        </div>
                        <div class="countdown-timer countdown-${countdown.urgency}">
                            ${countdown.text}
                        </div>
                    </div>
                    <button class="checkin-btn" onclick="cartTracker.handleCheckin('${cart.id}')">
                        Check In
                    </button>
                </div>
            `;
        }).join('');
    }

    renderParking() {
        const parkingList = document.getElementById('parkingList');

        if (this.parkingPermits.length === 0) {
            parkingList.innerHTML = '<div class="empty-state">No parking permits currently active</div>';
            return;
        }

        parkingList.innerHTML = this.parkingPermits.map(permit => {
            const elapsed = this.calculateElapsedTime(permit.issueTime);
            const countdown = this.calculateCountdown(permit.issueTime, 15);
            const isOverdue = this.isParkingOverdue(permit.issueTime);
            const overdueClass = isOverdue ? 'overdue' : '';

            return `
                <div class="parking-item ${overdueClass}">
                    <div class="cart-info">
                        <div class="cart-number">${permit.licensePlate}</div>
                        <div class="cart-details">
                            Phone: ${permit.phoneNumber} |
                            Issued: ${new Date(permit.issueTime).toLocaleString()}
                            <span class="time-elapsed ${overdueClass}">
                                (${elapsed} elapsed)
                            </span>
                        </div>
                        <div class="countdown-timer countdown-${countdown.urgency}">
                            ${countdown.text}
                        </div>
                    </div>
                    <button class="checkin-btn" onclick="cartTracker.handlePermitRevoke('${permit.id}')">
                        Car Departed
                    </button>
                </div>
            `;
        }).join('');
    }

    checkForOverdue() {
        this.carts.forEach(cart => {
            if (this.isOverdue(cart.checkoutTime) && !this.alertedCarts.has(cart.id)) {
                this.showCartAlert(cart);
                this.alertedCarts.add(cart.id);
            }
        });

        this.parkingPermits.forEach(permit => {
            if (this.isParkingOverdue(permit.issueTime) && !this.alertedPermits.has(permit.id)) {
                this.showParkingAlert(permit);
                this.alertedPermits.add(permit.id);
            }
        });
    }

    showCartAlert(cart) {
        const alertsContainer = document.getElementById('alerts');
        const elapsed = this.calculateElapsedTime(cart.checkoutTime);

        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert';
        alertDiv.innerHTML = `
            <strong>OVERDUE CART!</strong><br>
            Cart #${cart.number} has been out for ${elapsed}<br>
            Call: ${cart.phoneNumber}
        `;

        alertsContainer.appendChild(alertDiv);

        // Auto-remove alert after 10 seconds
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.parentNode.removeChild(alertDiv);
            }
        }, 10000);
    }

    showParkingAlert(permit) {
        const alertsContainer = document.getElementById('alerts');
        const elapsed = this.calculateElapsedTime(permit.issueTime);

        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert';
        alertDiv.style.backgroundColor = '#ff8c00';
        alertDiv.innerHTML = `
            <strong>PARKING PERMIT EXPIRED!</strong><br>
            ${permit.licensePlate} has been parked for ${elapsed}<br>
            Call: ${permit.phoneNumber}
        `;

        alertsContainer.appendChild(alertDiv);

        // Auto-remove alert after 10 seconds
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.parentNode.removeChild(alertDiv);
            }
        }, 10000);
    }

    clearAlerts() {
        const alertsContainer = document.getElementById('alerts');
        alertsContainer.innerHTML = '';
    }

    startTimer() {
        this.updateInterval = setInterval(() => {
            this.renderCarts();
            this.renderParking();
            this.checkForOverdue();
        }, 60000); // Update every minute
    }

    saveToStorage() {
        localStorage.setItem('checkedOutCarts', JSON.stringify(this.carts));
        localStorage.setItem('parkingPermits', JSON.stringify(this.parkingPermits));
        localStorage.setItem('alertedCarts', JSON.stringify([...this.alertedCarts]));
        localStorage.setItem('alertedPermits', JSON.stringify([...this.alertedPermits]));
    }

    loadFromStorage() {
        const savedCarts = localStorage.getItem('checkedOutCarts');
        const savedPermits = localStorage.getItem('parkingPermits');
        const alertedCarts = localStorage.getItem('alertedCarts');
        const alertedPermits = localStorage.getItem('alertedPermits');

        if (savedCarts) {
            this.carts = JSON.parse(savedCarts);
        }

        if (savedPermits) {
            this.parkingPermits = JSON.parse(savedPermits);
        }

        if (alertedCarts) {
            this.alertedCarts = new Set(JSON.parse(alertedCarts));
        }

        if (alertedPermits) {
            this.alertedPermits = new Set(JSON.parse(alertedPermits));
        }
    }
}

// Initialize the cart tracker when the page loads
let cartTracker;
document.addEventListener('DOMContentLoaded', () => {
    cartTracker = new CartTracker();
});