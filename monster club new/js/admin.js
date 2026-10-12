// Admin Panel Logic - PIN Protected (PIN: 1234)

const ADMIN_PIN = "1234";

const authLoader = document.getElementById('auth-loader');
const adminUI = document.getElementById('admin-ui');
const adminEmail = document.getElementById('admin-email');

const adminLoginContainer = document.getElementById('admin-login-container');
const adminLoginForm = document.getElementById('admin-login-form');
const adminLoginError = document.getElementById('admin-login-error');

function checkPinAuth() {
    return sessionStorage.getItem('admin_pin_authenticated') === 'true' || 
           localStorage.getItem('admin_pin_authenticated') === 'true';
}

function setPinAuth(status) {
    if (status) {
        sessionStorage.setItem('admin_pin_authenticated', 'true');
        localStorage.setItem('admin_pin_authenticated', 'true');
    } else {
        sessionStorage.removeItem('admin_pin_authenticated');
        localStorage.removeItem('admin_pin_authenticated');
    }
}

let dashboardInitialized = false;
async function enterAdminDashboard() {
    if (authLoader) authLoader.style.display = 'none';
    if (adminLoginContainer) adminLoginContainer.style.display = 'none';
    if (adminUI) adminUI.style.display = 'flex';
    if (adminEmail) adminEmail.innerText = "Admin (PIN: 1234)";

    // Ensure Firebase auth in background for backend permissions
    if (!firebase.auth().currentUser) {
        try {
            await firebase.auth().signInWithEmailAndPassword('admin@monsterclub.com', 'monsterclub1234');
        } catch (err) {
            console.warn("Firebase background auth note:", err);
        }
    }

    if (!dashboardInitialized) {
        dashboardInitialized = true;
        loadOverview();
        loadBookings();
        loadPackages();
        loadUsers();
        loadPhotos();
        loadVideos();
        togglePkgSampleInput();
    }
}

function showPinLogin() {
    if (authLoader) authLoader.style.display = 'none';
    if (adminUI) adminUI.style.display = 'none';
    if (adminLoginContainer) adminLoginContainer.style.display = 'flex';
    const pinInput = document.getElementById('admin-pin-input');
    if (pinInput) {
        pinInput.value = '';
        setTimeout(() => pinInput.focus(), 150);
    }
}

// 1. Initial Access Check
if (checkPinAuth()) {
    enterAdminDashboard();
} else {
    showPinLogin();
}

// 2. PIN Login Form Handler
if (adminLoginForm) {
    adminLoginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const pinInput = document.getElementById('admin-pin-input');
        const pin = pinInput ? pinInput.value.trim() : '';
        if (adminLoginError) adminLoginError.style.display = 'none';

        if (pin === ADMIN_PIN) {
            setPinAuth(true);
            enterAdminDashboard();
        } else {
            if (adminLoginError) {
                adminLoginError.innerText = "❌ Incorrect PIN! Please enter the correct PIN.";
                adminLoginError.style.display = 'block';
            }
            if (pinInput) {
                pinInput.value = '';
                pinInput.focus();
            }
        }
    });
}

// Toggle PIN visibility button
const togglePinBtn = document.getElementById('toggle-pin-btn');
if (togglePinBtn) {
    togglePinBtn.addEventListener('click', () => {
        const pinInput = document.getElementById('admin-pin-input');
        if (!pinInput) return;
        if (pinInput.type === 'password') {
            pinInput.type = 'text';
            togglePinBtn.innerText = '🙈';
        } else {
            pinInput.type = 'password';
            togglePinBtn.innerText = '👁️';
        }
    });
}

// Mobile Sidebar Drawer Controls
function openMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar) sidebar.classList.add('active');
    if (overlay) overlay.classList.add('active');
    document.body.classList.add('sidebar-open');
}

function closeMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar) sidebar.classList.remove('active');
    if (overlay) overlay.classList.remove('active');
    document.body.classList.remove('sidebar-open');
}

function toggleMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar && sidebar.classList.contains('active')) {
        closeMobileSidebar();
    } else {
        openMobileSidebar();
    }
}

const sidebarToggleBtn = document.getElementById('sidebar-toggle-btn');
if (sidebarToggleBtn) sidebarToggleBtn.addEventListener('click', toggleMobileSidebar);

const sidebarCloseBtn = document.getElementById('sidebar-close-btn');
if (sidebarCloseBtn) sidebarCloseBtn.addEventListener('click', closeMobileSidebar);

const sidebarOverlay = document.getElementById('sidebar-overlay');
if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeMobileSidebar);

// Logout Handler (Desktop & Mobile)
function handleLogout() {
    setPinAuth(false);
    if (firebase.auth().currentUser) {
        firebase.auth().signOut().finally(() => {
            window.location.reload();
        });
    } else {
        window.location.reload();
    }
}

const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);

const mobileLogoutBtn = document.getElementById('mobile-logout-btn');
if (mobileLogoutBtn) mobileLogoutBtn.addEventListener('click', handleLogout);

// 2. Responsive Tab Switching
window.switchTab = function(tabId, clickedElement) {
    // Update active nav link
    document.querySelectorAll('.nav-links li').forEach(li => li.classList.remove('active'));
    if (clickedElement) {
        clickedElement.classList.add('active');
    } else if (window.event && window.event.currentTarget) {
        window.event.currentTarget.classList.add('active');
    }

    // Update active section
    document.querySelectorAll('.tab-content').forEach(section => section.classList.remove('active'));
    const targetTab = document.getElementById(`tab-${tabId}`);
    if (targetTab) targetTab.classList.add('active');

    // Automatically close sidebar on mobile when tab is selected
    closeMobileSidebar();
};

// 3. Bookings Management
async function loadBookings() {
    const tbodyNew = document.getElementById('bookings-body');
    const tbodyConf = document.getElementById('confirmed-bookings-body');
    if(tbodyNew) tbodyNew.innerHTML = '<tr><td colspan="6">Loading...</td></tr>';
    if(tbodyConf) tbodyConf.innerHTML = '<tr><td colspan="6">Loading...</td></tr>';
    
    try {
        const snapshot = await db.collection('bookings').orderBy('timestamp', 'desc').get();
        if(tbodyNew) tbodyNew.innerHTML = '';
        if(tbodyConf) tbodyConf.innerHTML = '';
        
        let newCount = 0;
        let confCount = 0;

        snapshot.forEach(doc => {
            const data = doc.data();
            const date = data.timestamp ? new Date(data.timestamp.toDate()).toLocaleString([], {year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute:'2-digit'}) : 'N/A';
            const status = data.status || 'New';
            
            if (status === 'New') {
                newCount++;
                if(tbodyNew) {
                    tbodyNew.innerHTML += `
                        <tr>
                            <td>${date}</td>
                            <td>${data.name}</td>
                            <td>${data.phone}</td>
                            <td>${data.type}</td>
                            <td><span style="color: #2ed573;">New</span></td>
                            <td>
                                <button class="btn-edit" style="background:#2ecc71; color:#fff;" onclick="updateBookingStatus('${doc.id}', 'Confirmed')">Confirm</button>
                                <button class="btn-delete" style="background:#e67e22; color:#fff;" onclick="updateBookingStatus('${doc.id}', 'Rejected')">Reject</button>
                                <button class="btn-delete" onclick="deleteBooking('${doc.id}')">Delete</button>
                            </td>
                        </tr>
                    `;
                }
            } else if (status === 'Confirmed') {
                confCount++;
                const confDate = data.confirmedAt ? new Date(data.confirmedAt.toDate()).toLocaleString([], {year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute:'2-digit'}) : 'N/A';
                if(tbodyConf) {
                    tbodyConf.innerHTML += `
                        <tr>
                            <td>${date}</td>
                            <td style="color:#D4AF37;">${confDate}</td>
                            <td>${data.name}</td>
                            <td>${data.phone}</td>
                            <td>${data.type}</td>
                            <td>
                                <button class="btn-delete" onclick="deleteBooking('${doc.id}')">Delete</button>
                            </td>
                        </tr>
                    `;
                }
            }
        });

        if (newCount === 0 && tbodyNew) tbodyNew.innerHTML = '<tr><td colspan="6">No new bookings yet.</td></tr>';
        if (confCount === 0 && tbodyConf) tbodyConf.innerHTML = '<tr><td colspan="6">No confirmed orders.</td></tr>';

    } catch (error) {
        console.error("Error loading bookings:", error);
        if(tbodyNew) tbodyNew.innerHTML = '<tr><td colspan="6" style="color:red;">Failed to load bookings.</td></tr>';
    }
}

window.updateBookingStatus = async (id, status) => {
    try {
        const updateData = { status: status };
        if (status === 'Confirmed') {
            updateData.confirmedAt = firebase.firestore.FieldValue.serverTimestamp();
        }
        await db.collection('bookings').doc(id).update(updateData);
        loadBookings();
    } catch (err) {
        console.error(err);
        alert("Failed to update status");
    }
}

window.deleteBooking = async (id) => {
    if(confirm("Are you sure you want to delete this booking?")) {
        await db.collection('bookings').doc(id).delete();
        loadBookings();
    }
}

// 4. Packages Management
const modal = document.getElementById('package-modal');
const form = document.getElementById('package-form');
const saveBtn = document.getElementById('pkg-save-btn');

window.togglePkgSampleInput = () => {
    const category = document.getElementById('pkg-category').value;
    if(category === 'Photography') {
        document.getElementById('pkg-sample-photo-container').style.display = 'block';
        document.getElementById('pkg-sample-video-container').style.display = 'none';
    } else {
        document.getElementById('pkg-sample-photo-container').style.display = 'none';
        document.getElementById('pkg-sample-video-container').style.display = 'block';
    }
};

window.showAddPackageModal = () => {
    document.getElementById('modal-title').innerText = "Add Package";
    document.getElementById('pkg-id').value = "";
    form.reset();
    togglePkgSampleInput();
    modal.style.display = 'flex';
}

window.closePackageModal = () => {
    modal.style.display = 'none';
}

// Helper to convert YouTube URL to no-cookie embed URL for file:// compatibility
function getYouTubeEmbedUrl(url) {
    if (!url) return "";
    let videoId = '';
    if (url.includes('youtu.be/')) {
        videoId = url.split('youtu.be/')[1].split('?')[0];
    } else if (url.includes('watch?v=')) {
        videoId = url.split('watch?v=')[1].split('&')[0];
    } else if (url.includes('embed/')) {
        videoId = url.split('embed/')[1].split('?')[0];
    }
    
    if (videoId) {
        return `https://www.youtube-nocookie.com/embed/${videoId}`;
    }
    return url;
}

function getYouTubeThumbnail(url) {
    let videoId = '';
    if (url.includes('youtu.be/')) {
        videoId = url.split('youtu.be/')[1].split('?')[0];
    } else if (url.includes('watch?v=')) {
        videoId = url.split('watch?v=')[1].split('&')[0];
    } else if (url.includes('embed/')) {
        videoId = url.split('embed/')[1].split('?')[0];
    }
    
    if (videoId) {
        return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    }
    return '';
}

// Image Compressor Helper to bypass file:// CORS and fit in Firestore (under 1MB)
function resizeAndConvertImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                const maxDim = 800; // Max width/height

                if (width > height) {
                    if (width > maxDim) {
                        height *= maxDim / width;
                        width = maxDim;
                    }
                } else {
                    if (height > maxDim) {
                        width *= maxDim / height;
                        height = maxDim;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                // Compress to 70% quality JPEG
                const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                resolve(dataUrl);
            };
            img.onerror = reject;
            img.src = event.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    saveBtn.innerText = "Saving...";
    saveBtn.disabled = true;
    
    const id = document.getElementById('pkg-id').value;
    const category = document.getElementById('pkg-category').value;
    
    let sampleUrl = "";

    try {
        // Use Base64 instead of Storage to avoid file:// CORS issues
        if (category === 'Photography') {
            const photoFile = document.getElementById('pkg-sample-photo').files[0];
            if (photoFile) {
                sampleUrl = await resizeAndConvertImage(photoFile);
            }
        } else {
            const rawVideoUrl = document.getElementById('pkg-sample-video').value;
            sampleUrl = getYouTubeEmbedUrl(rawVideoUrl);
        }

        const data = {
            category: category,
            title: document.getElementById('pkg-title').value,
            price: document.getElementById('pkg-price').value,
            description: document.getElementById('pkg-desc').value,
            details: document.getElementById('pkg-details').value,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        };

        if (sampleUrl) {
            data.sampleUrl = sampleUrl;
        }

        if (id) {
            await db.collection('packages').doc(id).update(data);
        } else {
            await db.collection('packages').add(data);
        }
        
        closePackageModal();
        loadPackages();
    } catch (error) {
        console.error("Error saving package:", error);
        alert("Failed to save. Check console.");
    } finally {
        saveBtn.innerText = "Save Package";
        saveBtn.disabled = false;
    }
});

const loadedPackages = {};
async function loadPackages() {
    const grid = document.getElementById('packages-grid');
    grid.innerHTML = '<p>Loading...</p>';

    try {
        const snapshot = await db.collection('packages').orderBy('timestamp', 'desc').get();
        grid.innerHTML = '';
        
        if(snapshot.empty) {
            grid.innerHTML = '<p>No packages found. Add one!</p>';
            return;
        }

        snapshot.forEach(doc => {
            const data = doc.data();
            loadedPackages[doc.id] = data;
            
            let displayPrice = '';
            if (data.price) {
                let clean = String(data.price).replace(/rs\.?/i, '').trim();
                displayPrice = `Rs. ${clean}`;
            }

            grid.innerHTML += `
                <div class="pkg-card">
                    <span class="badge">${data.category}</span>
                    <h3>${data.title}</h3>
                    <h4 style="color:#D4AF37; margin:5px 0;">${displayPrice}</h4>
                    <p>${data.description}</p>
                    <div class="pkg-actions">
                        <button class="btn-edit" onclick="editPackage('${doc.id}')">Edit</button>
                        <button class="btn-del" onclick="deletePackage('${doc.id}')">Delete</button>
                    </div>
                </div>
            `;
        });
    } catch (error) {
        console.error("Error loading packages:", error);
        grid.innerHTML = '<p style="color:red;">Failed to load packages.</p>';
    }
}

window.editPackage = (id) => {
    const data = loadedPackages[id];
    if(!data) return;
    
    document.getElementById('modal-title').innerText = "Edit Package";
    document.getElementById('pkg-id').value = id;
    document.getElementById('pkg-category').value = data.category;
    document.getElementById('pkg-title').value = data.title;
    document.getElementById('pkg-price').value = data.price || '';
    document.getElementById('pkg-desc').value = data.description || '';
    document.getElementById('pkg-details').value = data.details || '';
    
    // Reset file/url inputs
    document.getElementById('pkg-sample-photo').value = '';
    document.getElementById('pkg-sample-video').value = (data.category === 'Videography') ? (data.sampleUrl || '') : '';
    
    togglePkgSampleInput();
    modal.style.display = 'flex';
}

window.deletePackage = async (id) => {
    if(confirm("Are you sure you want to delete this package?")) {
        await db.collection('packages').doc(id).delete();
        loadPackages();
    }
}

// 5. Photo Gallery Management
const photoModal = document.getElementById('photo-modal');
const photoForm = document.getElementById('photo-form');
const photoSaveBtn = document.getElementById('photo-save-btn');

window.showAddPhotoModal = () => {
    document.getElementById('photo-modal-title').innerText = "Add Photo";
    document.getElementById('photo-id').value = "";
    document.getElementById('photo-existing-url').value = "";
    photoForm.reset();
    photoModal.style.display = 'flex';
}
window.closePhotoModal = () => photoModal.style.display = 'none';

photoForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    photoSaveBtn.innerText = "Saving...";
    photoSaveBtn.disabled = true;

    const id = document.getElementById('photo-id').value;
    const existingUrl = document.getElementById('photo-existing-url').value;
    const file = document.getElementById('photo-file').files[0];
    const desc = document.getElementById('photo-desc').value;

    try {
        let finalUrl = existingUrl;
        if (file) {
            finalUrl = await resizeAndConvertImage(file);
        }

        const data = {
            url: finalUrl,
            description: desc,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        };

        if (id) {
            await db.collection('gallery_photos').doc(id).update(data);
        } else {
            await db.collection('gallery_photos').add(data);
        }
        
        closePhotoModal();
        loadPhotos();
    } catch (err) {
        console.error(err);
        alert("Failed to save photo");
    } finally {
        photoSaveBtn.innerText = "Save Photo";
        photoSaveBtn.disabled = false;
    }
});

const loadedPhotos = {};
async function loadPhotos() {
    const grid = document.getElementById('photos-grid');
    grid.innerHTML = '<p>Loading...</p>';
    try {
        const snapshot = await db.collection('gallery_photos').orderBy('timestamp', 'desc').get();
        grid.innerHTML = '';
        if(snapshot.empty) { grid.innerHTML = '<p>No photos yet.</p>'; return; }
        
        snapshot.forEach(doc => {
            const data = doc.data();
            loadedPhotos[doc.id] = data;
            grid.innerHTML += `
                <div class="pkg-card">
                    <img src="${data.url}" style="width:100%; border-radius:5px; margin-bottom:10px;">
                    <p>${data.description}</p>
                    <div class="pkg-actions">
                        <button class="btn-edit" onclick="editPhoto('${doc.id}')">Edit</button>
                        <button class="btn-del" onclick="deletePhoto('${doc.id}')">Delete</button>
                    </div>
                </div>
            `;
        });
    } catch (err) { console.error(err); }
}

window.editPhoto = (id) => {
    const data = loadedPhotos[id];
    if(!data) return;
    
    document.getElementById('photo-modal-title').innerText = "Edit Photo";
    document.getElementById('photo-id').value = id;
    document.getElementById('photo-existing-url').value = data.url;
    document.getElementById('photo-desc').value = data.description;
    document.getElementById('photo-file').value = ''; // Reset file input
    
    photoModal.style.display = 'flex';
}

window.deletePhoto = async (id) => {
    if(confirm("Delete this photo?")) {
        await db.collection('gallery_photos').doc(id).delete();
        loadPhotos();
    }
}

// 6. Video Gallery Management
const videoModal = document.getElementById('video-modal');
const videoForm = document.getElementById('video-form');

window.showAddVideoModal = () => {
    document.getElementById('video-modal-title').innerText = "Add Video";
    document.getElementById('video-id').value = "";
    videoForm.reset();
    videoModal.style.display = 'flex';
}
window.closeVideoModal = () => videoModal.style.display = 'none';

videoForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('video-id').value;
    const url = document.getElementById('video-url').value;
    const desc = document.getElementById('video-desc').value;

    const embedUrl = getYouTubeEmbedUrl(url);

    try {
        const data = {
            url: embedUrl,
            description: desc,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        };

        if (id) {
            await db.collection('gallery_videos').doc(id).update(data);
        } else {
            await db.collection('gallery_videos').add(data);
        }
        closeVideoModal();
        loadVideos();
    } catch (err) {
        console.error(err);
        alert("Failed to save video");
    }
});

const loadedVideos = {};
async function loadVideos() {
    const grid = document.getElementById('videos-grid');
    grid.innerHTML = '<p>Loading...</p>';
    try {
        const snapshot = await db.collection('gallery_videos').orderBy('timestamp', 'desc').get();
        grid.innerHTML = '';
        if(snapshot.empty) { grid.innerHTML = '<p>No videos yet.</p>'; return; }
        
        snapshot.forEach(doc => {
            const data = doc.data();
            loadedVideos[doc.id] = data;
            const thumbUrl = getYouTubeThumbnail(data.url) || '';
            grid.innerHTML += `
                <div class="pkg-card">
                    <div style="position: relative; cursor:pointer;" onclick="window.open('${data.url}', '_blank')">
                        <img src="${thumbUrl}" alt="Video" style="width: 100%; border-radius: 5px; height: 150px; object-fit: cover;">
                        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(0,0,0,0.7); padding: 10px; border-radius: 50%; color: #D4AF37;">▶</div>
                    </div>
                    <p>${data.description}</p>
                    <div class="pkg-actions">
                        <button class="btn-edit" onclick="editVideo('${doc.id}')">Edit</button>
                        <button class="btn-del" onclick="deleteVideo('${doc.id}')">Delete</button>
                    </div>
                </div>
            `;
        });
    } catch (err) { console.error(err); }
}

window.editVideo = (id) => {
    const data = loadedVideos[id];
    if(!data) return;
    
    document.getElementById('video-modal-title').innerText = "Edit Video";
    document.getElementById('video-id').value = id;
    document.getElementById('video-url').value = data.url;
    document.getElementById('video-desc').value = data.description;
    
    videoModal.style.display = 'flex';
}

window.deleteVideo = async (id) => {
    if(confirm("Delete this video?")) {
        await db.collection('gallery_videos').doc(id).delete();
        loadVideos();
    }
}



// --- OVERVIEW & USERS MANAGEMENT --- //

let ordersChartInstance = null;
let galleryPieChartInstance = null;
let allBookingsData = [];

async function loadOverview() {
    try {
        const bookingsSnap = await db.collection('bookings').get();
        document.getElementById('stat-bookings').innerText = bookingsSnap.size;

        allBookingsData = [];
        bookingsSnap.forEach(doc => allBookingsData.push(doc.data()));

        const usersSnap = await db.collection('users').get();
        document.getElementById('stat-users').innerText = usersSnap.size;

        const pkgsSnap = await db.collection('packages').get();
        document.getElementById('stat-packages').innerText = pkgsSnap.size;

        // Fetch Gallery Data for Pie Chart
        const photosSnap = await db.collection('gallery_photos').get();
        const videosSnap = await db.collection('gallery_videos').get();
        
        renderGalleryPieChart(photosSnap.size, videosSnap.size);
        window.updateOrdersChart(); // Initialize orders chart with default filter

    } catch (error) {
        console.error('Error loading overview:', error);
    }
}

window.updateOrdersChart = function() {
    const filter = document.getElementById('chart-time-filter').value;
    
    const counts = {};

    allBookingsData.forEach(booking => {
        if (!booking.timestamp) return;
        const dateObj = booking.timestamp.toDate();
        let key = '';

        if (filter === 'day') {
            key = dateObj.toLocaleDateString(); 
        } else if (filter === 'month') {
            key = dateObj.toLocaleString('default', { month: 'short', year: 'numeric' });
        } else if (filter === 'year') {
            key = dateObj.getFullYear().toString();
        }

        counts[key] = (counts[key] || 0) + 1;
    });
    
    // Sort keys chronologically
    const sortedKeys = Object.keys(counts).sort((a, b) => new Date(a) - new Date(b));
    
    const labels = [];
    const data = [];
    
    sortedKeys.forEach(k => {
        labels.push(k);
        data.push(counts[k]);
    });

    const ctx = document.getElementById('ordersChart').getContext('2d');
    
    if (ordersChartInstance) {
        ordersChartInstance.destroy();
    }

    // Chart text color config
    Chart.defaults.color = '#888';

    ordersChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Number of Orders',
                data: data,
                backgroundColor: 'rgba(212, 175, 55, 0.6)',
                borderColor: 'rgba(212, 175, 55, 1)',
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: { 
                    beginAtZero: true, 
                    ticks: { stepSize: 1, color: '#888' },
                    grid: { color: '#2a2a30' }
                },
                x: {
                    ticks: { color: '#888' },
                    grid: { display: false }
                }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}

function renderGalleryPieChart(photoCount, videoCount) {
    const ctx = document.getElementById('galleryPieChart').getContext('2d');
    
    if (galleryPieChartInstance) {
        galleryPieChartInstance.destroy();
    }

    galleryPieChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Photography', 'Videography'],
            datasets: [{
                data: [photoCount, videoCount],
                backgroundColor: ['#D4AF37', '#e74c3c'],
                borderColor: '#16161a',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#ccc', padding: 20 }
                }
            }
        }
    });
}

async function loadUsers() {
    const tbody = document.getElementById('users-body');
    tbody.innerHTML = '<tr><td colspan="3">Loading...</td></tr>';
    
    try {
        const snapshot = await db.collection('users').orderBy('lastLogin', 'desc').get();
        tbody.innerHTML = '';
        
        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="3">No users registered yet.</td></tr>';
            return;
        }

        snapshot.forEach(doc => {
            const data = doc.data();
            const date = data.lastLogin ? new Date(data.lastLogin.toDate()).toLocaleString() : 'N/A';
            
            tbody.innerHTML += `
                <tr>
                    <td>${data.name || 'User'}</td>
                    <td>${data.email}</td>
                    <td>${date}</td>
                </tr>
            `;
        });
    } catch (error) {
        console.error("Error loading users:", error);
        tbody.innerHTML = '<tr><td colspan="3" style="color:red;">Failed to load users.</td></tr>';
    }
}
