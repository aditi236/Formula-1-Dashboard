/**
 * Main application script for F1 Data Visualization
 * Initializes the visualizations and handles user interactions.
 * Uses lazy loading (IntersectionObserver) to initialize each section when in view.
 */

document.addEventListener('DOMContentLoaded', () => {
    // Create the main app instance
    const app = new F1Visualization();
});

class F1Visualization {
    constructor() {
        // Keep track of which sections are loaded
        this.loadedSections = {};
        // By default, track-map is the first section
        this.activeSection = 'constructors';
        this._initApp();
    }

    /**
     * Initializes the application by loading the active section, setting up lazy loading, and initializing navigation.
     * Also shows/hides a loading overlay and error messages as needed.
     * @private
     */
    async _initApp() {
        try {
            this._showLoading(true);
            // Immediately load the active section (track-map by default)
            await this._loadSection(this.activeSection);

            // Initialize lazy loading for the other sections
            this._initLazyLoad();

            // Initialize navigation
            this._initNavigation();

            // Hide loading overlay
            this._showLoading(false);
        } catch (error) {
            console.error('Error initializing application:', error);
            this._showError('Failed to initialize the application. Please try again.');
        }
    }

    /**
     * Sets up lazy loading for each .visualization-section using IntersectionObserver.
     * When a section scrolls into view (50% visible), we load it if not already loaded.
     * @private
     */
    _initLazyLoad() {
        const sections = document.querySelectorAll('.visualization-section');
        const observerOptions = {
            root: null,
            rootMargin: '0px',
            threshold: 0.50
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const sectionId = entry.target.getAttribute('id');
                    if (!this.loadedSections[sectionId]) {
                        this._loadSection(sectionId);
                    }
                }
            });
        }, observerOptions);

        sections.forEach(section => observer.observe(section));
    }

    /**
     * Loads a specific section's visualization if it hasn't been loaded yet.
     * @private
     * @param {string} sectionId - The ID of the section (e.g. 'track-map', 'drivers', etc.)
     */
    async _loadSection(sectionId) {
        // If it's already loaded, skip
        if (this.loadedSections[sectionId]) return;

        try {
            switch (sectionId) {
                case 'track-map':
                    await this._initTrackMapVisualization();
                    break;
                case 'drivers':
 
                    break;
                case 'constructors':
                    await this._initConstructorsVisualization();
                    break;
                case 'tyres':
                    await this._initTyresVisualization(); 
                    break;
                case 'engines':                    
                    break;
                default:
                    console.warn(`Unknown section: ${sectionId}`);
            }
            // Mark this section as loaded
            this.loadedSections[sectionId] = true;
        } catch (error) {
            console.error(`Error loading ${sectionId}:`, error);
            this._showError(`Failed to load ${sectionId} visualization.`);
        }
    }

    /**
     * Initializes the Track Map visualization (calls initTrackMapVisualization from track-map.js).
     * @private
     */
    async _initTrackMapVisualization() {
        if (typeof initTrackMapVisualization === 'function') {
            initTrackMapVisualization('#track-map-visualization');
        } else {
            console.warn('initTrackMapVisualization is not defined');
        }
    }

    /**
     * Example placeholders for other sections.
     * Uncomment once done whoever is doing this part
     *
     * @private
     */
    // async _initDriversVisualization() {
    //   if (typeof initDriversVisualization === 'function') {
    //     initDriversVisualization('#drivers-visualization');
    //   }
    // }

    async _initConstructorsVisualization() {
        if (typeof initConstructorsVisualization === 'function') {
            initConstructorsVisualization('#constructors-visualization');
        }
    }


    async _initTyresVisualization() {
        if (typeof initTyresVisualization === 'function') {
            initTyresVisualization('#tyres-visualization');
        }
    }

    // async _initEnginesVisualization() {
    //   if (typeof initEnginesVisualization === 'function') {
    //     initEnginesVisualization('#engines-visualization');
    //   }
    // }

    /**
     * Sets up navigation event listeners for sidebar links.
     * Updates active link based on scroll and link clicks.
     * @private
     */
    _initNavigation() {
        const navLinks = document.querySelectorAll('.nav-link');

        // Update active link initially
        this._updateActiveNavLink();

        // On link click, scroll to section & load it
        navLinks.forEach(link => {
            link.addEventListener('click', (event) => {
                event.preventDefault();
                const sectionId = link.getAttribute('href').substring(1);
                document.getElementById(sectionId).scrollIntoView({ behavior: 'smooth' });
                this.activeSection = sectionId;
                this._loadSection(sectionId);
                this._updateActiveNavLink();
            });
        });

        // On scroll, update active link
        window.addEventListener('scroll', this._debounce(() => {
            const sections = document.querySelectorAll('.visualization-section');
            let currentSection = '';

            sections.forEach(section => {
                const rect = section.getBoundingClientRect();
                const top = rect.top + window.scrollY;
                const height = rect.height;

                // If the user is within 700px from the top or bottom, consider that section active
                if (window.scrollY >= top - 700 && window.scrollY < top + height - 700) {
                    currentSection = section.getAttribute('id');
                }
            });

            if (currentSection && currentSection !== this.activeSection) {
                this.activeSection = currentSection;
                this._updateActiveNavLink();
            }
        }, 100));
    }

    /**
     * Highlights the active nav link based on the current activeSection.
     * @private
     */
    _updateActiveNavLink() {
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            const sectionId = link.getAttribute('href').substring(1);
            link.classList.toggle('active', sectionId === this.activeSection);
        });
    }

    /**
     * Debounce utility to limit function calls while scrolling.
     * @private
     * @param {Function} func - The function to debounce.
     * @param {number} wait - The wait time in ms.
     * @returns {Function}
     */
    _debounce(func, wait) {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func(...args), wait);
        };
    }

    /**
     * Shows or hides a loading overlay.
     * @private
     * @param {boolean} isLoading - Whether to show or hide the overlay.
     */
    _showLoading(isLoading) {
        let loadingOverlay = document.getElementById('loading-overlay');
        if (!loadingOverlay && isLoading) {
            loadingOverlay = document.createElement('div');
            loadingOverlay.id = 'loading-overlay';
            loadingOverlay.innerHTML = `
          <div class="loading-spinner"></div>
          <div>Loading F1 data...</div>
        `;
            document.body.appendChild(loadingOverlay);
        }
        if (loadingOverlay) {
            loadingOverlay.style.display = isLoading ? 'flex' : 'none';
        }
    }

    /**
     * Shows an error message overlay with a close button.
     * @private
     * @param {string} message - The error message to display.
     */
    _showError(message) {
        let errorContainer = document.getElementById('error-container');
        if (!errorContainer) {
            errorContainer = document.createElement('div');
            errorContainer.id = 'error-container';
            document.body.appendChild(errorContainer);
        }
        errorContainer.innerHTML = `
        <div class="error-message">
          <h3>Error</h3>
          <p>${message}</p>
          <button id="error-close">Close</button>
        </div>
      `;
        errorContainer.style.display = 'flex';
        document.getElementById('error-close').addEventListener('click', () => {
            errorContainer.style.display = 'none';
        });
    }
}
