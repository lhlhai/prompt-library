/**
 * Shared Components Module
 * Quản lý các thành phần dùng chung giữa các trang (Navbar, Footer, etc.)
 */

const SharedComponents = {
  /**
   * Render Navigation Bar với các collection
   */
  renderNavbar: function(currentPage = 'library') {
    const navbar = document.getElementById('navbar');
    if (!navbar || !window.APP_CONFIG || !APP_CONFIG.enableMultiPage) return;

    navbar.style.display = 'block';
    const menu = document.getElementById('navbarMenu');
    if (!menu) return;

    menu.innerHTML = '';

    // Tạo các mục điều hướng chính
    const mainNav = [
      {
        id: 'index',
        name: 'Library',
        icon: '📚',
        href: 'index.html',
        description: 'Browse all prompts'
      },
      {
        id: 'about',
        name: 'About',
        icon: 'ℹ️',
        href: 'about.html',
        description: 'About this project'
      },
      {
        id: 'guide',
        name: 'Guide',
        icon: '📖',
        href: 'guide.html',
        description: 'How to use prompts'
      }
    ];

    mainNav.forEach(nav => {
      const item = document.createElement('a');
      item.className = `navbar-item ${nav.id === currentPage ? 'active' : ''}`;
      item.href = nav.href;
      item.innerHTML = `<span class="navbar-icon">${nav.icon}</span> ${nav.name}`;
      item.title = nav.description;
      menu.appendChild(item);
    });
  },

  /**
   * Render Footer
   */
  renderFooter: function() {
    const footer = document.querySelector('footer');
    if (!footer) return;

    footer.innerHTML = `
      <div class="footer-content">
        <div class="footer-section">
          <h4>📚 Prompt Library</h4>
          <p>A curated collection of prompts for QA, Development, and Creative work.</p>
        </div>
        <div class="footer-section">
          <h4>Quick Links</h4>
          <ul>
            <li><a href="index.html">Library</a></li>
            <li><a href="about.html">About</a></li>
            <li><a href="guide.html">Guide</a></li>
          </ul>
        </div>
        <div class="footer-section">
          <h4>Resources</h4>
          <ul>
            <li><a href="https://github.com/lhlhai/prompt-library" target="_blank">GitHub</a></li>
            <li><a href="https://github.com/lhlhai/prompt-library/issues" target="_blank">Issues</a></li>
            <li><a href="https://github.com/lhlhai/prompt-library/blob/main/CONTRIBUTING.md" target="_blank">Contribute</a></li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">
        <p>&copy; 2024 Prompt Library. All rights reserved.</p>
      </div>
    `;
  },

  /**
   * Khởi tạo các thành phần chung cho tất cả trang
   */
  init: function(currentPage = 'index') {
    this.renderNavbar(currentPage);
    this.renderFooter();
  }
};

// Auto-init khi DOM loaded
document.addEventListener('DOMContentLoaded', () => {
  // Lấy tên trang từ URL
  const currentPage = window.location.pathname.split('/').pop().replace('.html', '') || 'index';
  SharedComponents.init(currentPage);
});
