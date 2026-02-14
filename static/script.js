/**
 * Work Report System - JavaScript
 * Handles client-side interactivity and UI enhancements
 */

// ========== Initialize on DOM Load ==========
document.addEventListener('DOMContentLoaded', function () {
    // Display current date
    displayCurrentDate();

    // Auto-hide flash messages after 5 seconds
    autoHideFlashMessages();

    // Handle file input display
    handleFileInputs();

    // Initialize modal close on background click
    initializeModals();
    // Initialize scroll reveal
    initializeScrollReveal();

    // Initialize button ripples
    initializeButtonRipples();
});

// ========== Date Display ==========
function displayCurrentDate() {
    const dateElement = document.getElementById('current-date');
    if (dateElement) {
        const options = {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        };
        const today = new Date();
        dateElement.textContent = today.toLocaleDateString('en-US', options);
    }
}

// ========== Flash Messages ==========
function autoHideFlashMessages() {
    const flashMessages = document.querySelectorAll('.flash-message');
    flashMessages.forEach(message => {
        setTimeout(() => {
            message.style.animation = 'fadeOutUp 0.4s ease-in forwards';
            setTimeout(() => {
                message.remove();
            }, 400);
        }, 5000);
    });
}

// Add CSS animation for slide out
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeOutUp {
        from {
            transform: translateY(0) scale(1);
            opacity: 1;
        }
        to {
            transform: translateY(-20px) scale(0.95);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// ========== File Input Handling ==========
function handleFileInputs() {
    const fileInputs = document.querySelectorAll('.file-input');
    fileInputs.forEach(input => {
        input.addEventListener('change', function (e) {
            const label = this.nextElementSibling;
            const fileText = label.querySelector('.file-text');

            if (this.files && this.files.length > 0) {
                const fileName = this.files[0].name;
                const fileSize = formatFileSize(this.files[0].size);
                fileText.textContent = `${fileName} (${fileSize})`;
                label.style.borderColor = 'var(--primary-500)';
                label.style.background = 'var(--primary-50)';
            } else {
                fileText.textContent = 'Choose file';
                label.style.borderColor = '';
                label.style.background = '';
            }
        });
    });
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// ========== Tab Switching ==========
function switchTab(tabName) {
    // Hide all tab contents
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(content => {
        content.classList.remove('active');
    });

    // Remove active class from all tab buttons
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(button => {
        button.classList.remove('active');
    });

    // Show selected tab content
    const selectedTab = document.getElementById(`${tabName}-tab`);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }

    // Add active class to clicked button
    event.currentTarget.classList.add('active');
}

// ========== Modal Functions ==========
function initializeModals() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.addEventListener('click', function (e) {
            if (e.target === this) {
                closeModal(this.id);
            }
        });
    });

    // Close modal on Escape key
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            const activeModal = document.querySelector('.modal.active');
            if (activeModal) {
                closeModal(activeModal.id);
            }
        }
    });
}

function showAddEmployeeModal() {
    const modal = document.getElementById('addEmployeeModal');
    if (modal) {
        modal.classList.add('active');
        // Focus on first input
        const firstInput = modal.querySelector('input[type="text"]');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100);
        }
    }
}

function showEditEmployeeModal(id, name, email, employmentType) {
    const modal = document.getElementById('editEmployeeModal');
    const form = document.getElementById('editEmployeeForm');

    if (modal && form) {
        // Set form action
        form.action = `/admin/employee/edit/${id}`;

        // Populate form fields
        document.getElementById('edit_name').value = name;
        document.getElementById('edit_email').value = email;
        document.getElementById('edit_password').value = '';

        // Set employment type
        const typeSelect = document.getElementById('edit_employment_type');
        if (typeSelect) {
            typeSelect.value = employmentType || 'inhouse';
        }

        // Show modal
        modal.classList.add('active');

        // Focus on first input
        setTimeout(() => document.getElementById('edit_name').focus(), 100);
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.opacity = '0';
        const content = modal.querySelector('.modal-content');
        if (content) {
            content.style.transform = 'scale(0.9) translateY(20px)';
            content.style.opacity = '0';
        }

        setTimeout(() => {
            modal.classList.remove('active');
            modal.style.opacity = '';
            if (content) {
                content.style.transform = '';
                content.style.opacity = '';
            }

            // Reset form if exists
            const form = modal.querySelector('form');
            if (form) {
                form.reset();
            }
        }, 300);
    }
}

// ========== Form Validation ==========
// Add real-time validation feedback
document.addEventListener('DOMContentLoaded', function () {
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        const inputs = form.querySelectorAll('input[required], textarea[required]');
        inputs.forEach(input => {
            input.addEventListener('blur', function () {
                validateInput(this);
            });

            input.addEventListener('input', function () {
                if (this.classList.contains('invalid')) {
                    validateInput(this);
                }
            });
        });
    });
});

function validateInput(input) {
    if (!input.value.trim()) {
        input.classList.add('invalid');
        input.style.borderColor = 'var(--error)';
    } else {
        input.classList.remove('invalid');
        input.style.borderColor = '';
    }
}

// ========== Scroll Reveal Logic ==========
function initializeScrollReveal() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    document.querySelectorAll('.card, .stats-grid, .status-card, .data-table').forEach(el => {
        el.classList.add('reveal-on-scroll');
        observer.observe(el);
    });
}

function initializeButtonRipples() {
    document.querySelectorAll('.btn').forEach(button => {
        button.addEventListener('click', function (e) {
            const x = e.clientX - e.target.offsetLeft;
            const y = e.clientY - e.target.offsetTop;

            const ripple = document.createElement('span');
            ripple.className = 'btn-ripple';
            ripple.style.left = `${x}px`;
            ripple.style.top = `${y}px`;

            this.appendChild(ripple);

            setTimeout(() => {
                ripple.remove();
            }, 600);
        });
    });
}

// ========== Table Row Animations ==========
document.addEventListener('DOMContentLoaded', function () {
    const tableRows = document.querySelectorAll('.data-table tbody tr');
    tableRows.forEach((row, index) => {
        row.style.animation = `fadeIn 0.3s ease-in ${index * 0.03}s backwards`;
    });
});

// ========== Loading State for Forms ==========
document.querySelectorAll('form').forEach(form => {
    form.addEventListener('submit', function (e) {
        const submitButton = this.querySelector('button[type="submit"]');
        if (submitButton && !submitButton.disabled) {
            submitButton.disabled = true;
            const originalText = submitButton.innerHTML;
            submitButton.innerHTML = `
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite;">
                    <circle cx="12" cy="12" r="10"/>
                </svg>
                Processing...
            `;

            // Re-enable after 3 seconds as fallback
            setTimeout(() => {
                submitButton.disabled = false;
                submitButton.innerHTML = originalText;
            }, 3000);
        }
    });
});

// Add spin animation
const spinStyle = document.createElement('style');
spinStyle.textContent = `
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
`;
document.head.appendChild(spinStyle);

// ========== Confirmation Dialogs ==========
function confirmDelete(employeeName) {
    return confirm(`Are you sure you want to delete ${employeeName}? This will also delete all their submissions.`);
}

// ========== Utility Functions ==========
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ========== Analytics & Tracking (Optional) ==========
// Track user interactions for better UX insights
function trackEvent(category, action, label) {
    console.log(`Event: ${category} - ${action} - ${label}`);
    // Add your analytics code here (e.g., Google Analytics, Mixpanel)
}

// Example usage:
document.querySelectorAll('button').forEach(button => {
    button.addEventListener('click', function () {
        trackEvent('Button', 'Click', this.textContent.trim());
    });
});

// ========== Accessibility Enhancements ==========
// Add keyboard navigation for modals
document.addEventListener('keydown', function (e) {
    const activeModal = document.querySelector('.modal.active');
    if (activeModal && e.key === 'Tab') {
        const focusableElements = activeModal.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey && document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
        }
    }
});

// ========== Console Welcome Message ==========
console.log('%c IRA MEDIA CONCEPTS ', 'background: linear-gradient(135deg, #00b2b2, #008080); color: white; padding: 10px 20px; font-size: 16px; font-weight: bold; border-radius: 5px;');
console.log('%c Performance Optimized | High Transparency ', 'color: #00b2b2; font-size: 12px;');
console.log('%c Version 2.0.0 ', 'color: #adb5bd; font-size: 10px;');
