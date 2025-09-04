// Tailor Management Module
let currentTailorData = null;
let currentAssignmentData = null;

// Use API_URL from config.js
const API_BASE_URL = window.API_URL || '';

// Initialize tailor management
function initTailorManagement() {
    loadTailorDashboard();
    setupTailorEventListeners();
}

// Setup event listeners
function setupTailorEventListeners() {
    // Tailor form submission
    const tailorForm = document.getElementById('tailor-form');
    if (tailorForm) {
        tailorForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await createTailor();
        });
    }

    // Assignment form submission
    const assignmentForm = document.getElementById('assignment-form');
    if (assignmentForm) {
        assignmentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await createAssignment();
        });
    }

    // Fabric form submission
    const fabricForm = document.getElementById('fabric-form');
    if (fabricForm) {
        fabricForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await addFabric();
        });
    }

    // Search functionality
    const searchTailors = document.getElementById('search-tailors');
    if (searchTailors) {
        searchTailors.addEventListener('input', (e) => {
            filterTailors(e.target.value);
        });
    }

    const searchAssignments = document.getElementById('search-assignments');
    if (searchAssignments) {
        searchAssignments.addEventListener('input', (e) => {
            filterAssignments(e.target.value);
        });
    }
}

// Load tailor dashboard
async function loadTailorDashboard() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/tailor/dashboard/tailor-stats`);
        const stats = await response.json();
        
        // Update dashboard stats
        const statsHtml = `
            <div class="stats-grid">
                <div class="stat-card">
                    <h3>Total Tailors</h3>
                    <div class="stat-number">${stats.total_tailors || 0}</div>
                </div>
                <div class="stat-card">
                    <h3>Active Tailors</h3>
                    <div class="stat-number">${stats.active_tailors || 0}</div>
                </div>
                <div class="stat-card">
                    <h3>Pending Assignments</h3>
                    <div class="stat-number">${stats.pending_assignments || 0}</div>
                </div>
                <div class="stat-card">
                    <h3>In Progress</h3>
                    <div class="stat-number">${stats.in_progress_assignments || 0}</div>
                </div>
                <div class="stat-card">
                    <h3>Completed</h3>
                    <div class="stat-number">${stats.completed_assignments || 0}</div>
                </div>
            </div>
        `;
        
        const dashboardElement = document.getElementById('tailor-dashboard-stats');
        if (dashboardElement) {
            dashboardElement.innerHTML = statsHtml;
        }
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

// Create new tailor
async function createTailor() {
    const name = document.getElementById('tailor-name').value;
    const specialization = document.getElementById('tailor-specialization').value;
    const contact = document.getElementById('tailor-contact').value;

    try {
        const response = await fetch(`${API_BASE_URL}/api/tailor/tailors/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name,
                specialization,
                contact_number: contact
            })
        });

        const data = await response.json();
        
        if (data.success) {
            showNotification('✓ Tailor registered successfully!', 'success');
            document.getElementById('tailor-form').reset();
            loadTailors();
            loadTailorDashboard();
        } else {
            showNotification('Error: ' + data.error, 'error');
        }
    } catch (error) {
        showNotification('Error creating tailor: ' + error.message, 'error');
    }
}

// Load all tailors
async function loadTailors() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/tailor/tailors`);
        const tailors = await response.json();
        
        displayTailors(tailors);
        
        // Update tailor select options
        updateTailorSelectOptions(tailors);
    } catch (error) {
        console.error('Error loading tailors:', error);
    }
}

// Display tailors
function displayTailors(tailors) {
    const container = document.getElementById('tailors-list');
    if (!container) return;

    if (tailors.length === 0) {
        container.innerHTML = '<p>No tailors registered yet.</p>';
        return;
    }

    let html = `
        <table class="table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Specialization</th>
                    <th>Contact</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
    `;

    tailors.forEach(tailor => {
        html += `
            <tr>
                <td>${tailor.tailor_id}</td>
                <td>${tailor.name}</td>
                <td>${tailor.specialization || '-'}</td>
                <td>${tailor.contact_number || '-'}</td>
                <td><span class="status-badge status-${tailor.status}">${tailor.status}</span></td>
                <td>
                    <button class="btn btn-small" onclick="viewTailorDetails('${tailor.tailor_id}')">View</button>
                    <button class="btn btn-small" onclick="updateTailorStatus('${tailor.tailor_id}', '${tailor.status}')">Update Status</button>
                </td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    container.innerHTML = html;
}

// Update tailor select options
function updateTailorSelectOptions(tailors) {
    const tailorSelect = document.getElementById('assignment-tailor');
    if (!tailorSelect) return;

    const activeTailors = tailors.filter(t => t.status === 'active');
    
    tailorSelect.innerHTML = '<option value="">Select Tailor</option>';
    activeTailors.forEach(tailor => {
        tailorSelect.innerHTML += `<option value="${tailor.tailor_id}">${tailor.name}</option>`;
    });
}

// Create work assignment
async function createAssignment() {
    const tailorId = document.getElementById('assignment-tailor').value;
    const productId = document.getElementById('assignment-product').value;
    const garmentType = document.getElementById('garment-type').value;
    const fabricType = document.getElementById('fabric-type').value;
    const quantity = document.getElementById('assignment-quantity').value;
    const expectedDate = document.getElementById('expected-date').value;
    const notes = document.getElementById('assignment-notes').value;

    try {
        const response = await fetch(`${API_BASE_URL}/api/tailor/assignments/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                tailor_id: tailorId,
                product_id: productId,
                garment_type: garmentType,
                fabric_type: fabricType,
                quantity: parseInt(quantity),
                expected_date: expectedDate,
                notes: notes
            })
        });

        const data = await response.json();
        
        if (data.success) {
            showNotification('✓ Work assigned successfully!', 'success');
            document.getElementById('assignment-form').reset();
            loadAssignments();
            loadTailorDashboard();
        } else {
            showNotification('Error: ' + data.error, 'error');
        }
    } catch (error) {
        showNotification('Error creating assignment: ' + error.message, 'error');
    }
}

// Load all assignments
async function loadAssignments() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/tailor/assignments`);
        const assignments = await response.json();
        
        displayAssignments(assignments);
    } catch (error) {
        console.error('Error loading assignments:', error);
    }
}

// Display assignments
function displayAssignments(assignments) {
    const container = document.getElementById('assignments-list');
    if (!container) return;

    if (assignments.length === 0) {
        container.innerHTML = '<p>No work assignments yet.</p>';
        return;
    }

    let html = `
        <table class="table">
            <thead>
                <tr>
                    <th>Assignment ID</th>
                    <th>Tailor</th>
                    <th>Garment</th>
                    <th>Fabric</th>
                    <th>Quantity</th>
                    <th>Status</th>
                    <th>Expected Date</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
    `;

    assignments.forEach(assignment => {
        const expectedDate = assignment.expected_date ? new Date(assignment.expected_date).toLocaleDateString() : '-';
        html += `
            <tr>
                <td>${assignment.assignment_id}</td>
                <td>${assignment.tailor_name}</td>
                <td>${assignment.garment_type}</td>
                <td>${assignment.fabric_type}</td>
                <td>${assignment.quantity}</td>
                <td><span class="status-badge status-${assignment.status}">${assignment.status}</span></td>
                <td>${expectedDate}</td>
                <td>
                    <button class="btn btn-small" onclick="viewAssignmentDetails('${assignment.assignment_id}')">View</button>
                    <button class="btn btn-small" onclick="updateAssignmentStatus('${assignment.assignment_id}', '${assignment.status}')">Update</button>
                </td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    container.innerHTML = html;
}

// View tailor details
async function viewTailorDetails(tailorId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/tailor/tailors/${tailorId}`);
        const data = await response.json();
        
        // Show modal with tailor details
        const modalHtml = `
            <div class="modal-content">
                <h3>Tailor Details</h3>
                <p><strong>ID:</strong> ${data.tailor.tailor_id}</p>
                <p><strong>Name:</strong> ${data.tailor.name}</p>
                <p><strong>Specialization:</strong> ${data.tailor.specialization || '-'}</p>
                <p><strong>Contact:</strong> ${data.tailor.contact_number || '-'}</p>
                <p><strong>Status:</strong> ${data.tailor.status}</p>
                <p><strong>Current Assignments:</strong> ${data.current_assignments}</p>
                <p><strong>Completed Assignments:</strong> ${data.completed_assignments}</p>
                
                <h4>Recent Assignments</h4>
                ${data.assignments.slice(0, 5).map(a => `
                    <div class="assignment-item">
                        ${a.garment_type} - ${a.quantity} pcs - ${a.status}
                    </div>
                `).join('')}
            </div>
        `;
        
        showModal(modalHtml);
    } catch (error) {
        showNotification('Error loading tailor details', 'error');
    }
}

// Update tailor status
async function updateTailorStatus(tailorId, currentStatus) {
    const newStatus = prompt(`Update status for tailor ${tailorId}\nCurrent: ${currentStatus}\nEnter new status (active/inactive/on_leave):`);
    
    if (!newStatus || !['active', 'inactive', 'on_leave'].includes(newStatus)) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/tailor/tailors/${tailorId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ status: newStatus })
        });

        const data = await response.json();
        
        if (data.success) {
            showNotification('✓ Status updated successfully!', 'success');
            loadTailors();
        } else {
            showNotification('Error: ' + data.error, 'error');
        }
    } catch (error) {
        showNotification('Error updating status: ' + error.message, 'error');
    }
}

// Update assignment status
async function updateAssignmentStatus(assignmentId, currentStatus) {
    const statusOptions = ['assigned', 'in_progress', 'completed', 'cancelled'];
    const newStatus = prompt(`Update status for assignment ${assignmentId}\nCurrent: ${currentStatus}\nOptions: ${statusOptions.join(', ')}:`);
    
    if (!newStatus || !statusOptions.includes(newStatus)) {
        return;
    }

    const notes = prompt('Add notes (optional):');

    try {
        const response = await fetch(`${API_BASE_URL}/api/tailor/assignments/${assignmentId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ status: newStatus, notes })
        });

        const data = await response.json();
        
        if (data.success) {
            showNotification('✓ Assignment updated successfully!', 'success');
            loadAssignments();
            loadTailorDashboard();
        } else {
            showNotification('Error: ' + data.error, 'error');
        }
    } catch (error) {
        showNotification('Error updating assignment: ' + error.message, 'error');
    }
}

// Add fabric
async function addFabric() {
    const fabricType = document.getElementById('fabric-type-input').value;
    const color = document.getElementById('fabric-color').value;
    const quantity = document.getElementById('fabric-quantity').value;
    const location = document.getElementById('fabric-location').value;

    try {
        const response = await fetch(`${API_BASE_URL}/api/tailor/fabrics/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                fabric_type: fabricType,
                color,
                quantity_meters: parseFloat(quantity),
                location
            })
        });

        const data = await response.json();
        
        if (data.success) {
            showNotification('✓ Fabric added successfully!', 'success');
            document.getElementById('fabric-form').reset();
            loadFabrics();
        } else {
            showNotification('Error: ' + data.error, 'error');
        }
    } catch (error) {
        showNotification('Error adding fabric: ' + error.message, 'error');
    }
}

// Load fabrics
async function loadFabrics() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/tailor/fabrics`);
        const fabrics = await response.json();
        
        displayFabrics(fabrics);
    } catch (error) {
        console.error('Error loading fabrics:', error);
    }
}

// Display fabrics
function displayFabrics(fabrics) {
    const container = document.getElementById('fabrics-list');
    if (!container) return;

    if (fabrics.length === 0) {
        container.innerHTML = '<p>No fabrics in inventory.</p>';
        return;
    }

    let html = `
        <table class="table">
            <thead>
                <tr>
                    <th>Fabric ID</th>
                    <th>Type</th>
                    <th>Color</th>
                    <th>Quantity (meters)</th>
                    <th>Location</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
    `;

    fabrics.forEach(fabric => {
        html += `
            <tr>
                <td>${fabric.fabric_id}</td>
                <td>${fabric.fabric_type}</td>
                <td>${fabric.color || '-'}</td>
                <td>${fabric.quantity_meters}</td>
                <td>${fabric.location || '-'}</td>
                <td>
                    <button class="btn btn-small" onclick="updateFabricQuantity('${fabric.fabric_id}', ${fabric.quantity_meters})">Update Quantity</button>
                </td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    container.innerHTML = html;
}

// Update fabric quantity
async function updateFabricQuantity(fabricId, currentQuantity) {
    const action = prompt('Add or remove fabric?\nEnter: add or remove');
    if (!action || !['add', 'remove'].includes(action)) {
        return;
    }

    const quantity = prompt(`Current quantity: ${currentQuantity} meters\nEnter quantity to ${action}:`);
    if (!quantity || isNaN(quantity)) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/tailor/fabrics/${fabricId}/update-quantity`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                quantity_meters: parseFloat(quantity),
                action
            })
        });

        const data = await response.json();
        
        if (data.success) {
            showNotification('✓ Fabric quantity updated!', 'success');
            loadFabrics();
        } else {
            showNotification('Error: ' + data.error, 'error');
        }
    } catch (error) {
        showNotification('Error updating fabric: ' + error.message, 'error');
    }
}

// Filter functions
function filterTailors(searchTerm) {
    const rows = document.querySelectorAll('#tailors-list tbody tr');
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm.toLowerCase()) ? '' : 'none';
    });
}

function filterAssignments(searchTerm) {
    const rows = document.querySelectorAll('#assignments-list tbody tr');
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm.toLowerCase()) ? '' : 'none';
    });
}

// Helper functions
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function showModal(content) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-overlay" onclick="closeModal()"></div>
        <div class="modal-dialog">
            ${content}
            <button class="btn btn-secondary" onclick="closeModal()">Close</button>
        </div>
    `;
    document.body.appendChild(modal);
}

function closeModal() {
    const modal = document.querySelector('.modal');
    if (modal) {
        modal.remove();
    }
}

// Export functions for use in main app
window.tailorManagement = {
    init: initTailorManagement,
    loadTailors,
    loadAssignments,
    loadFabrics
};