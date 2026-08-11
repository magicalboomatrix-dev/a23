document.addEventListener("DOMContentLoaded", () => {
    // Initial timer setup: 28 minutes and 12 seconds
    let timeRemaining = (28 * 60) + 12;

    const minElement = document.getElementById('minutes');
    const secElement = document.getElementById('seconds');

    const updateTimer = () => {
        const minutes = Math.floor(timeRemaining / 60);
        const seconds = timeRemaining % 60;

        // Update DOM
        minElement.textContent = minutes.toString().padStart(2, '0');
        secElement.textContent = seconds.toString().padStart(2, '0');

        if (timeRemaining > 0) {
            timeRemaining--;
        } else {
            // Restart the timer to keep the FOMO effect going
            timeRemaining = Math.floor(Math.random() * (30 - 10 + 1) + 10) * 60; 
        }
    };

    // Run every second
    setInterval(updateTimer, 1000);
    
    // Tracking click events (Good for Google/Meta pixel conversions)
    const downloadBtn = document.getElementById('downloadBtn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
            console.log('Download initiated. Forwarding to:', downloadBtn.href);
            // Replace with actual tracking code later if needed:
            // if (typeof gtag === 'function') gtag('event', 'download_apk');
            // if (typeof fbq === 'function') fbq('track', 'Download');
        });
    }
});
