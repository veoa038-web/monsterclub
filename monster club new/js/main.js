// Initialize scripts once DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
    
    // --- Mobile Hamburger Menu Logic ---
    const hamburger = document.getElementById('hamburger');
    const navMenu = document.getElementById('nav-menu');
    const navLinks = document.querySelectorAll('.nav-link');

    if (hamburger && navMenu) {
        hamburger.addEventListener('click', () => {
            navMenu.classList.toggle('active');
            hamburger.classList.toggle('toggle');
        });

        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                navMenu.classList.remove('active');
                hamburger.classList.remove('toggle');
            });
        });
    }

    // --- Client Auth Modal Logic ---
    const authModal = document.getElementById('auth-modal');
    const navAuthBtn = document.getElementById('nav-auth-btn');
    const closeAuthBtn = document.getElementById('close-auth-modal');
    const authForm = document.getElementById('auth-form');
    const authTitle = document.getElementById('auth-title');
    const authSubmitBtn = document.getElementById('auth-submit-btn');
    const switchAuthMode = document.getElementById('switch-auth-mode');
    const googleAuthBtn = document.getElementById('google-auth-btn');
    
    const bookingForm = document.getElementById('booking-form');
    let isLogin = true;

    // Open/Close Modal
    navAuthBtn.addEventListener('click', () => {
        if (firebase.auth().currentUser) {
            // If already logged in, this acts as logout
            firebase.auth().signOut();
        } else {
            authModal.style.display = 'flex';
        }
    });

    closeAuthBtn.addEventListener('click', () => {
        authModal.style.display = 'none';
    });

    // Switch between Login and Register
    switchAuthMode.addEventListener('click', () => {
        isLogin = !isLogin;
        authTitle.innerText = isLogin ? "Client Login" : "Client Register";
        authSubmitBtn.innerText = isLogin ? "Login" : "Register";
        switchAuthMode.innerText = isLogin ? "Register here" : "Login here";
        switchAuthMode.parentNode.childNodes[0].nodeValue = isLogin ? "Don't have an account? " : "Already have an account? ";
    });

    // Email/Password Submit
    authForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('auth-email').value;
        const password = document.getElementById('auth-password').value;

        if (isLogin) {
            firebase.auth().signInWithEmailAndPassword(email, password)
                .then(() => { authModal.style.display = 'none'; })
                .catch(err => alert("Error: " + err.message));
        } else {
            firebase.auth().createUserWithEmailAndPassword(email, password)
                .then(() => { authModal.style.display = 'none'; })
                .catch(err => alert("Error: " + err.message));
        }
    });

    // Google Auth
    googleAuthBtn.addEventListener('click', () => {
        const provider = new firebase.auth.GoogleAuthProvider();
        firebase.auth().signInWithPopup(provider)
            .then(() => { authModal.style.display = 'none'; })
            .catch(err => alert("Error: " + err.message));
    });

    let userOrdersUnsubscribe = null;

    // --- Check Auth State to Enable/Disable Ordering & Track Users ---
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            // Logged in
            navAuthBtn.innerHTML = "Logout";
            bookingForm.classList.remove('booking-locked');
            // Enable inputs
            bookingForm.querySelectorAll('input, select, button').forEach(el => el.disabled = false);

            document.getElementById('my-orders-btn').style.display = 'inline-block';

            if (userOrdersUnsubscribe) userOrdersUnsubscribe();
            // Listen for user's orders
            userOrdersUnsubscribe = db.collection('bookings')
              .where('userId', '==', user.uid)
              .onSnapshot(snapshot => {
                  const count = snapshot.size;
                  document.getElementById('my-orders-count').innerText = count;
                  
                  const ordersList = document.getElementById('my-orders-list');
                  if (count === 0) {
                      ordersList.innerHTML = '<p style="text-align:center; color:#888;">You have no orders yet.</p>';
                  } else {
                      let html = '';
                      // Sort by timestamp in memory since we can't chain orderBy with where without an index
                      const docs = [];
                      snapshot.forEach(doc => docs.push({ id: doc.id, ...doc.data() }));
                      docs.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));

                      docs.forEach(data => {
                          const status = data.status || 'New';
                          let statusColor = status === 'New' ? '#2ed573' : (status === 'Confirmed' ? '#D4AF37' : '#e74c3c');
                          const date = data.timestamp ? new Date(data.timestamp.toDate()).toLocaleDateString() : 'N/A';
                          
                          html += `
                              <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 15px; margin-bottom: 10px;">
                                  <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                                      <strong style="color: #fff; font-size: 1.1rem;">${data.type} Package</strong>
                                      <span style="background: ${statusColor}; color: #000; padding: 2px 8px; border-radius: 12px; font-size: 0.8rem; font-weight: bold;">${status}</span>
                                  </div>
                                  <div style="color: #aaa; font-size: 0.9rem;">Ordered on: ${date}</div>
                                  <div style="color: #aaa; font-size: 0.9rem;">Name: ${data.name} | Phone: ${data.phone}</div>
                              </div>
                          `;
                      });
                      ordersList.innerHTML = html;
                  }
              });

            // Save user to Firestore to show in Admin Panel
            db.collection('users').doc(user.uid).set({
                email: user.email,
                lastLogin: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true }).catch(console.error);

        } else {
            // Logged out
            navAuthBtn.innerHTML = "Login";
            document.getElementById('my-orders-btn').style.display = 'none';
            if (userOrdersUnsubscribe) {
                userOrdersUnsubscribe();
                userOrdersUnsubscribe = null;
            }
            bookingForm.classList.add('booking-locked');
            // Disable inputs
            bookingForm.querySelectorAll('input, select, button').forEach(el => el.disabled = true);
        }
    });

    // --- Load Packages and Galleries from Firestore ---
    loadPublicPackages();
    loadClientGalleries();

window.updateSubCategories = () => {
    const category = document.getElementById('b-category').value;
    const typeSelect = document.getElementById('b-type');
    const customInput = document.getElementById('b-custom-type');
    
    typeSelect.innerHTML = '<option value="" disabled selected>Select Type</option>';
    customInput.style.display = 'none';
    customInput.required = false;

    if (category === 'Photography' || category === 'Videography') {
        const options = ['Wedding', 'Portrait', 'Event', 'Commercial', 'Music Video', 'Other (Custom)'];
        options.forEach(opt => {
            typeSelect.innerHTML += `<option value="${opt}">${opt}</option>`;
        });
    } else if (category === 'Editing') {
        const options = ['Video Editing', 'Photo Retouching/Editing', 'Other (Custom)'];
        options.forEach(opt => {
            typeSelect.innerHTML += `<option value="${opt}">${opt}</option>`;
        });
    }
}

window.checkCustomSubCategory = () => {
    const typeSelect = document.getElementById('b-type').value;
    const customInput = document.getElementById('b-custom-type');
    if (typeSelect === 'Other (Custom)') {
        customInput.style.display = 'block';
        customInput.required = true;
    } else {
        customInput.style.display = 'none';
        customInput.required = false;
        customInput.value = '';
    }
}

// --- Booking Form Submit ---
if(bookingForm) {
    bookingForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const user = firebase.auth().currentUser;
        if (!user) {
            alert("Please login first.");
            return;
        }

        const btn = document.getElementById('submit-booking');
        const name = document.getElementById('b-name').value;
        const phone = document.getElementById('b-phone').value;
        const category = document.getElementById('b-category').value;
        const subType = document.getElementById('b-type').value;
        const customType = document.getElementById('b-custom-type').value;
        
        let finalType = `${category} - ${subType}`;
        if (subType === 'Other (Custom)') {
            finalType = `${category} - ${customType}`;
        }
        
        btn.innerText = "Sending...";
        btn.disabled = true;

        try {
            await db.collection('bookings').add({
                userId: user.uid,
                email: user.email,
                name: name,
                phone: phone,
                type: finalType,
                status: 'New',
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            alert("Booking Request Sent! We will contact you soon.");
            bookingForm.reset();
            document.getElementById('b-type').innerHTML = '<option value="" disabled selected>Select Type</option>';
            document.getElementById('b-custom-type').style.display = 'none';
            btn.innerText = "Submit Request";
            btn.disabled = false;
        } catch (error) {
            console.error("Error writing booking:", error);
            if (error.code === 'permission-denied') {
                alert("Firebase Permission Error: Please publish Firestore Security Rules in Firebase Console, or book directly via WhatsApp!");
            } else {
                alert("Error sending request: " + error.message);
            }
            btn.innerText = "Submit Request";
            btn.disabled = false;
        }
    });
}

});

const clientLoadedPackages = {};
function loadPublicPackages() {
    const pkgContainer = document.getElementById('packages-container');
    
    if(!pkgContainer) return;

    db.collection('packages').orderBy('timestamp', 'asc').onSnapshot(snapshot => {
        let pkgHTML = '';

        snapshot.forEach(doc => {
            const data = doc.data();
            clientLoadedPackages[doc.id] = data;
            
            let sampleMedia = '';
            if (data.sampleUrl) {
                if (data.category === 'Photography') {
                    sampleMedia = `
                    <div class="pkg-media-box">
                        <img src="${data.sampleUrl}" alt="${data.title}" class="pkg-media-img" loading="lazy">
                        <div class="pkg-media-gradient"></div>
                    </div>`;
                } else {
                    const thumbUrl = getYouTubeThumbnail(data.sampleUrl) || '';
                    sampleMedia = `
                    <div class="pkg-media-box">
                        <img src="${thumbUrl}" alt="${data.title}" class="pkg-media-img" loading="lazy">
                        <div class="pkg-play-badge">▶</div>
                        <div class="pkg-media-gradient"></div>
                    </div>`;
                }
            } else {
                const icon = data.category === 'Videography' ? '🎬' : '📷';
                sampleMedia = `
                <div class="pkg-media-box pkg-media-placeholder">
                    <span style="font-size: 3rem; opacity: 0.5;">${icon}</span>
                    <div class="pkg-media-gradient"></div>
                </div>`;
            }

            let formattedPrice = 'Custom Price';
            if (data.price) {
                let pStr = String(data.price).trim();
                let cleanPrice = pStr.replace(/rs\.?/i, '').trim();
                formattedPrice = `<span>Rs.</span> ${cleanPrice}`;
            }

            pkgHTML += `
                <div class="package-card" onclick="openPkgModal('${doc.id}')">
                    <div class="pkg-card-top">
                        <span class="pkg-category-badge">${data.category}</span>
                        ${sampleMedia}
                    </div>
                    <div class="pkg-card-body">
                        <h3 class="pkg-title">${data.title}</h3>
                        ${data.description ? `<p class="pkg-desc">${data.description}</p>` : ''}
                        
                        <div class="pkg-card-footer">
                            <div class="pkg-price-group">
                                <span class="pkg-price-prefix">Price</span>
                                <div class="pkg-price">${formattedPrice}</div>
                            </div>
                            <button class="pkg-btn pkg-order-now-btn" type="button" aria-label="Order Now">
                                <span>Order Now</span>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                    <polyline points="9 18 15 12 9 6"></polyline>
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });

        pkgContainer.innerHTML = pkgHTML;
        setTimeout(() => { ScrollTrigger.refresh(); }, 500);
    }, error => {
        console.error("Error loading packages:", error);
        if (pkgContainer && !pkgContainer.innerHTML.trim()) {
            pkgContainer.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 40px 20px; background: rgba(255,255,255,0.02); border: 1px dashed #333; border-radius: 10px;">
                    <p style="color: #D4AF37; font-size: 1.1rem; margin-bottom: 8px;">⚠️ Packages Loading Pending</p>
                    <p style="color: #888; font-size: 0.85rem;">Firestore Security Rules permission required in Firebase Console.</p>
                </div>
            `;
        }
    });
}

function toggleGallery(id, btn) {
    const el = document.getElementById(id);
    if(el.style.display === 'none') {
        el.style.display = 'grid';
        btn.innerText = btn.innerText.replace('▼', '▲');
    } else {
        el.style.display = 'none';
        btn.innerText = btn.innerText.replace('▲', '▼');
    }
    setTimeout(() => { ScrollTrigger.refresh(); }, 500);
}

// Lightbox logic
window.openLightbox = (url, desc) => {
    document.getElementById('lightbox-video-container').style.display = 'none';
    document.getElementById('lightbox-video-container').innerHTML = '';
    
    document.getElementById('lightbox-img').src = url;
    document.getElementById('lightbox-img').style.display = 'block';
    
    document.getElementById('lightbox-caption').innerText = desc || '';
    document.getElementById('lightbox').style.display = 'flex';
}

window.openVideoLightbox = (url, desc) => {
    document.getElementById('lightbox-img').style.display = 'none';
    document.getElementById('lightbox-img').src = '';
    
    // Extract video ID safely
    let videoId = '';
    if (url.includes('youtu.be/')) {
        videoId = url.split('youtu.be/')[1].split('?')[0];
    } else if (url.includes('watch?v=')) {
        videoId = url.split('watch?v=')[1].split('&')[0];
    } else if (url.includes('embed/')) {
        videoId = url.split('embed/')[1].split('?')[0];
    }
    
    // Fallback if extraction fails
    const embedSrc = videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=0` : url;
    const watchUrl = videoId ? `https://www.youtube.com/watch?v=${videoId}` : url;
    
    const videoContainer = document.getElementById('lightbox-video-container');
    videoContainer.style.display = 'block';
    videoContainer.innerHTML = `
        <iframe width="100%" height="450" src="${embedSrc}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
        <div style="text-align: center; margin-top: 10px;">
            <a href="${watchUrl}" target="_blank" style="color: #D4AF37; text-decoration: underline; font-size: 0.9rem;">(Click here to watch on YouTube if it doesn't play)</a>
        </div>
    `;
    
    document.getElementById('lightbox-caption').innerText = desc || '';
    document.getElementById('lightbox').style.display = 'flex';
}

window.closeLightbox = () => {
    document.getElementById('lightbox').style.display = 'none';
    document.getElementById('lightbox-img').src = '';
    document.getElementById('lightbox-video-container').innerHTML = '';
    document.getElementById('lightbox-video-container').style.display = 'none';
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

function loadClientGalleries() {
    const photoGallery = document.getElementById('client-photo-gallery');
    const videoGallery = document.getElementById('client-video-gallery');

    if (photoGallery) {
        db.collection('gallery_photos').orderBy('timestamp', 'desc').onSnapshot(snapshot => {
            photoGallery.innerHTML = '';
            snapshot.forEach(doc => {
                const data = doc.data();
                photoGallery.innerHTML += `
                    <div class="client-gallery-item" onclick="openLightbox('${data.url}', '${data.description.replace(/'/g, "\\'")}')" style="cursor: pointer;">
                        <img src="${data.url}" alt="${data.description}">
                        <p>${data.description}</p>
                    </div>
                `;
            });
            setTimeout(() => { ScrollTrigger.refresh(); }, 500);
        }, err => {
            console.warn("Photos gallery notice:", err.message);
        });
    }

    if (videoGallery) {
        db.collection('gallery_videos').orderBy('timestamp', 'desc').onSnapshot(snapshot => {
            videoGallery.innerHTML = '';
            snapshot.forEach(doc => {
                const data = doc.data();
                const thumbUrl = getYouTubeThumbnail(data.url) || 'images/default-video.jpg';
                
                videoGallery.innerHTML += `
                    <div class="client-gallery-item" onclick="openVideoLightbox('${data.url}', '${data.description.replace(/'/g, "\\'")}')" style="cursor: pointer; position: relative;">
                        <img src="${thumbUrl}" alt="Video Thumbnail" style="width: 100%; border-radius: 5px;">
                        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(0,0,0,0.7); padding: 15px; border-radius: 50%; color: #D4AF37;">
                            ▶
                        </div>
                        <p>${data.description}</p>
                    </div>
                `;
            });
            setTimeout(() => { ScrollTrigger.refresh(); }, 500);
        }, err => {
            console.warn("Videos gallery notice:", err.message);
        });
    }
}

// Global Function for WhatsApp
function orderViaWhatsApp() {
    const currentUser = firebase.auth().currentUser;
    if (!currentUser) {
        alert("Please login or create an account first to place an order.");
        const authModal = document.getElementById('auth-modal');
        if (authModal) authModal.style.display = 'flex';
        return;
    }
    const phoneNumber = "94741976406"; 
    const message = encodeURIComponent("Hello Monster Club, I am interested in booking a session!");
    window.open(`https://wa.me/${phoneNumber}?text=${message}`, '_blank');
}

// My Orders Modal Logic
window.openMyOrdersModal = () => {
    document.getElementById('my-orders-modal').style.display = 'flex';
}
window.closeMyOrdersModal = (e) => {
    if(e) e.stopPropagation();
    document.getElementById('my-orders-modal').style.display = 'none';
}

// Package Modal Logic
window.openPkgModal = (id) => {
    const data = clientLoadedPackages[id];
    if(!data) return;

    let sampleMedia = '';
    if (data.sampleUrl) {
        if (data.category === 'Photography') {
            sampleMedia = `<img src="${data.sampleUrl}" style="width:100%; border-radius:5px; margin-bottom:15px; height: auto; object-fit: contain;">`;
        } else {
            const thumbUrl = getYouTubeThumbnail(data.sampleUrl) || '';
            sampleMedia = `
            <div style="position: relative; margin-bottom:15px; cursor: pointer;" onclick="openVideoLightbox('${data.sampleUrl}', '${data.title.replace(/'/g, "\\'")}')">
                <img src="${thumbUrl}" style="width:100%; border-radius:5px; height: 250px; object-fit: cover;">
                <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(0,0,0,0.7); padding: 15px; border-radius: 50%; color: #D4AF37; font-size: 2rem;">▶</div>
            </div>`;
        }
    }

    const html = `
        <span style="background: #D4AF37; color:#000; padding:2px 8px; border-radius:10px; font-size:0.8rem; font-weight:bold; margin-bottom:10px; display:inline-block;">${data.category}</span>
        ${sampleMedia}
        <h2>${data.title}</h2>
        <h3 style="color:#D4AF37; margin:10px 0;">${data.price || ''}</h3>
        <p style="margin-bottom:15px;">${data.description}</p>
        ${data.details ? `<div style="background:rgba(255,255,255,0.05); padding:15px; border-radius:5px; white-space:pre-wrap;">${data.details}</div>` : ''}
        
        <div style="margin-top: 20px; background: rgba(0,0,0,0.5); padding: 20px; border-radius: 8px; border: 1px solid #333;">
            <h3 style="margin-bottom: 15px; color: #D4AF37; font-size: 1.2rem;">Ready to Book?</h3>
            <input type="text" id="pkg-order-name" placeholder="Your Name" style="width:100%; padding: 12px; margin-bottom: 15px; border-radius: 5px; border: 1px solid #444; background: #222; color: #fff; font-family: inherit; font-size: 1rem;" required>
            <textarea id="pkg-order-msg" placeholder="Any special requests or details? (Optional)" style="width:100%; padding: 12px; margin-bottom: 15px; border-radius: 5px; border: 1px solid #444; background: #222; color: #fff; height: 80px; font-family: inherit; font-size: 1rem; resize: vertical;"></textarea>
            <button id="pkg-order-btn" style="width: 100%; font-size: 1.2rem; padding: 15px; font-weight: 800; background: #D4AF37; color: #000; border: none; border-radius: 5px; cursor: pointer; text-transform: uppercase; transition: background 0.3s, transform 0.2s; box-shadow: 0 4px 15px rgba(212, 175, 55, 0.4);">ORDER NOW</button>
        </div>
    `;
    
    document.getElementById('pkg-view-body').innerHTML = html;
    
    const orderBtn = document.getElementById('pkg-order-btn');
    orderBtn.onmouseover = () => orderBtn.style.transform = 'scale(1.02)';
    orderBtn.onmouseout = () => orderBtn.style.transform = 'scale(1)';

    orderBtn.onclick = () => {
        // Check login status
        const currentUser = firebase.auth().currentUser;
        if (!currentUser) {
            alert("Please login or create an account first to place an order.");
            closePkgModal();
            const authModal = document.getElementById('auth-modal');
            if (authModal) authModal.style.display = 'flex';
            return;
        }

        const userName = document.getElementById('pkg-order-name').value.trim();
        const userMsg = document.getElementById('pkg-order-msg').value.trim();

        if (!userName) {
            alert("Please enter your name.");
            return;
        }
        
        // Logged in, send to WhatsApp
        const phoneNumber = "94741976406"; 
        const messageText = `Hello Monster Club, I would like to book a package!

*Package:* ${data.title} (${data.category})
*Price:* ${data.price || 'N/A'}
*Description:* ${data.description || 'N/A'}

*My Name:* ${userName}
*Additional Message:* ${userMsg || 'None'}`;

        const encodedMsg = encodeURIComponent(messageText);
        window.open(`https://wa.me/${phoneNumber}?text=${encodedMsg}`, '_blank');
    };

    document.getElementById('pkg-view-modal').style.display = 'flex';
}

window.closePkgModal = (e) => {
    if(e) e.stopPropagation();
    document.getElementById('pkg-view-modal').style.display = 'none';
    document.getElementById('pkg-view-body').innerHTML = '';
}
