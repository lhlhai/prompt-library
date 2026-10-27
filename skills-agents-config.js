// Chỉnh trực tiếp file này để bật/tắt từng nhóm tính năng.
// Mọi tính năng mặc định được bật để phù hợp với workflow QA cá nhân.
window.QA_CONFIG = {
  features: {
    search: true,
    filters: true,
    favorites: true,
    recentlyUsed: true,
    copy: true,
    markdown: true,
    relatedSkills: true,
    keyboardShortcuts: true,
    stats: true,
    promptPlaceholder: true,
  },
  dataBasePath: 'data',
  maxSearchContentLength: 12000,
  storagePrefix: 'qa-library',
};
