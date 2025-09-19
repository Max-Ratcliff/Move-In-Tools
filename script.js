class CartTracker {
    constructor() {
        this.carts = [];
        this.parkingPermits = [];
        this.updateInterval = null;
        this.alertedCarts = new Set();
        this.alertedPermits = new Set();
        this.currentView = 'carts';
        this.staffCode = '';
        this.isOnlineMode = false;
        this.firebaseUnsubscribe = null;
        this.init();
    }

    init() {
        this.loadFromStorage();
        this.bindEvents();
        this.startTimer();
        this.renderCarts();
        this.renderParking();
        this.updateViewToggle();
        this.updateSyncStatus();
    }

    bindEvents() {
        const cartForm = document.getElementById('checkoutForm');
        const parkingForm = document.getElementById('parkingFormElement');
        const staffCodeInput = document.getElementById('staffCode');
        const connectBtn = document.getElementById('connectBtn');

        cartForm.addEventListener('submit', (e) => this.handleCheckout(e));
        parkingForm.addEventListener('submit', (e) => this.handleParkingIssue(e));

        // Staff code input handler - show/hide connect button
        staffCodeInput.addEventListener('input', (e) => this.handleStaffCodeInput(e));

        // Connect button handler
        connectBtn.addEventListener('click', (e) => this.handleConnect(e));

        // Toggle view buttons
        const toggleButtons = document.querySelectorAll('.toggle-btn');
        toggleButtons.forEach(btn => {
            btn.addEventListener('click', (e) => this.handleViewToggle(e));
        });
    }

    handleStaffCodeInput(e) {
        const connectBtn = document.getElementById('connectBtn');
        const staffCode = e.target.value.trim().toLowerCase();

        // Update the input field to show lowercase version
        e.target.value = staffCode;

        if (staffCode && staffCode !== this.staffCode) {
            connectBtn.textContent = 'Connect';
            connectBtn.style.display = 'block';
        } else if (!staffCode && this.staffCode) {
            // Code was deleted, show button to switch to local mode
            connectBtn.textContent = 'Go Local';
            connectBtn.style.display = 'block';
        } else {
            connectBtn.style.display = 'none';
        }
    }

    async handleConnect(e) {
        e.preventDefault();

        const staffCodeInput = document.getElementById('staffCode');
        const connectBtn = document.getElementById('connectBtn');
        const newCode = staffCodeInput.value.trim().toLowerCase();

        if (connectBtn.textContent === 'Go Local') {
            // Switch to local mode
            connectBtn.disabled = true;
            connectBtn.textContent = 'Switching...';

            try {
                await this.handleStaffCodeChange({ target: { value: '' } });
                connectBtn.style.display = 'none';
                connectBtn.disabled = false;
                connectBtn.textContent = 'Go Local';
            } catch (error) {
                console.error('Failed to switch to local mode:', error);
                connectBtn.disabled = false;
                connectBtn.textContent = 'Go Local';
            }
            return;
        }

        if (!newCode) {
            alert('Please enter a staff code');
            return;
        }

        // Disable button during connection
        connectBtn.disabled = true;
        connectBtn.textContent = 'Connecting...';

        try {
            await this.handleStaffCodeChange({ target: { value: newCode } });
            connectBtn.style.display = 'none';
            connectBtn.disabled = false;
            connectBtn.textContent = 'Connect';
        } catch (error) {
            console.error('Connection failed:', error);
            connectBtn.disabled = false;
            connectBtn.textContent = 'Connect';
            alert('Failed to connect. Please try again.');
        }
    }

    handleViewToggle(e) {
        const view = e.currentTarget.dataset.view;
        this.currentView = view;

        // Update button states
        document.querySelectorAll('.toggle-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        e.currentTarget.classList.add('active');

        this.updateViewToggle();
    }

    updateViewToggle() {
        const cartForm = document.getElementById('cartForm');
        const parkingForm = document.getElementById('parkingForm');
        const cartsSection = document.getElementById('cartsSection');
        const parkingSection = document.getElementById('parkingSection');
        const formsContainer = document.querySelector('.forms-container');

        // Hide all sections first
        [cartForm, parkingForm, cartsSection, parkingSection].forEach(el => {
            el.style.display = 'none';
        });

        // Show based on current view and add appropriate class
        switch(this.currentView) {
            case 'carts':
                cartForm.style.display = 'block';
                cartsSection.style.display = 'block';
                formsContainer.classList.add('single-form');
                break;
            case 'parking':
                parkingForm.style.display = 'block';
                parkingSection.style.display = 'block';
                formsContainer.classList.add('single-form');
                break;
        }
    }

    async handleStaffCodeChange(e) {
        const newCode = e.target.value.trim().toLowerCase();

        if (newCode === this.staffCode) return; // No change

        // Unsubscribe from previous Firebase listener
        if (this.firebaseUnsubscribe) {
            this.firebaseUnsubscribe();
            this.firebaseUnsubscribe = null;
        }

        this.staffCode = newCode;

        if (newCode) {
            // Save staff code to localStorage
            localStorage.setItem('staffCode', newCode);
            // Switch to online mode
            await this.switchToOnlineMode();
        } else {
            // Remove staff code from localStorage
            localStorage.removeItem('staffCode');
            // Switch to local mode
            this.switchToLocalMode();
        }
    }

    async switchToOnlineMode() {
        if (!window.firebaseDb) {
            this.updateSyncStatus('error', '❌ Firebase not available');
            return;
        }

        try {
            this.isOnlineMode = true;
            this.updateSyncStatus('synced', `🌐 Synced: ${this.staffCode}`);

            // Load carts from Firebase and start real-time sync
            await this.loadFromFirebase();
            this.startFirebaseSync();

        } catch (error) {
            console.error('Failed to switch to online mode:', error);
            this.updateSyncStatus('error', '❌ Sync failed');
            this.isOnlineMode = false;
        }
    }

    switchToLocalMode() {
        this.isOnlineMode = false;
        this.updateSyncStatus('local', '📱 Local Mode');

        // Load from localStorage
        this.loadFromStorage();
        this.renderCarts();
    }

    updateSyncStatus(type = 'local', message = '📱 Local Mode') {
        const statusElement = document.getElementById('syncStatus');
        const indicator = statusElement.querySelector('.status-indicator');

        indicator.className = `status-indicator ${type}`;
        indicator.textContent = message;
    }

    async handleCheckout(e) {
        e.preventDefault();

        const cartNumber = document.getElementById('cartNumber').value.trim();
        const studentId = document.getElementById('studentId').value.trim();
        const phoneNumber = document.getElementById('phoneNumber').value.trim();

        if (!cartNumber || !studentId || !phoneNumber) {
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
            studentId: studentId,
            phoneNumber: phoneNumber,
            checkoutTime: new Date().toISOString(),
            id: Date.now().toString()
        };

        this.carts.push(cart);
        await this.saveData();
        this.renderCarts();

        // Clear form
        document.getElementById('cartNumber').value = '';
        document.getElementById('studentId').value = '';
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

    async handleCheckin(cartId) {
        this.carts = this.carts.filter(cart => cart.id !== cartId);
        this.alertedCarts.delete(cartId);
        await this.saveData();
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
                            Student ID: ${cart.studentId} | Phone: ${cart.phoneNumber} |
                            Checked out: ${new Date(cart.checkoutTime).toLocaleString()}
                            <span class="time-elapsed ${overdueClass}">
                                (${elapsed} elapsed)
                            </span>
                        </div>
                        <div class="countdown-timer countdown-${countdown.urgency}">
                            ${countdown.text}
                        </div>
                    </div>
                    <button class="checkin-btn" onclick="window.cartTracker.handleCheckin('${cart.id}')">
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
                    <button class="checkin-btn" onclick="window.cartTracker.handlePermitRevoke('${permit.id}')">
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

    async saveData() {
        if (this.isOnlineMode && this.staffCode) {
            await this.saveToFirebase();
        } else {
            this.saveToStorage();
        }
    }

    saveToStorage() {
        localStorage.setItem('checkedOutCarts', JSON.stringify(this.carts));
        localStorage.setItem('parkingPermits', JSON.stringify(this.parkingPermits));
        localStorage.setItem('alertedCarts', JSON.stringify([...this.alertedCarts]));
        localStorage.setItem('alertedPermits', JSON.stringify([...this.alertedPermits]));
    }

    async saveToFirebase() {
        if (!window.firebaseDb || !this.staffCode) return;

        try {
            const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');

            const cartsDoc = doc(window.firebaseDb, 'locations', this.staffCode);
            await setDoc(cartsDoc, {
                carts: this.carts,
                lastUpdated: new Date().toISOString()
            }, { merge: true });

        } catch (error) {
            console.error('Failed to save to Firebase:', error);
            this.updateSyncStatus('error', '❌ Save failed');
        }
    }

    async loadFromFirebase() {
        if (!window.firebaseDb || !this.staffCode) return;

        try {
            const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');

            const cartsDoc = doc(window.firebaseDb, 'locations', this.staffCode);
            const docSnap = await getDoc(cartsDoc);

            if (docSnap.exists()) {
                const data = docSnap.data();
                this.carts = data.carts || [];
                this.renderCarts();
            }

        } catch (error) {
            console.error('Failed to load from Firebase:', error);
            this.updateSyncStatus('error', '❌ Load failed');
        }
    }

    startFirebaseSync() {
        if (!window.firebaseDb || !this.staffCode || this.firebaseUnsubscribe) return;

        import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js')
            .then(({ doc, onSnapshot }) => {
                const cartsDoc = doc(window.firebaseDb, 'locations', this.staffCode);

                this.firebaseUnsubscribe = onSnapshot(cartsDoc, (docSnap) => {
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        this.carts = data.carts || [];
                        this.renderCarts();
                    }
                });
            })
            .catch(error => {
                console.error('Failed to start Firebase sync:', error);
                this.updateSyncStatus('error', '❌ Sync failed');
            });
    }

    loadFromStorage() {
        const savedCarts = localStorage.getItem('checkedOutCarts');
        const savedPermits = localStorage.getItem('parkingPermits');
        const alertedCarts = localStorage.getItem('alertedCarts');
        const alertedPermits = localStorage.getItem('alertedPermits');
        const savedStaffCode = localStorage.getItem('staffCode');

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

        if (savedStaffCode) {
            this.staffCode = savedStaffCode;
            document.getElementById('staffCode').value = savedStaffCode;
            // Use setTimeout to ensure DOM is ready and Firebase is initialized
            setTimeout(() => {
                this.switchToOnlineMode();
            }, 100);
        }
    }
}

// CartTracker will be initialized by Firebase module in index.html