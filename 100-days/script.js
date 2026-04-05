// Configuration
const CONFIG = {
    postsPerPage: 6,
    enableSearch: true,
    enableFiltering: true,
    enableThemeToggle: true,
    readOnlyMode: true // New: Global read-only mode
};

// Data
const posts = [
    {
        id: 45,
        day: "Day 45 / 100",
        title: "API Testing Basics: Navigating the Technical Landscape",
        excerpt: "Manual testing isn't just about clicking buttons on a UI. As systems become more decoupled, the ability to verify logic at the service layer becomes critical.",
        category: "API TESTING",
        author: "Alex Smith",
        authorRole: "Senior Quality Engineer",
        date: "Oct 24, 2024",
        source: "https://example.com/api-basics",
        image: "https://images.unsplash.com/photo-1516116216624-53e697fedbea?auto=format&fit=crop&q=80&w=1200",
        content: `
            <p>Manual testing isn't just about clicking buttons on a UI. As systems become more decoupled, the ability to verify logic at the service layer becomes critical. Today, we dive into the fundamental concepts of API testing—the bridge between technical implementation and business logic.</p>
            
            <h3>What is an API?</h3>
            <p>In the simplest terms, an API (Application Programming Interface) is a set of rules that allows one software application to talk to another. Think of it as a waiter in a restaurant: you (the client) give an order (the request), and the waiter takes it to the kitchen (the server) and brings back your food (the response).</p>
            
            <div class="info-box">
                <h4>Core Components of an API Request</h4>
                <ul>
                    <li><strong>Endpoint:</strong> The URL where the service is hosted.</li>
                    <li><strong>Method:</strong> The type of action (GET, POST, PUT, DELETE).</li>
                    <li><strong>Headers:</strong> Metadata like authentication tokens or content type.</li>
                    <li><strong>Body:</strong> The data being sent to the server (typically JSON).</li>
                </ul>
            </div>

            <h3>Practical Example: The JSON Structure</h3>
            <p>Below is a typical example of a successful response body for a user profile request.</p>
            
            <pre><code>{
  "status": "success",
  "data": {
    "user_id": 10294,
    "username": "tester_pro",
    "role": "QA Lead",
    "is_active": true
  }
}</code></pre>

            <h3>The Reference Section</h3>
            <div class="reference-box">
                <p>🔗 Learn more from: <a href="https://example.com/api-basics" target="_blank">https://example.com/api-basics</a></p>
            </div>
        `,
        related: [44, 46, 47],
        comments: [
            {
                user: "Sarah Jenkins",
                time: "2 hours ago",
                text: "This was incredibly helpful! I've been struggling with understanding the difference between PUT and PATCH. Looking forward to Day 46."
            }
        ]
    },
    {
        id: 44,
        day: "Day 44",
        title: "HTTP Status Codes Explained",
        category: "FUNDAMENTALS",
        image: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&q=80&w=200"
    },
    {
        id: 46,
        day: "Day 46",
        title: "Testing REST vs SOAP APIs",
        category: "API TESTING",
        image: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&q=80&w=200"
    },
    {
        id: 47,
        day: "Day 47",
        title: "Authentication and OAuth 2.0",
        category: "SECURITY",
        image: "https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&q=80&w=200"
    },
    {
        id: 1,
        day: "Day 01",
        title: "The Foundation of Exploratory Testing",
        excerpt: "Discover why intuition remains the most powerful tool in a manual tester's arsenal, despite the rise of automated scripts.",
        category: "FUNDAMENTALS",
        author: "The Manual Authority",
        source: "Guru99 Foundation",
        image: null
    },
    {
        id: 2,
        day: "Day 02",
        title: "Visual Regression for Humans",
        excerpt: "A guide to spotting pixel-level inconsistencies that machines often miss.",
        category: "UI TESTING",
        author: "The Manual Authority",
        source: "TESTINGACADEMY",
        image: null
    },
    {
        id: 3,
        day: "Day 03",
        title: "Postman vs The Void",
        excerpt: "Mastering manual status code validation and schema sanity checks without scripts.",
        category: "API TESTING",
        author: "The Manual Authority",
        source: "MINISTRY OF TEST",
        image: null
    },
    {
        id: 4,
        day: "Day 04",
        title: "The Art of the Bug Report",
        excerpt: "Learn how to write reports that developers actually want to read, ensuring faster fix times.",
        category: "BEST PRACTICES",
        author: "The Manual Authority",
        source: "SoftwareTestingHelp",
        image: "https://images.unsplash.com/photo-1516116216624-53e697fedbea?auto=format&fit=crop&q=80&w=800"
    },
    {
        id: 5,
        day: "Day 05",
        title: "Beyond the DevTools Console",
        excerpt: "Unlocking hidden inspection features for cross-browser troubleshooting.",
        category: "TOOLS",
        author: "The Manual Authority",
        source: "MDN WEB DOCS",
        image: null
    },
    {
        id: 6,
        day: "Day 06",
        title: "Tactile Feedback Analysis",
        excerpt: "Testing haptics and gestural responsiveness on Android vs iOS.",
        category: "MOBILE TESTING",
        author: "The Manual Authority",
        source: "APPLE DEVELOPER",
        image: null
    },
    {
        id: 7,
        day: "Day 07",
        title: "State Management in Testing",
        excerpt: "Understanding application state transitions and edge cases.",
        category: "FUNDAMENTALS",
        author: "The Manual Authority",
        source: "TESTING GUILD",
        image: null
    },
    {
        id: 8,
        day: "Day 08",
        title: "Cross-Browser Compatibility Matrix",
        excerpt: "Building a systematic approach to testing across different browsers.",
        category: "UI TESTING",
        author: "The Manual Authority",
        source: "BROWSERSTACK",
        image: null
    }
];

const categories = [
    "All Topics",
    "UI Testing",
    "API Testing",
    "Mobile Testing",
    "Tools",
    "Best Practices",
    "Fundamentals"
];

const categoryDetails = [
    {
        id: "ui-ux",
        title: "UI & UX Testing",
        description: "Master the art of visual validation, accessibility standards, and intuitive navigation flows across diverse screen resolutions.",
        lessons: 24,
        icon: "💻",
        color: "#0052cc",
        featured: true
    },
    {
        id: "api-integration",
        title: "API & Integration",
        description: "Verifying data integrity between services without a graphical interface.",
        lessons: 18,
        icon: "⚙️",
        color: "#10b981",
        featured: false
    },
    {
        id: "mobile-apps",
        title: "Mobile Apps",
        description: "Android and iOS specific testing challenges, including interrupts and low battery conditions.",
        lessons: 12,
        icon: "📱",
        color: "#3b82f6",
        featured: false
    },
    {
        id: "sql-data",
        title: "SQL & Data",
        description: "Verifying back-end operations, schema changes, and complex data migrations.",
        lessons: 9,
        icon: "🗄️",
        color: "#6b7280",
        featured: false
    },
    {
        id: "soft-skills",
        title: "Soft Skills",
        description: "Communication, bug reporting, and stakeholder management for high-impact testers.",
        lessons: 15,
        icon: "🤝",
        color: "#2563eb",
        featured: false,
        highlight: true
    },
    {
        id: "performance-load",
        title: "Performance & Load",
        description: "Simulating high-traffic scenarios and identifying bottleneck thresholds before they affect the end-user experience.",
        lessons: 11,
        icon: "🚀",
        color: "#ef4444",
        featured: false,
        isWide: true,
        badge: "ADVANCED THEORY",
        stats: "4.5 Hours Content"
    }
];

const specializedDomains = [
    "Security Basics", "Accessibility", "Compliance", "Browser Tools", "Network Logs"
];

// State
let currentPage = 1;
let filteredPosts = [...posts];
let selectedCategory = "All Topics";
let searchQuery = "";

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

function initializeApp() {
    // Check for category in URL
    const urlParams = new URLSearchParams(window.location.search);
    const categoryParam = urlParams.get('category');
    if (categoryParam) {
        selectedCategory = categoryParam;
    }

    renderFilterTags();
    filterAndRenderPosts();
    setupEventListeners();
    setupThemeToggle();
}

function setupEventListeners() {
    if (CONFIG.enableSearch) {
        const searchInput = document.querySelector('.search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                searchQuery = e.target.value.toLowerCase();
                currentPage = 1;
                filterAndRenderPosts();
            });
        }
    }

    const loadMoreBtn = document.querySelector('.btn-load-more');
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', () => {
            currentPage++;
            renderPosts(true);
        });
    }

    const newsletterBtn = document.querySelector('.newsletter-form button');
    if (newsletterBtn) {
        newsletterBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const email = document.querySelector('.newsletter-form input').value;
            if (email) {
                alert(`Thank you for subscribing with ${email}!`);
                document.querySelector('.newsletter-form input').value = '';
            }
        });
    }
}

function setupThemeToggle() {
    if (!CONFIG.enableThemeToggle) return;

    const themeToggle = document.querySelector('.theme-toggle');
    if (!themeToggle) return;

    const savedTheme = localStorage.getItem('theme') || 'light';
    applyTheme(savedTheme);

    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        applyTheme(newTheme);
        localStorage.setItem('theme', newTheme);
    });
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const themeToggle = document.querySelector('.theme-toggle');
    if (themeToggle) {
        themeToggle.textContent = theme === 'light' ? '🌙' : '☀️';
    }
}

function renderFilterTags() {
    if (!CONFIG.enableFiltering) return;

    const filterContainer = document.querySelector('.filter-tags');
    if (!filterContainer) return;

    filterContainer.innerHTML = '';
    categories.forEach(category => {
        const tag = document.createElement('button');
        tag.className = `tag ${category === selectedCategory ? 'active' : ''}`;
        tag.textContent = category;
        tag.addEventListener('click', () => {
            selectedCategory = category;
            currentPage = 1;
            document.querySelectorAll('.tag').forEach(t => t.classList.remove('active'));
            tag.classList.add('active');
            filterAndRenderPosts();
        });
        filterContainer.appendChild(tag);
    });
}

function filterAndRenderPosts() {
    filteredPosts = posts.filter(post => {
        const matchesCategory = selectedCategory === "All Topics" || 
                               post.category.toLowerCase().includes(selectedCategory.toLowerCase());
        const matchesSearch = searchQuery === "" || 
                             post.title.toLowerCase().includes(searchQuery) ||
                             post.excerpt.toLowerCase().includes(searchQuery);
        return matchesCategory && matchesSearch;
    });
    currentPage = 1;
    renderPosts();
}

function renderPosts(append = false) {
    const postsGrid = document.querySelector('.posts-grid');
    if (!postsGrid) return;

    const startIndex = (currentPage - 1) * CONFIG.postsPerPage;
    const endIndex = startIndex + CONFIG.postsPerPage;
    const postsToShow = filteredPosts.slice(startIndex, endIndex);

    if (!append) {
        postsGrid.innerHTML = '';
    }

    postsToShow.forEach(post => {
        const postCard = createPostCard(post);
        postsGrid.appendChild(postCard);
    });

    updateLoadMoreButton();
}

function createPostCard(post) {
    const card = document.createElement('div');
    card.className = 'post-card';
    card.addEventListener('click', () => {
        navigateToPost(post.id);
    });

    const imageClass = post.image ? '' : 'no-image';
    const imageHTML = post.image 
        ? `<img src="${post.image}" alt="${post.title}">`
        : `<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 3rem;">📋</div>`;

    card.innerHTML = `
        <div class="post-image ${imageClass}">
            ${imageHTML}
        </div>
        <div class="post-content">
            <div class="post-day">${post.day}</div>
            <div class="post-category">${post.category}</div>
            <h3 class="post-title">${post.title}</h3>
            <p class="post-excerpt">${post.excerpt}</p>
            <div class="post-footer">
                <div>
                    <div class="post-author">${post.author}</div>
                    <div class="post-source">${post.source}</div>
                </div>
                <div class="post-arrow">→</div>
            </div>
        </div>
    `;

    return card;
}

function updateLoadMoreButton() {
    const loadMoreBtn = document.querySelector('.btn-load-more');
    if (!loadMoreBtn) return;

    const totalPages = Math.ceil(filteredPosts.length / CONFIG.postsPerPage);
    if (currentPage >= totalPages) {
        loadMoreBtn.style.display = 'none';
    } else {
        loadMoreBtn.style.display = 'inline-block';
    }
}

function navigateToPost(postId) {
    // Navigate to post detail page
    window.location.href = `detail.html?id=${postId}`;
}

// Export posts for detail page access
if (typeof window !== 'undefined') {
    window.posts = posts;
}

// Navigation
const navLinks = document.querySelectorAll('nav a');
navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        const href = link.getAttribute('href');
        if (href && !href.startsWith('#')) {
            e.preventDefault();
            window.location.href = href;
        }
    });
});
