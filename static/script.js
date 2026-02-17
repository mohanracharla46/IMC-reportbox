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

    // Initialize client selection logic
    initializeClientSelection();
});

// ========== Client Selection Logic ==========
function initializeClientSelection() {
    const categorySelect = document.getElementById('client_category');
    const nameSelect = document.getElementById('client_name');
    const otherGroup = document.getElementById('other_client_group');
    const otherInput = document.getElementById('other_client_name');
    const workTypeSelect = document.getElementById('work_type');
    const otherWorkGroup = document.getElementById('other_work_type_group');
    const otherWorkInput = document.getElementById('other_work_type_name');

    if (!categorySelect || !nameSelect || !workTypeSelect) return;

    const clientOptions = {
        'Political': ['RMR', 'RSR', 'SG', 'JKR', 'Degala', 'Others'],
        'Corporate': ['IMC', 'Cornext', 'AIC', 'Yuvatha', 'Raksha', 'Other']
    };

    const workTypeOptions = {
        'Political': [
            'Shoot with Camera', 'Calendar Poster', 'Informative Poster', 'Elevation Poster',
            'Reel', 'Press Conference Shoot', 'Regular Video', 'Cinematic Videos',
            'Brochures', 'Printing Material', 'Shoot on Mobile', 'Other'
        ],
        'Corporate': [
            'Shoot with Camera', 'Video', 'Reel', 'Poster', 'Web Development',
            'Brochure', 'Shoot on Mobile', 'Print Material', 'Other'
        ]
    };

    function updateClientNames() {
        const category = categorySelect.value;
        const previousValue = nameSelect.getAttribute('data-initial-value') || nameSelect.value;

        // Clear existing options except the first one
        nameSelect.innerHTML = '<option value="" disabled selected>Select client name</option>';

        if (category && clientOptions[category]) {
            clientOptions[category].forEach(client => {
                const option = document.createElement('option');
                option.value = client;
                option.textContent = client;
                nameSelect.appendChild(option);
            });

            // If we have an initial value (for edit mode), try to select it
            if (previousValue) {
                const exists = Array.from(nameSelect.options).some(opt => opt.value === previousValue);
                if (exists) {
                    nameSelect.value = previousValue;
                } else if (previousValue !== "") {
                    // If it doesn't exist in the list, it must be an "Other" value
                    nameSelect.value = category === 'Political' ? 'Others' : 'Other';
                    otherInput.value = previousValue;
                }
            }
        }

        // Trigger other group visibility check
        handleClientNameChange();

        // Update work types
        updateWorkTypes(category);
    }

    function updateWorkTypes(category) {
        if (!workTypeSelect) return;

        const previousWorkType = workTypeSelect.getAttribute('data-initial-value') || workTypeSelect.value;

        workTypeSelect.innerHTML = '<option value="" disabled selected>Select work type</option>';

        if (category && workTypeOptions[category]) {
            workTypeOptions[category].forEach(type => {
                const option = document.createElement('option');
                option.value = type;
                option.textContent = type;
                workTypeSelect.appendChild(option);
            });

            // Restore previous selection if valid (for edit mode)
            if (previousWorkType) {
                const exists = Array.from(workTypeSelect.options).some(opt => opt.value === previousWorkType);
                if (exists) {
                    workTypeSelect.value = previousWorkType;
                } else if (previousWorkType !== "") {
                    // If it doesn't exist in the list check for "Other" logic manually
                    // But typically "Other" is in the list.
                    // If stored value is custom text, selecting "Other" and filling input
                    workTypeSelect.value = 'Other';
                    otherWorkInput.value = previousWorkType;
                }
            }
        }
        handleWorkTypeChange();
    }

    function handleClientNameChange() {
        const clientName = nameSelect.value;
        const isOther = clientName === 'Others' || clientName === 'Other';

        if (isOther) {
            otherGroup.style.display = 'block';
            otherInput.required = true;
        } else {
            otherGroup.style.display = 'none';
            otherInput.required = false;
        }
    }

    function handleWorkTypeChange() {
        const workType = workTypeSelect.value;
        const isOther = workType === 'Other';

        if (isOther) {
            otherWorkGroup.style.display = 'block';
            otherWorkInput.required = true;
        } else {
            otherWorkGroup.style.display = 'none';
            otherWorkInput.required = false;
        }
    }

    categorySelect.addEventListener('change', updateClientNames);
    nameSelect.addEventListener('change', handleClientNameChange);
    workTypeSelect.addEventListener('change', handleWorkTypeChange);

    // Run once on load to handle initial values (especially for edit page)
    if (categorySelect.value) {
        updateClientNames();
    }
}

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
function switchTab(tabName, eventObj = null) {
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
    const evt = eventObj || window.event;
    if (evt && evt.currentTarget) {
        evt.currentTarget.classList.add('active');
    } else if (evt && evt.target) {
        // Fallback for cases where currentTarget might be lost
        const btn = evt.target.closest('.tab-btn');
        if (btn) btn.classList.add('active');
    }
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
