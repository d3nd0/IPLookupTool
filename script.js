document.addEventListener('DOMContentLoaded', () => {
    const loadingMsg = document.getElementById('loading-message');
    const resultsContainer = document.getElementById('results-container');
    const ipEl = document.getElementById('ip-address');
    const ispEl = document.getElementById('isp-info');
    const locEl = document.getElementById('location-info');
    const footerText = document.getElementById('footer-text');
    const geoRow = document.getElementById('geo-row');
    const coordsRow = document.getElementById('coords-row');
    const addressEl = document.getElementById('exact-address');
    const coordsEl = document.getElementById('coordinates');

    //Change to match your own branding
    const SITE_NAME = "YOURSITE.COM";
    //Change to match your own branding

    let map;
    let marker;
    let ipLat, ipLon;

    const date = new Date();
    const dateString = date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    footerText.innerHTML = `Brought to you by ${SITE_NAME} on ${dateString}. | <a href="credits.html" style="color: var(--accent-blue); text-decoration: none;">Credits</a>`;

    function initMap(lat, lon, zoom = 10) {
        if (!map) {
            map = L.map('map').setView([lat, lon], zoom);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                maxZoom: 19
            }).addTo(map);

            marker = L.marker([lat, lon]).addTo(map);
        } else {
            map.setView([lat, lon], zoom);
            marker.setLatLng([lat, lon]);
        }
    }

    function updateMarkerPopup(title, content) {
        if (marker) {
            marker.bindPopup(`<b>${title}</b><br>${content}`).openPopup();
        }
    }

    fetch('https://get.geojs.io/v1/ip/geo.json')
        .then(response => response.json())
        .then(data => {
            loadingMsg.classList.add('hide');
            resultsContainer.classList.remove('hide');

            ipEl.textContent = data.ip || 'Unknown';
            ispEl.textContent = `${data.organization_name || data.organization || 'Unknown'} (${data.timezone || ''})`;

            const locationParts = [data.city, data.region, data.country_code].filter(Boolean);
            locEl.textContent = locationParts.join(', ') || 'Unknown Location';

            ipLat = parseFloat(data.latitude);
            ipLon = parseFloat(data.longitude);

            if (!isNaN(ipLat) && !isNaN(ipLon)) {
                initMap(ipLat, ipLon, 10);
                updateMarkerPopup('Approximate Location (IP-based)', locationParts.join(', '));

                getPreciseLocation();
            }
        })
        .catch(err => {
            console.error(err);
            loadingMsg.classList.add('hide');
            resultsContainer.classList.remove('hide');

            ipEl.textContent = 'Error loading';
            ispEl.textContent = 'Error loading';
            locEl.textContent = 'Error loading';
            addressEl.textContent = 'Not available';
            coordsEl.textContent = 'Not available';
        });

    function getPreciseLocation() {
        if (!navigator.geolocation) {
            console.log('Geolocation is not supported by your browser.');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                coordsEl.textContent = `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
                if (map) {
                    map.setView([lat, lon], 15);
                    marker.setLatLng([lat, lon]);
                }
                
                fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`, {
                    headers: {
                        'User-Agent': 'IP-Grabber-Beta/1.0'
                    }
                })
                    .then(res => res.json())
                    .then(data => {
                        if (data && data.display_name) {
                            addressEl.textContent = data.display_name;
                            updateMarkerPopup('Precise Location (GPS)', data.display_name);
                        } else {
                            addressEl.textContent = "Unknown";
                            updateMarkerPopup('Precise Location (GPS)', `${lat.toFixed(6)}, ${lon.toFixed(6)}`);
                        }
                    })
                    .catch(err => {
                        console.error("Reverse geocoding error:", err);
                        addressEl.textContent = "Error loading";
                        updateMarkerPopup('Precise Location (GPS)', `${lat.toFixed(6)}, ${lon.toFixed(6)}`);
                    });
            },
            (error) => {
                console.log('Precise location not available:', error.message);
                coordsEl.textContent = 'Not available';
                addressEl.textContent = 'Not available';
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    }
});
