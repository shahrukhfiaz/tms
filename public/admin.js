const API_BASE = 'http://157.230.51.160:3000/api/v1';
let authToken = localStorage.getItem('authToken');
let currentUser = null;

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    checkServerStatus();
    updateServerTime();
    setInterval(updateServerTime, 1000);
    
    // Hide admin tabs initially
    hideAdminTabs();
    
    if (authToken) {
        // Try to validate the token and auto-login
        validateTokenAndLogin();
    }
});

async function validateTokenAndLogin() {
    console.log('validateTokenAndLogin called');
    console.log('authToken from localStorage:', localStorage.getItem('authToken'));
    
    if (!authToken) {
        console.log('No auth token found, staying on login page');
        return;
    }
    
    try {
        const data = await apiCall('/auth/me', 'GET', null, false);
        console.log('User data received:', data);
        currentUser = data;
        
        // Check if user has admin access and show admin panel
        if (checkAdminAccess()) {
            console.log('User has admin access, showing admin panel');
            showAdminPanel();
        } else {
            // Token is valid but user doesn't have admin access
            console.log('User does not have admin access, role:', data.role);
            // Don't logout immediately, just show a message
            const loginStatus = document.getElementById('loginStatus');
            if (loginStatus) {
                loginStatus.textContent = 'Access denied: Admin privileges required';
                loginStatus.className = 'login-status error';
                loginStatus.style.display = 'block';
            }
        }
    } catch (error) {
        // Token is invalid or expired, clear it
        console.log('Token validation failed:', error.message);
        console.log('Clearing invalid token and showing login page');
        authToken = null;
        currentUser = null;
        localStorage.removeItem('authToken');
        
        // Show login page without calling logout (to avoid clearing UI state)
        document.getElementById('statusBar').style.display = 'none';
        document.getElementById('tabsContainer').style.display = 'none';
        hideAdminTabs();
        document.getElementById('auth').classList.add('active');
    }
}

function updateServerTime() {
    document.getElementById('serverTime').textContent = new Date().toLocaleTimeString();
}

async function checkServerStatus() {
    try {
        const response = await fetch('http://157.230.51.160:3000/healthz');
        if (response.ok) {
            updateStatus('Server Online', '#28a745');
        } else {
            updateStatus('Server Error', '#dc3545');
        }
    } catch (error) {
        updateStatus('Server Offline', '#dc3545');
    }
}

function updateStatus(text, color) {
    const statusText = document.getElementById('statusText');
    const statusDot = document.getElementById('statusDot');
    if (statusText) statusText.textContent = text;
    if (statusDot) statusDot.style.background = color;
}

function hideAdminTabs() {
    document.querySelectorAll('.admin-only').forEach(tab => {
        tab.style.display = 'none';
    });
}

function showAdminTabs() {
    document.querySelectorAll('.admin-only').forEach(tab => {
        tab.style.display = 'flex';
    });
}

function checkAdminAccess() {
    if (currentUser && (currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'ADMIN')) {
        showAdminTabs();
        return true;
    } else {
        hideAdminTabs();
        return false;
    }
}

function showTab(tabName) {
    // Don't allow switching to auth tab when logged in
    if (tabName === 'auth' && currentUser) {
        return;
    }
    
    // Check if user is trying to access admin tabs without permission
    if (tabName !== 'auth' && !checkAdminAccess()) {
        showResponse('Access denied: Admin privileges required', true);
        return;
    }
    
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Show selected tab
    document.getElementById(tabName).classList.add('active');
    if (event && event.target) {
        event.target.classList.add('active');
    }
}

function showAdminPanel() {
    // Hide the authentication tab content
    document.getElementById('auth').classList.remove('active');
    
    // Show status bar and tabs
    document.getElementById('statusBar').style.display = 'flex';
    document.getElementById('tabsContainer').style.display = 'flex';
    
    // Show logout button
    document.getElementById('logoutBtn').style.display = 'flex';
    
    // Update status
    updateStatus('Logged In', '#28a745');
    
    // Show admin tabs
    showAdminTabs();
    
    // Switch to users tab by default and load data
    setTimeout(() => {
        showTab('users');
        loadUserData();
    }, 1000);
}

function logout() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('authToken');
    
    // Hide admin panel elements
    document.getElementById('statusBar').style.display = 'none';
    document.getElementById('tabsContainer').style.display = 'none';
    document.getElementById('logoutBtn').style.display = 'none';
    hideAdminTabs();
    
    // Show authentication tab again
    document.getElementById('auth').classList.add('active');
    
    // Clear login status
    const loginStatus = document.getElementById('loginStatus');
    loginStatus.style.display = 'none';
    loginStatus.className = 'login-status';
    
    // Clear response area
    showResponse('Logged out successfully');
}

// Notification System
function showNotification(message, type = 'info', duration = 5000) {
    const container = document.getElementById('notificationContainer');
    if (!container) return;

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    const icon = getNotificationIcon(type);
    const id = 'notification-' + Date.now();
    
    notification.innerHTML = `
        <div class="notification-icon">${icon}</div>
        <div class="notification-content">${message}</div>
        <button class="notification-close" onclick="dismissNotification('${id}')">
            <i class="fas fa-times"></i>
        </button>
        <div class="notification-progress"></div>
    `;
    
    notification.id = id;
    container.appendChild(notification);
    
    // Auto-dismiss after duration
    setTimeout(() => {
        dismissNotification(id);
    }, duration);
}

function getNotificationIcon(type) {
    const icons = {
        success: '<i class="fas fa-check-circle"></i>',
        error: '<i class="fas fa-exclamation-circle"></i>',
        warning: '<i class="fas fa-exclamation-triangle"></i>',
        info: '<i class="fas fa-info-circle"></i>'
    };
    return icons[type] || icons.info;
}

function dismissNotification(id) {
    const notification = document.getElementById(id);
    if (!notification) return;
    
    notification.classList.add('slide-out');
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 300);
}

// Replace the old showResponse function with notification-based version
function showResponse(data, isError = false) {
    const message = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    const type = isError ? 'error' : 'success';
    showNotification(message, type);
}

async function apiCall(endpoint, method = 'GET', body = null, showResponse = false) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
        }
    };

    if (authToken) {
        options.headers['Authorization'] = `Bearer ${authToken}`;
    }

    if (body) {
        options.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(`${API_BASE}${endpoint}`, options);
        
        // Handle empty responses (like 204 No Content)
        if (response.status === 204) {
            return { message: 'Success' };
        }
        
        const data = await response.json();
        
        if (response.ok) {
            if (showResponse) {
                showResponse(data);
            }
            return data;
        } else {
            if (showResponse) {
                showResponse(data, true);
            }
            throw new Error(data.message || 'API Error');
        }
    } catch (error) {
        if (showResponse) {
            showResponse(`Error: ${error.message}`, true);
        }
        throw error;
    }
}

// Authentication functions
async function login() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const loginStatus = document.getElementById('loginStatus');
    
    // Show loading state
    loginStatus.className = 'login-status';
    loginStatus.textContent = 'Logging in...';
    loginStatus.style.display = 'block';
    
    try {
        const data = await apiCall('/auth/login', 'POST', { email, password }, false);
        authToken = data.accessToken || data.tokens?.accessToken;
        localStorage.setItem('authToken', authToken);
        currentUser = data.user;
        
        // Check if user has admin access
        if (checkAdminAccess()) {
            // Show admin panel
            showAdminPanel();
            loginStatus.className = 'login-status success';
            loginStatus.textContent = `Welcome ${data.user.email}! Loading admin panel...`;
        } else {
            loginStatus.className = 'login-status error';
            loginStatus.textContent = 'Access denied: Admin privileges required';
        }
    } catch (error) {
        loginStatus.className = 'login-status error';
        loginStatus.textContent = `Login failed: ${error.message}`;
        hideAdminTabs();
    }
}

async function getCurrentUser() {
    try {
        const data = await apiCall('/auth/me', 'GET', null, false);
        currentUser = data;
        
        // Check admin access and show/hide tabs accordingly
        checkAdminAccess();
        
        return data;
    } catch (error) {
        console.error('Failed to get current user:', error);
        hideAdminTabs(); // Hide admin tabs on error
        return null;
    }
}

async function refreshToken() {
    // This would need a refresh token endpoint
    showResponse('Refresh token functionality not implemented yet', true);
}

// CRM-Style User Management Functions
let allUsers = [];
let filteredUsers = [];

async function loadUserData() {
    try {
        const data = await apiCall('/users', 'GET', null, false);
        allUsers = data.users || [];
        filteredUsers = [...allUsers];
        
        updateUserStats();
        renderUserTable();
    } catch (error) {
        console.error('Failed to load users:', error);
        showUserTableError('Failed to load users: ' + error.message);
    }
}

function updateUserStats() {
    const totalUsers = allUsers.length;
    const activeUsers = allUsers.filter(user => user.status === 'ACTIVE').length;
    const adminUsers = allUsers.filter(user => ['SUPER_ADMIN', 'ADMIN'].includes(user.role)).length;
    const recentUsers = allUsers.filter(user => {
        const createdDate = new Date(user.createdAt);
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        return createdDate > weekAgo;
    }).length;
    
    document.getElementById('totalUsers').textContent = totalUsers;
    document.getElementById('activeUsers').textContent = activeUsers;
    document.getElementById('adminUsers').textContent = adminUsers;
    document.getElementById('recentUsers').textContent = recentUsers;
}

function renderUserTable() {
    const tbody = document.getElementById('userTableBody');
    
    if (filteredUsers.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="loading-row">
                    <i class="fas fa-search" style="margin-right: 0.5rem;"></i>
                    No users found matching your criteria
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = filteredUsers.map(user => `
        <tr>
            <td>
                <div class="user-info">
                    <div class="user-avatar">
                        ${user.email.charAt(0).toUpperCase()}
                    </div>
                    <div class="user-details">
                        <h4>${user.email}</h4>
                        <p>ID: ${user.id}</p>
                    </div>
                </div>
            </td>
            <td>${user.email}</td>
            <td>
                <span class="role-badge role-${user.role.toLowerCase().replace('_', '-')}">
                    ${user.role.replace('_', ' ')}
                </span>
            </td>
            <td>
                <span class="status-badge status-${user.status.toLowerCase()}">
                    ${user.status}
                </span>
            </td>
            <td>${formatDate(user.createdAt)}</td>
            <td>${user.lastLoginAt ? formatDate(user.lastLoginAt) : 'Never'}</td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn edit" onclick="editUser('${user.id}')">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="action-btn password" onclick="changeUserPassword('${user.id}')">
                        <i class="fas fa-key"></i> Password
                    </button>
                    <button class="action-btn toggle" onclick="toggleUserStatus('${user.id}', '${user.status}')">
                        <i class="fas fa-power-off"></i> ${user.status === 'ACTIVE' ? 'Disable' : 'Enable'}
                    </button>
                    ${user.role !== 'SUPER_ADMIN' ? `
                        <button class="action-btn delete" onclick="deleteUser('${user.id}')">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    ` : ''}
                </div>
            </td>
        </tr>
    `).join('');
}

function filterUsers() {
    const searchTerm = document.getElementById('userSearch').value.toLowerCase();
    const roleFilter = document.getElementById('roleFilter').value;
    const statusFilter = document.getElementById('statusFilter').value;
    
    filteredUsers = allUsers.filter(user => {
        const matchesSearch = user.email.toLowerCase().includes(searchTerm) || 
                             user.id.toLowerCase().includes(searchTerm);
        const matchesRole = !roleFilter || user.role === roleFilter;
        const matchesStatus = !statusFilter || user.status === statusFilter;
        
        return matchesSearch && matchesRole && matchesStatus;
    });
    
    renderUserTable();
}

function formatDate(dateString) {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
}

function showUserTableError(message) {
    const tbody = document.getElementById('userTableBody');
    tbody.innerHTML = `
        <tr>
            <td colspan="7" class="loading-row" style="color: #fca5a5;">
                <i class="fas fa-exclamation-triangle" style="margin-right: 0.5rem;"></i>
                ${message}
            </td>
        </tr>
    `;
}

function refreshUserList() {
    loadUserData();
}

function showCreateUserModal() {
    // For now, we'll use a simple prompt. In a real app, you'd have a modal
    const email = prompt('Enter user email:');
    if (!email) return;
    
    const password = prompt('Enter password (min 6 characters):');
    if (!password || password.length < 6) {
        alert('Password must be at least 6 characters long');
        return;
    }
    
    const role = prompt('Enter role (USER, ADMIN, SUPPORT):', 'USER');
    if (!['USER', 'ADMIN', 'SUPPORT'].includes(role)) {
        alert('Invalid role. Must be USER, ADMIN, or SUPPORT');
        return;
    }
    
    createUserWithData(email, password, role);
}

async function createUserWithData(email, password, role) {
    try {
        await apiCall('/users', 'POST', { email, password, role }, false);
        showResponse(`User ${email} created successfully!`);
        loadUserData(); // Refresh the list
    } catch (error) {
        showResponse(`Failed to create user: ${error.message}`, true);
    }
}

async function editUser(userId) {
    const user = allUsers.find(u => u.id === userId);
    if (!user) return;
    
    const newRole = prompt(`Change role for ${user.email}:\nCurrent: ${user.role}\n\nEnter new role (USER, ADMIN, SUPPORT, SUPER_ADMIN):`, user.role);
    if (!newRole || newRole === user.role) return;
    
    if (!['USER', 'ADMIN', 'SUPPORT', 'SUPER_ADMIN'].includes(newRole)) {
        alert('Invalid role');
        return;
    }
    
    try {
        await apiCall(`/users/${userId}/role`, 'PATCH', { role: newRole }, false);
        showResponse(`User role updated successfully!`);
        loadUserData();
    } catch (error) {
        showResponse(`Failed to update user role: ${error.message}`, true);
    }
}

async function toggleUserStatus(userId, currentStatus) {
    const user = allUsers.find(u => u.id === userId);
    if (!user) return;
    
    const newStatus = currentStatus === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
    const confirmMessage = `Are you sure you want to ${newStatus === 'ACTIVE' ? 'enable' : 'disable'} user ${user.email}?`;
    
    if (!confirm(confirmMessage)) return;
    
    try {
        await apiCall(`/users/${userId}/status`, 'PATCH', { status: newStatus }, false);
        showResponse(`User status updated successfully!`);
        loadUserData();
    } catch (error) {
        showResponse(`Failed to update user status: ${error.message}`, true);
    }
}

async function deleteUser(userId) {
    const user = allUsers.find(u => u.id === userId);
    if (!user) return;
    
    const confirmMessage = `Are you sure you want to delete user ${user.email}?\n\nThis action cannot be undone!`;
    if (!confirm(confirmMessage)) return;
    
    try {
        await apiCall(`/users/${userId}`, 'DELETE', null, false);
        showResponse(`User deleted successfully!`);
        loadUserData();
    } catch (error) {
        showResponse(`Failed to delete user: ${error.message}`, true);
    }
}

async function changeUserPassword(userId) {
    console.log('changeUserPassword called with userId:', userId);
    console.log('currentUser:', currentUser);
    console.log('authToken:', authToken ? 'exists' : 'missing');
    
    const user = allUsers.find(u => u.id === userId);
    if (!user) {
        console.error('User not found:', userId);
        return;
    }
    
    const newPassword = prompt(`Enter new password for user ${user.email}:\n\nPassword must be at least 6 characters long.`);
    if (!newPassword) return;
    
    if (newPassword.length < 6) {
        alert('Password must be at least 6 characters long.');
        return;
    }
    
    const confirmPassword = prompt(`Confirm the new password for ${user.email}:`);
    if (newPassword !== confirmPassword) {
        alert('Passwords do not match. Please try again.');
        return;
    }
    
    try {
        console.log('Attempting to change password for user:', user.email);
        await apiCall(`/users/${userId}/password`, 'PATCH', { password: newPassword }, false);
        showResponse(`Password updated successfully for ${user.email}!`);
        loadUserData();
    } catch (error) {
        console.error('Password change error:', error);
        showResponse(`Failed to update password: ${error.message}`, true);
    }
}

// User management functions
async function createUser() {
    const email = document.getElementById('createUserEmail').value;
    const password = document.getElementById('createUserPassword').value;
    const role = document.getElementById('createUserRole').value;
    
    if (!email || !password) {
        showResponse('Email and password are required', true);
        return;
    }
    
    try {
        const data = await apiCall('/users', 'POST', { email, password, role });
        showResponse(`User created successfully: ${data.email}`);
        document.getElementById('createUserEmail').value = '';
        document.getElementById('createUserPassword').value = '';
    } catch (error) {
        showResponse(`Failed to create user: ${error.message}`, true);
    }
}

async function getAllUsers() {
    try {
        const data = await apiCall('/users');
        
        // Display users in a formatted way
        if (data && data.users && Array.isArray(data.users)) {
            displayUserList(data.users);
        } else {
            showResponse(data);
        }
    } catch (error) {
        showResponse(`Failed to get users: ${error.message}`, true);
    }
}

function displayUserList(users) {
    const userListCard = document.getElementById('userListCard');
    const userList = document.getElementById('userList');
    
    if (!users || users.length === 0) {
        userList.innerHTML = '<p>No users found.</p>';
        userListCard.style.display = 'block';
        return;
    }
    
    let html = '<table style="width: 100%; border-collapse: collapse; margin-top: 10px;">';
    html += '<thead><tr style="background: #f8f9fa;">';
    html += '<th style="padding: 10px; border: 1px solid #dee2e6; text-align: left;">ID</th>';
    html += '<th style="padding: 10px; border: 1px solid #dee2e6; text-align: left;">Email</th>';
    html += '<th style="padding: 10px; border: 1px solid #dee2e6; text-align: left;">Role</th>';
    html += '<th style="padding: 10px; border: 1px solid #dee2e6; text-align: left;">Status</th>';
    html += '<th style="padding: 10px; border: 1px solid #dee2e6; text-align: left;">Created</th>';
    html += '<th style="padding: 10px; border: 1px solid #dee2e6; text-align: left;">Actions</th>';
    html += '</tr></thead><tbody>';
    
    users.forEach(user => {
        const statusColor = user.status === 'ACTIVE' ? '#28a745' : 
                           user.status === 'DISABLED' ? '#6c757d' : '#dc3545';
        const roleColor = user.role === 'SUPER_ADMIN' ? '#dc3545' : 
                         user.role === 'ADMIN' ? '#fd7e14' : 
                         user.role === 'SUPPORT' ? '#20c997' : '#6c757d';
        
        html += `<tr style="border-bottom: 1px solid #dee2e6;">`;
        html += `<td style="padding: 8px; font-family: monospace; font-size: 0.9em;">${user.id}</td>`;
        html += `<td style="padding: 8px;">${user.email}</td>`;
        html += `<td style="padding: 8px;"><span style="color: ${roleColor}; font-weight: bold;">${user.role}</span></td>`;
        html += `<td style="padding: 8px;"><span style="color: ${statusColor}; font-weight: bold;">${user.status}</span></td>`;
        html += `<td style="padding: 8px; font-size: 0.9em;">${new Date(user.createdAt).toLocaleDateString()}</td>`;
        html += `<td style="padding: 8px;">`;
        html += `<button onclick="fillUserForm('${user.id}', '${user.email}', '${user.role}', '${user.status}')" style="background: #007bff; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 0.8em; margin-right: 4px;">Quick Fill</button>`;
        html += `</td>`;
        html += `</tr>`;
    });
    
    html += '</tbody></table>';
    
    userList.innerHTML = html;
    userListCard.style.display = 'block';
    
    // Also show in response area
    showResponse(`Found ${users.length} users. Displayed in table above.`);
}

function fillUserForm(userId, email, role, status) {
    // This function is no longer needed with the new CRM interface
    showResponse(`Forms filled with data for user: ${email} (${role})`);
}

async function getSessionAssignmentStats() {
    try {
        const data = await apiCall('/sessions/assignment-stats');
        showResponse(data);
    } catch (error) {
        showResponse(`Failed to get session assignment stats: ${error.message}`, true);
    }
}

async function getUserById() {
    const userId = prompt('Enter User ID:');
    if (userId) {
        try {
            const data = await apiCall(`/users/${userId}`);
            showResponse(data);
        } catch (error) {
            showResponse(`Failed to get user: ${error.message}`, true);
        }
    }
}

// This function is now handled by the new changeUserPassword(userId) function

// This function is now handled by the new toggleUserStatus(userId, currentStatus) function

// This function is now handled by the new updateUserRole(userId) function

// This function is now handled by the new deleteUser(userId) function

// Session management functions
async function createSession() {
    const name = document.getElementById('sessionName').value;
    const notes = document.getElementById('sessionNotes').value;
    
    if (!name) {
        showResponse('Session name is required', true);
        return;
    }
    
    try {
        const data = await apiCall('/sessions', 'POST', { name, notes });
        showResponse(`Session created successfully: ${data.name}`);
        document.getElementById('sessionName').value = '';
        document.getElementById('sessionNotes').value = '';
    } catch (error) {
        showResponse(`Failed to create session: ${error.message}`, true);
    }
}

async function getAllSessions() {
    try {
        const data = await apiCall('/sessions');
        showResponse(data);
    } catch (error) {
        showResponse(`Failed to get sessions: ${error.message}`, true);
    }
}

async function getSessionById() {
    const sessionId = prompt('Enter Session ID:');
    if (sessionId) {
        try {
            const data = await apiCall(`/sessions/${sessionId}`);
            showResponse(data);
        } catch (error) {
            showResponse(`Failed to get session: ${error.message}`, true);
        }
    }
}

async function deleteSession() {
    const sessionId = prompt('Enter Session ID to delete:');
    if (sessionId) {
        if (confirm('Are you sure you want to delete this session?')) {
            try {
                const data = await apiCall(`/sessions/${sessionId}`, 'DELETE');
                showResponse(`Session deleted successfully`);
            } catch (error) {
                showResponse(`Failed to delete session: ${error.message}`, true);
            }
        }
    }
}

// Proxy management functions
async function addProxy() {
    const name = document.getElementById('proxyName').value;
    const host = document.getElementById('proxyHost').value;
    const port = parseInt(document.getElementById('proxyPort').value);
    const protocol = document.getElementById('proxyProtocol').value;
    
    if (!name || !host || !port) {
        showResponse('Name, host, and port are required', true);
        return;
    }
    
    try {
        const data = await apiCall('/proxies', 'POST', { name, host, port, protocol });
        showResponse(`Proxy added successfully: ${data.name}`);
        document.getElementById('proxyName').value = '';
        document.getElementById('proxyHost').value = '';
        document.getElementById('proxyPort').value = '';
    } catch (error) {
        showResponse(`Failed to add proxy: ${error.message}`, true);
    }
}

async function getAllProxies() {
    try {
        const data = await apiCall('/proxies');
        showResponse(data);
    } catch (error) {
        showResponse(`Failed to get proxies: ${error.message}`, true);
    }
}

async function getProxyById() {
    const proxyId = prompt('Enter Proxy ID:');
    if (proxyId) {
        try {
            const data = await apiCall(`/proxies/${proxyId}`);
            showResponse(data);
        } catch (error) {
            showResponse(`Failed to get proxy: ${error.message}`, true);
        }
    }
}

// Domain management functions
async function addDomain() {
    const label = document.getElementById('domainLabel').value;
    const baseUrl = document.getElementById('domainBaseUrl').value;
    const description = document.getElementById('domainDescription').value;
    
    if (!label || !baseUrl) {
        showResponse('Label and base URL are required', true);
        return;
    }
    
    try {
        const data = await apiCall('/domains', 'POST', { label, baseUrl, description });
        showResponse(`Domain added successfully: ${data.label}`);
        document.getElementById('domainLabel').value = '';
        document.getElementById('domainBaseUrl').value = '';
        document.getElementById('domainDescription').value = '';
    } catch (error) {
        showResponse(`Failed to add domain: ${error.message}`, true);
    }
}

async function getAllDomains() {
    try {
        const data = await apiCall('/domains');
        showResponse(data);
    } catch (error) {
        showResponse(`Failed to get domains: ${error.message}`, true);
    }
}

async function getDomainById() {
    const domainId = prompt('Enter Domain ID:');
    if (domainId) {
        try {
            const data = await apiCall(`/domains/${domainId}`);
            showResponse(data);
        } catch (error) {
            showResponse(`Failed to get domain: ${error.message}`, true);
        }
    }
}
