// Global variables
let map;
let markers = [];
let issueMarkers = {};
let issues = [];
let currentLatLng;
let points = 0;
let issuesToday = 0;
let totalIssues = 0;
let selectedMarker = null;
let userLocation = null;
let searchBox, autocompleteService, placesService;

// DOM elements
const formContainer = document.getElementById('form-container');
const profilePanel = document.getElementById('profile');
const toggleProfileButton = document.getElementById('toggle-profile');
const closeProfileButton = document.getElementById('close-profile');
const resetDailyButton = document.getElementById('reset-daily');
const submitIssueButton = document.getElementById('submit-issue');
const cancelIssueButton = document.getElementById('cancel-issue');
const closeFormButton = document.getElementById('close-form');
const issueImageInput = document.getElementById('issue-image');
const imagePreview = document.getElementById('image-preview');

// Initialize the map and search functionality
function initMap() {
    const defaultLocation = { lat: 28.9700, lng: 77.7100 };
    
    map = new google.maps.Map(document.getElementById("map"), {
        center: defaultLocation,
        zoom: 16,
        mapTypeControl: true,
        streetViewControl: false,
        fullscreenControl: true,
        zoomControl: true,
        mapTypeId: 'hybrid',
        styles: [
            {
                featureType: 'poi.school',
                elementType: 'geometry',
                stylers: [{ color: '#c5e8ff' }]
            },
            {
                featureType: 'poi.school',
                elementType: 'labels',
                stylers: [{ visibility: 'on' }]
            }
        ]
    });

    // Add custom controls to the map
    const centerControlDiv = document.createElement("div");
    createCenterControl(centerControlDiv);
    map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(centerControlDiv);

    // Add map click listener
    map.addListener("click", (event) => {
        currentLatLng = event.latLng;
        
        // Clear previous temp marker
        clearTempMarkers();
        
        // Add a new temporary marker
        const marker = new google.maps.Marker({
            position: currentLatLng,
            map: map,
            icon: {
                url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(
                    '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#4285f4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>'
                ),
                scaledSize: new google.maps.Size(40, 40)
            },
            animation: google.maps.Animation.DROP
        });
        
        markers.push(marker);
        selectedMarker = marker;
        
        // Show form
        openFormModal();
    });

    // Try to get user location
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                userLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                
                // Create a marker for user location
                const userMarker = new google.maps.Marker({
                    position: userLocation,
                    map: map,
                    icon: {
                        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(
                            '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#4285f4" stroke="#ffffff" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3" fill="white"/></svg>'
                        ),
                        scaledSize: new google.maps.Size(24, 24)
                    },
                    title: 'Your Location'
                });
                
                // Center map on user location if within 10km of default location
                const distance = getDistance(userLocation, defaultLocation);
                if (distance < 10) {
                    map.setCenter(userLocation);
                }
            },
            () => {
                // Handle location error
                showToast('Could not get your location', 'error');
            }
        );
    }

    // Load issues from local storage
    loadIssues();

    // Initialize search box and services
    const searchInput = document.getElementById('search-box');
    const searchButton = document.getElementById('search-button');
    autocompleteService = new google.maps.places.AutocompleteService();
    placesService = new google.maps.places.PlacesService(map);

    // Add event listener for search button
    searchButton.addEventListener('click', () => {
        const query = searchInput.value.trim();
        if (query) {
            searchLocation(query);
        }
    });

    // Add "Enter" key listener for search input
    searchInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            const query = searchInput.value.trim();
            if (query) {
                searchLocation(query);
            }
        }
    });
}
document.addEventListener('DOMContentLoaded', loadIssues);
// Create a custom control for the map
function createCenterControl(controlDiv) {
    // CSS for the control
    const controlUI = document.createElement("div");
    controlUI.style.backgroundColor = "#fff";
    controlUI.style.border = "2px solid #fff";
    controlUI.style.borderRadius = "3px";
    controlUI.style.boxShadow = "0 2px 6px rgba(0,0,0,.3)";
    controlUI.style.cursor = "pointer";
    controlUI.style.marginRight = "10px";
    controlUI.style.marginBottom = "10px";
    controlUI.style.textAlign = "center";
    controlUI.title = "Click to center the map";
    controlDiv.appendChild(controlUI);

    // Text for the control
    const controlText = document.createElement("div");
    controlText.style.color = "rgb(25,25,25)";
    controlText.style.fontFamily = "Roboto,Arial,sans-serif";
    controlText.style.fontSize = "16px";
    controlText.style.lineHeight = "38px";
    controlText.style.paddingLeft = "5px";
    controlText.style.paddingRight = "5px";
    controlText.innerHTML = '<i class="fas fa-location-arrow"></i>';
    controlUI.appendChild(controlText);

    // Setup click event on the control
    controlUI.addEventListener("click", () => {
        if (userLocation) {
            map.setCenter(userLocation);
            map.setZoom(16);
            showToast('Map centered on your location', 'success');
        } else {
            map.setCenter({ lat: 28.9700, lng: 77.7100 });
            map.setZoom(16);
            showToast('Map centered on default location', 'success');
        }
    });
}

// Get distance between two points in km
function getDistance(p1, p2) {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(p2.lat - p1.lat);
    const dLon = deg2rad(p2.lng - p1.lng);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(p1.lat)) * Math.cos(deg2rad(p2.lat)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d;
}

function deg2rad(deg) {
    return deg * (Math.PI / 180);
}

// Clear temporary markers (used when selecting a location)
function clearTempMarkers() {
    for (let i = 0; i < markers.length; i++) {
        markers[i].setMap(null);
    }
    markers = [];
    selectedMarker = null;
}

// Load issues from local storage
function loadIssues() {
    const storedIssues = localStorage.getItem("issues");
    if (storedIssues) {
        issues = JSON.parse(storedIssues);
        totalIssues = issues.length;
        
        // Add markers for each issue
        issues.forEach(issue => {
            addIssueMarker(issue);
        });
        
        // Update issue list
        updateIssueList();
    }

    // Load user stats
    points = parseInt(localStorage.getItem("points")) || 0;
    issuesToday = parseInt(localStorage.getItem("issuesToday")) || 0;
    updateStats();
}

// Add a marker for an issue
function addIssueMarker(issue) {
    const position = { lat: issue.lat, lng: issue.lng };
    
    // Determine icon based on severity
    let iconColor;
    switch (issue.severity) {
        case 'high':
            iconColor = '#f44336'; // Red
            break;
        case 'medium':
            iconColor = '#ff9800'; // Orange
            break;
        default:
            iconColor = '#4caf50'; // Green
    }
    
    const marker = new google.maps.Marker({
        position: position,
        map: map,
        icon: {
            path: google.maps.SymbolPath.CIRCLE,
            fillColor: iconColor,
            fillOpacity: 0.6,
            strokeWeight: 2,
            strokeColor: '#ffffff',
            scale: 10
        },
        title: issue.description
    });
    
    // Add info window
    const infoWindow = new google.maps.InfoWindow({
        content: `
            <div style="max-width: 200px;">
                <h3 style="margin: 0 0 5px; font-size: 16px;">${issue.description}</h3>
                <p style="margin: 0 0 5px; font-size: 14px;">Category: ${issue.category}</p>
                <p style="margin: 0; font-size: 12px;">Reported on: ${issue.date}</p>
            </div>
        `
    });
    
    marker.addListener('click', () => {
        infoWindow.open(map, marker);
    });
    
    // Store reference to marker with issue ID
    issueMarkers[issue.id] = marker;
}

// Update issue list in UI
function updateIssueList() {
    const issueCardsContainer = document.getElementById('issue-cards-container');
    const noIssuesElement = document.getElementById('no-issues');
    
    // Clear current list
    while (issueCardsContainer.firstChild) {
        issueCardsContainer.removeChild(issueCardsContainer.firstChild);
    }
    
    if (issues.length === 0) {
        // Show "no issues" message
        if (!noIssuesElement) {
            const noIssues = document.createElement('p');
            noIssues.id = 'no-issues';
            noIssues.className = 'no-issues';
            noIssues.textContent = 'No issues reported yet. Be the first!';
            issueCardsContainer.appendChild(noIssues);
        }
        return;
    }
    
    // Remove "no issues" message if it exists
    if (noIssuesElement) {
        issueCardsContainer.removeChild(noIssuesElement);
    }
    
    // Sort issues by date, newest first
    const sortedIssues = [...issues].sort((a, b) => {
        return new Date(b.timestamp) - new Date(a.timestamp);
    });
    
    // Add issue cards
    sortedIssues.slice(0, 6).forEach(issue => {
        const issueCard = document.createElement('div');
        issueCard.className = 'issue-card';
        issueCard.dataset.id = issue.id;
        
        const cardHeader = document.createElement('div');
        cardHeader.className = 'issue-card-header';
        
        const cardTitle = document.createElement('div');
        cardTitle.className = 'issue-card-title';
        cardTitle.textContent = issue.description.length > 30 
            ? issue.description.substring(0, 30) + '...' 
            : issue.description;
        
        const cardCategory = document.createElement('div');
        cardCategory.className = `issue-card-category ${issue.category.toLowerCase()}`;
        cardCategory.textContent = issue.category;
        
        cardHeader.appendChild(cardTitle);
        cardHeader.appendChild(cardCategory);
        
        const cardBody = document.createElement('div');
        cardBody.className = 'issue-card-body';
        
        const cardLocation = document.createElement('div');
        cardLocation.className = 'issue-card-location';
        
        // Get location name from reverse geocoding if available, otherwise show coordinates
        if (issue.locationName) {
            cardLocation.textContent = `Location: ${issue.locationName}`;
        } else {
            cardLocation.textContent = `Location: ${issue.lat.toFixed(4)}, ${issue.lng.toFixed(4)}`;
        }
        
        const severityEl = document.createElement('div');
        severityEl.className = 'issue-severity';
        
        const severityIndicator = document.createElement('span');
        severityIndicator.className = `severity-indicator severity-${issue.severity}`;
        
        const severityText = document.createElement('span');
        severityText.textContent = `${issue.severity.charAt(0).toUpperCase() + issue.severity.slice(1)} Severity`;
        
        severityEl.appendChild(severityIndicator);
        severityEl.appendChild(severityText);
        
        cardBody.appendChild(cardLocation);
        cardBody.appendChild(severityEl);
        
        const cardFooter = document.createElement('div');
        cardFooter.className = 'issue-card-footer';
        
        const cardDate = document.createElement('span');
        cardDate.textContent = new Date(issue.timestamp).toLocaleDateString();
        
        const viewButton = document.createElement('span');
        viewButton.textContent = 'View on Map';
        viewButton.style.cursor = 'pointer';
        viewButton.style.color = '#4285f4';
        viewButton.addEventListener('click', () => {
            // Center map on this issue
            map.setCenter({ lat: issue.lat, lng: issue.lng });
            map.setZoom(18);
            
            // Open the info window for this issue
            if (issueMarkers[issue.id]) {
                google.maps.event.trigger(issueMarkers[issue.id], 'click');
            }
        });
        
        cardFooter.appendChild(cardDate);
        cardFooter.appendChild(viewButton);
        
        issueCard.appendChild(cardHeader);
        issueCard.appendChild(cardBody);
        issueCard.appendChild(cardFooter);
        
        issueCardsContainer.appendChild(issueCard);
    });
}

// Open the form modal
function openFormModal() {
    formContainer.classList.add('active');
    document.getElementById('issue-description').focus();
}

// Close the form modal
function closeFormModal() {
    formContainer.classList.remove('active');
    document.getElementById('issue-description').value = '';
    document.getElementById('issue-category').selectedIndex = 0;
    document.getElementById('low').checked = true;
    imagePreview.innerHTML = '';
    clearTempMarkers();
}

// Toggle the profile panel
function toggleProfile() {
    profilePanel.classList.toggle('active');
}

// Update the profile stats
function updateStats() {
    document.getElementById('points').textContent = points;
    document.getElementById('issues-today').textContent = issuesToday;
    document.getElementById('total-issues').textContent = totalIssues;
    
    // Update progress bar
    const progressBar = document.getElementById('challenge-progress');
    const progressPercentage = Math.min(issuesToday / 2 * 100, 100);
    progressBar.style.width = progressPercentage + '%';
}

// Reset daily challenge
function resetDaily() {
    issuesToday = 0;
    localStorage.setItem("issuesToday", issuesToday);
    updateStats();
    showToast('Daily challenge reset', 'success');
}

// Submit an issue
function submitIssue() {
    const description = document.getElementById('issue-description').value.trim();
    const category = document.getElementById('issue-category').value;
    const severity = document.querySelector('input[name="severity"]:checked').value;
    
    if (!description) {
        showToast('Please enter a description', 'error');
        return;
    }
    
    if (!currentLatLng) {
        showToast('Please select a location on the map', 'error');
        return;
    }
    
    // Read image file if exists
    let imageData = null;
    if (issueImageInput.files && issueImageInput.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            imageData = e.target.result;
            finishSubmitIssue(description, category, severity, imageData);
        };
        reader.readAsDataURL(issueImageInput.files[0]);
    } else {
        finishSubmitIssue(description, category, severity, imageData);
    }
}

// Complete the issue submission process
function finishSubmitIssue(description, category, severity, imageData) {
    // Create unique ID for the issue
    const issueId = 'issue_' + Date.now();
    
    // Get current date
    const now = new Date();
    const timestamp = now.getTime();
    const date = now.toLocaleDateString();
    
    // Create issue object
    const issue = {
        id: issueId,
        lat: currentLatLng.lat(),
        lng: currentLatLng.lng(),
        description: description,
        category: category,
        severity: severity,
        image: imageData,
        timestamp: timestamp,
        date: date,
        upvotes: 0,
        status: 'pending'
    };
    
    // Try to get location name from reverse geocoding
    if (navigator.onLine) {
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ location: currentLatLng }, (results, status) => {
            if (status === 'OK' && results[0]) {
                issue.locationName = results[0].formatted_address;
            }
            saveIssue(issue);
        });
    } else {
        saveIssue(issue);
    }
}

// Save the issue
function saveIssue(issue) {
    // Add to issues array
    issues.push(issue);
    totalIssues++;
    
    // Save to local storage
    localStorage.setItem("issues", JSON.stringify(issues));
    
    // Add marker for the new issue
    addIssueMarker(issue);
    
    // Update issue list
    updateIssueList();
    
    // Clear temporary marker
    clearTempMarkers();
    
    // Award points
    points += 10;
    issuesToday += 1;
    
    // Check if daily challenge completed
    if (issuesToday === 2) {
        points += 15;
        showToast('Daily challenge completed! +15 bonus points!', 'success');
    }
    
    // Save user stats
    localStorage.setItem("points", points);
    localStorage.setItem("issuesToday", issuesToday);
    
    // Update display
    updateStats();
    
    // Close form
    closeFormModal();
    
    // Show success message
    showToast('Issue reported successfully! +10 points', 'success');
}

// Show a toast message
function showToast(message, type = 'success') {
    const toastContainer = document.getElementById('toast-container');
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = document.createElement('i');
    if (type === 'success') {
        icon.className = 'fas fa-check-circle';
    } else {
        icon.className = 'fas fa-exclamation-circle';
    }
    
    const text = document.createElement('div');
    text.textContent = message;
    
    toast.appendChild(icon);
    toast.appendChild(text);
    toastContainer.appendChild(toast);
    
    // Make the toast visible
    setTimeout(() => {
        toast.style.opacity = '1';
    }, 10);
    
    // Auto remove the toast after 3 seconds
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => {
            toastContainer.removeChild(toast);
        }, 300);
    }, 3000);
}

// Handle image preview
issueImageInput.addEventListener('change', function() {
    if (this.files && this.files[0]) {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            imagePreview.innerHTML = '';
            const img = document.createElement('img');
            img.src = e.target.result;
            imagePreview.appendChild(img);
        };
        
        reader.readAsDataURL(this.files[0]);
    }
});

// Search for a location and center the map
function searchLocation(query) {
    const request = {
        query: query,
        fields: ['name', 'geometry'],
    };

    placesService.findPlaceFromQuery(request, (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results.length > 0) {
            const place = results[0];
            const location = place.geometry.location;

            map.setCenter(location);
            map.setZoom(16);

            // Clear previous search markers
            clearTempMarkers();

            // Add a marker for the searched location
            const marker = new google.maps.Marker({
                position: location,
                map: map,
                title: place.name,
                animation: google.maps.Animation.DROP,
            });

            markers.push(marker);

            // Show toast for successful search
            showToast(`Centered map on: ${place.name}`, 'success');
        } else {
            showToast('No results found for your search', 'error');
        }
    });
}

// Clear temporary markers (used for search results)
function clearTempMarkers() {
    markers.forEach(marker => marker.setMap(null));
    markers = [];
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Profile toggle
    toggleProfileButton.addEventListener('click', toggleProfile);
    closeProfileButton.addEventListener('click', toggleProfile);
    
    // Form submission
    submitIssueButton.addEventListener('click', submitIssue);
    cancelIssueButton.addEventListener('click', closeFormModal);
    closeFormButton.addEventListener('click', closeFormModal);
    
    // Reset daily challenge
    resetDailyButton.addEventListener('click', resetDaily);
    
    // Handle escape key to close modals
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            if (formContainer.classList.contains('active')) {
                closeFormModal();
            }
            if (profilePanel.classList.contains('active')) {
                toggleProfile();
            }
        }
    });
    
    // Service worker registration for PWA
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/service-worker.js')
            .then(reg => console.log('Service Worker registered', reg))
            .catch(err => console.log('Service Worker registration failed', err));
    }
});

// Load localStorage data
if (localStorage.getItem("firstVisit") === null) {
    // First time visitor
    localStorage.setItem("firstVisit", "false");
    localStorage.setItem("points", "0");
    localStorage.setItem("issuesToday", "0");
    localStorage.setItem("issues", "[]");
    
    // Show welcome message on first visit
    setTimeout(() => {
        showToast('Welcome to SpotFix! Click on the map to report issues.', 'success');
    }, 1000);
}