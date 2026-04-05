// Configuration
const CONFIG = {
    postsPerPage: 6,
    enableSearch: true,
    enableFiltering: true,
    enableThemeToggle: true,
    readOnlyMode: true,
    dataPath: 'data/'
};

// Global state
let posts = [];
let categories = [];
let categoryDetails = [];
let specializedDomains = [];

let currentPage = 1;
let filteredPosts = [];
let selectedCategory = "All Topics";
let searchQuery = "";

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await loadDataFromJSON();
    initializeApp();
});

// Load data from JSON files
async function loadDataFromJSON() {
    try {
        // Load index.json to get metadata and list of posts
        const response = await fetch(`${CONFIG.dataPath}index.json`);
        const indexData = await response.json();
        
        // Set categories and other metadata
        categories = indexData.categories || [];
        categoryDetails = indexData.categoryDetails || [];
        specializedDomains = indexData.specializedDomains || [];
        
        // Store post metadata and initialize empty posts array
        const postMetadata = indexData.posts || [];
        
        // Initially, we only need the metadata to render the grid
        // Full content will be loaded only when needed (lazy loading)
        posts = postMetadata.map(meta => ({
            ...meta,
            isLoaded: false
        }));
        
        // Sort posts by id (descending - newest first)
        posts.sort((a, b) => b.id - a.id);
        
    } catch (error) {
        console.error('Failed to load data from JSON:', error);
        // Fallback to empty data
        categories = ["All Topics"];
        categoryDetails = [];
        specializedDomains = [];
        posts = [];
    }
}

// Lazy load full post data if not already loaded
async function ensurePostLoaded(post) {
    if (post.isLoaded) return post;
    
    try {
        const postResponse = await fetch(`${CONFIG.dataPath}${post.file}`);
        const fullData = await postResponse.json();
        
        // Update the post object in the global array
        const index = posts.findIndex(p => p.id === post.id);
        if (index !== -1) {
            posts[index] = { ...fullData, isLoaded: true };
            return posts[index];
        }
    } catch (error) {
        console.warn(`Failed to load post file: ${post.file}`, error);
    }
    return post;
}

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

async function renderPosts(append = false) {
    const postsGrid = document.querySelector('.posts-grid');
    if (!postsGrid) return;

    const startIndex = (currentPage - 1) * CONFIG.postsPerPage;
    const endIndex = startIndex + CONFIG.postsPerPage;
    const postsToShow = filteredPosts.slice(startIndex, endIndex);

    if (!append) {
        postsGrid.innerHTML = '';
    }

    // Create skeleton cards for posts that are not yet loaded
    const cards = postsToShow.map(post => {
        const card = createPostCard(post);
        postsGrid.appendChild(card);
        return { post, card };
    });

    // Load each post and update its card when ready
    // This allows the UI to show skeletons immediately and fill them as data arrives
    cards.forEach(async ({ post, card }) => {
        if (!post.isLoaded) {
            const fullData = await ensurePostLoaded(post);
            const newCard = createPostCard(fullData);
            card.replaceWith(newCard);
        }
    });

    updateLoadMoreButton();
}

function createPostCard(post) {
    const card = document.createElement('div');
    card.className = 'post-card';
    
    if (!post.isLoaded) {
        card.classList.add('loading');
        card.innerHTML = `
            <div class="post-image skeleton skeleton-image"></div>
            <div class="post-content">
                <div class="skeleton skeleton-text" style="width: 30%;"></div>
                <div class="skeleton skeleton-text" style="width: 20%; height: 0.8rem;"></div>
                <div class="skeleton skeleton-title"></div>
                <div class="skeleton skeleton-text"></div>
                <div class="skeleton skeleton-text"></div>
                <div class="post-footer">
                    <div style="width: 100%;">
                        <div class="skeleton skeleton-text" style="width: 40%;"></div>
                        <div class="skeleton skeleton-text" style="width: 30%; height: 0.6rem;"></div>
                    </div>
                </div>
            </div>
        `;
        return card;
    }

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
                    <div class="post-source">${post.source || 'Manual Authority'}</div>
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
    window.loadPostDetail = loadPostDetail;
}

// Load post detail
async function loadPostDetail(id) {
    // Try to find post in already loaded posts
    let post = posts.find(p => p.id === id);
    
    if (post) {
        post = await ensurePostLoaded(post);
    } else {
        // If not found in the list, try to load it directly
        try {
            const paddedId = String(id).padStart(3, '0');
            const response = await fetch(`${CONFIG.dataPath}${paddedId}.json`);
            post = await response.json();
        } catch (error) {
            console.error(`Failed to load post ${id}:`, error);
        }
    }

    if (!post) {
        document.getElementById('post-article').innerHTML = '<h1>Post not found</h1><a href="index.html">Return to Home</a>';
        return;
    }

    // Update Page Title
    document.title = `${post.title} - 100 Days of Manual Testing`;

    // Render Post Content
    const article = document.getElementById('post-article');
    article.innerHTML = `
        <div class="post-header">
            <div class="post-day">${post.day}</div>
            <h1>${post.title}</h1>
            <div class="author-meta">
                <div class="author-avatar">
                    <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(post.author)}&background=0052cc&color=fff" alt="${post.author}">
                </div>
                <div class="author-info">
                    <div class="name">By: ${post.author}</div>
                    <div class="role-date">${post.authorRole || 'Contributor'} • ${post.date || 'Recently'}</div>
                </div>
            </div>
        </div>
        
        ${post.image ? `
        <div class="post-featured-image">
            <img src="${post.image}" alt="${post.title}">
        </div>
        ` : ''}

        <div class="post-body">
            ${post.content || `<p>${post.excerpt}</p><p>Full content coming soon...</p>`}
        </div>
    `;

    // Render Related Posts
    const relatedContainer = document.getElementById('related-posts');
    if (post.related && post.related.length > 0) {
        relatedContainer.innerHTML = '';
        post.related.forEach(relId => {
            const relPost = posts.find(p => p.id === relId);
            if (relPost) {
                const item = document.createElement('div');
                item.className = 'related-post-item';
                item.onclick = () => window.location.href = `detail.html?id=${relId}`;
                item.innerHTML = `
                    <div class="related-thumb">
                        <img src="${relPost.image || 'https://via.placeholder.com/60'}" alt="${relPost.title}">
                    </div>
                    <div class="related-info">
                        <div class="day">${relPost.day}</div>
                        <div class="title">${relPost.title}</div>
                    </div>
                `;
                relatedContainer.appendChild(item);
            }
        });
    } else {
        relatedContainer.innerHTML = '<p>No related posts found.</p>';
    }


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
