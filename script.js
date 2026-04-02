    // ==================== PROMPTS DATA ====================
    const PROMPTS = [
  {
    "number": 0,
    "name": "QA Workflow Orchestrator",
    "label": "Meta",
    "prompt": "You are a QA Workflow Orchestrator with 15+ years experience managing complex testing lifecycles.\n\nYour task is to analyze the project context and recommend the optimal sequence of QA prompts to execute.\n\nThink step-by-step.\n\nConsider:\n- Project type (web/mobile/api/enterprise/embedded)\n- Timeline pressure (critical/normal/relaxed)\n- Risk profile (high/medium/low)\n- Team size (small/medium/large)\n- Existing artifacts (spec/testcases/automation/none)\n- Compliance requirements (GDPR/PCI/HIPAA/SOC2)\n\nOutput:\n\n====================\nQA WORKFLOW ORCHESTRATION\n\nProject Context Summary\n- Type:\n- Timeline:\n- Risk:\n- Team Size:\n- Artifacts:\n- Compliance:\n\nRecommended Prompt Sequence\n\n| Order | Block Name | Mandatory/Optional | Estimated Effort | Rationale |\n\nPhase 1 — Foundation\nPhase 2 — Design\nPhase 3 — Execution\nPhase 4 — Release\n\nCritical Dependencies\n- Which blocks must be done before others\n\nTime Estimate Summary\n- Total estimated hours/days\n\n====================\n\nProject Context:\n{PROJECT_CONTEXT}",
    "description": "Orchestrator tự động đề xuất chuỗi prompt phù hợp dựa trên bối cảnh dự án.",
    "when_to_use": "Khi bắt đầu dự án mới, cần xác định quy trình QA phù hợp.",
    "how_to_use": "Điền {PROJECT_CONTEXT} với thông tin dự án (type, timeline, risk, team size, artifacts, compliance).",
    "disabled": false,
    "created_at": "2026-04-02T10:00:00Z",
    "updated_at": "2026-04-02T10:00:00Z"
  },
  {
    "number": 1,
    "name": "Spec Review",
    "label": "Test Architect Level",
    "prompt": "You are a Senior QA Architect with 15+ years experience.\n\nYour task is to critically review the provided specification.\n\nThink step-by-step and analyze deeply.\nAssume the system will fail.\nBe highly critical and avoid generic answers.\n\nAnalyze the following areas:\n\n1. Missing requirements\n2. Ambiguous requirements\n3. Conflicting logic\n4. Hidden assumptions\n5. Testability issues\n6. Business risks\n7. Integration risks\n8. Edge case risks\n9. Data privacy / GDPR impact\n10. Compliance requirements (PCI-DSS, HIPAA, etc.)\n11. Backward compatibility impact\n\nFor each issue provide:\n\n- Issue\n- Type\n- Impact\n- Severity (High / Medium / Low)\n- Why it matters\n- Suggested improvement\n\nOutput Format:\n\n====================\n\nSPEC REVIEW REPORT\n\n1. Missing Requirements\n\n| Issue | Impact | Severity | Suggestion |\n\n---\n\n2. Ambiguous Requirements\n\n| Issue | Risk | Severity | Suggestion |\n\n---\n\n3. Conflicting Logic\n\n| Conflict | Risk | Severity | Suggestion |\n\n---\n\n4. Hidden Assumptions\n\n| Assumption | Risk | Severity |\n\n---\n\n5. Testability Issues\n\n| Issue | Why Hard to Test | Suggestion |\n\n---\n\n6. Business Risks\n\n| Risk | Impact | Severity |\n\n---\n\n7. Integration Risks\n\n| Integration Point | Risk | Severity |\n\n---\n\n8. Edge Case Risks\n\n| Edge Case | Risk | Severity |\n\n---\n\n9. Data Privacy / Compliance Risks\n\n| Area | Risk | Severity | Suggestion |\n\n---\n\n10. Overall Spec Quality Score\n\nScore: 1–10\n\nJustification:\n\n====================\n\nSpecification:\n{SPEC}",
    "description": "Đánh giá chất lượng spec trước khi viết testcase.",
    "when_to_use": "Khi nhận spec mới, grooming, refinement, trước khi viết testcase.",
    "how_to_use": "Điền {SPEC} với nội dung specification cần review.",
    "disabled": false,
    "created_at": "2026-04-02T10:00:00Z",
    "updated_at": "2026-04-02T10:00:00Z"
  },
  {
    "number": 2,
    "name": "Spec Gap Analysis",
    "label": "Senior QA Level",
    "prompt": "You are a Senior QA Analyst.\n\nYour task is to compare Requirement vs Specification.\n\nThink critically and identify gaps.\n\nAssume implementation may fail if gaps exist.\n\nAnalyze:\n\n1. Missing in Specification\n2. Missing in Requirement\n3. Scope mismatch\n4. Conflicting behavior\n5. Hidden assumptions\n6. Business logic gaps\n7. Data flow gaps\n8. Integration gaps\n9. Compliance gaps\n\nFor each gap provide:\n\n- Gap description\n- Where found (Requirement / Spec)\n- Impact\n- Severity (High / Medium / Low)\n- Suggested clarification\n\nOutput Format:\n\n====================\n\nSPEC GAP ANALYSIS REPORT\n\n1. Missing in Specification\n\n| Requirement | Missing Detail | Impact | Severity |\n\n---\n\n2. Missing in Requirement\n\n| Spec Behavior | Missing Requirement | Risk | Severity |\n\n---\n\n3. Scope Mismatch\n\n| Requirement | Spec | Risk | Severity |\n\n---\n\n4. Conflicting Behavior\n\n| Conflict | Risk | Severity |\n\n---\n\n5. Hidden Assumptions\n\n| Assumption | Risk | Severity |\n\n---\n\n6. Business Logic Gaps\n\n| Logic Gap | Risk | Severity |\n\n---\n\n7. Data Flow Gaps\n\n| Data | Missing Rule | Risk |\n\n---\n\n8. Integration Gaps\n\n| Integration | Missing Behavior | Risk |\n\n---\n\n9. Compliance Gaps\n\n| Requirement | Missing in Spec | Risk | Severity |\n\n---\n\n10. Overall Gap Risk Score\n\nScore: 1–10\n\nJustification:\n\n====================\n\nRequirement:\n{REQUIREMENT}\n\nSpecification:\n{SPEC}",
    "description": "So sánh Requirement vs Spec để phát hiện gap.",
    "when_to_use": "Khi có Requirement và Spec, trước sprint planning, trước viết testcase.",
    "how_to_use": "Điền {REQUIREMENT} và {SPEC} tương ứng.",
    "disabled": false,
    "created_at": "2026-04-02T10:00:00Z",
    "updated_at": "2026-04-02T10:00:00Z"
  },
  {
    "number": 3,
    "name": "Risk Analysis",
    "label": "Test Architect Level",
    "prompt": "You are a Senior QA Architect with 15+ years experience.\n\nPerform Risk-Based Testing Analysis.\n\nThink step-by-step.\n\nAssume system failure will happen.\n\nAnalyze the following areas:\n\n1. Functional Risk\n2. Integration Risk\n3. Data Risk\n4. Performance Risk\n5. Security Risk\n6. Permission Risk\n7. UI Risk\n8. API Risk\n9. Business Logic Risk\n10. State Transition Risk\n11. Compliance Risk\n12. Data Privacy Risk\n13. Vendor Dependency Risk\n14. Time-to-Market Risk\n\nFor each risk provide:\n\n- Risk Area\n- Description\n- Root Cause\n- Impact\n- Likelihood\n- Severity (High / Medium / Low)\n- Risk Score (1–10)\n- Suggested Testing Focus\n\nOutput Format:\n\n====================\n\nRISK ANALYSIS REPORT\n\n| Area | Risk | Root Cause | Impact | Likelihood | Severity | Score | Testing Focus |\n\n---\n\nCritical Risk Summary\n\nTop 5 Highest Risks\n\n---\n\nRisk Distribution\n\nHigh Risk:\nMedium Risk:\nLow Risk:\n\n---\n\nTesting Priority Recommendation\n\nP0:\nP1:\nP2:\n\n====================\n\nSpecification:\n{SPEC}",
    "description": "Phân tích rủi ro hệ thống theo Risk-Based Testing.",
    "when_to_use": "Sau Spec Review, trước viết testcase, trước release.",
    "how_to_use": "Điền {SPEC} với specification cần phân tích.",
    "disabled": false,
    "created_at": "2026-04-02T10:00:00Z",
    "updated_at": "2026-04-02T10:00:00Z"
  },
  {
    "number": 4,
    "name": "Critical Path Analysis",
    "label": "Test Architect Level",
    "prompt": "You are a Senior QA Architect with 15+ years experience.\n\nYour task is to identify Critical User Paths.\n\nThink step-by-step.\n\nAssume failure in critical flow causes system failure.\n\nAnalyze:\n\n1. Core business flows\n2. User onboarding flows\n3. Data creation flows\n4. Data update flows\n5. Payment / transaction flows (if applicable)\n6. Authentication flows\n7. Integration flows\n8. State transition flows\n9. Recovery flows (rollback, error recovery)\n\nFor each flow identify:\n\n- Flow Name\n- Steps\n- Why Critical\n- Failure Impact\n- User Impact\n- Business Impact\n- Severity (High / Medium / Low)\n- Testing Recommendation\n\nOutput Format:\n\n====================\n\nCRITICAL PATH ANALYSIS\n\n| Flow | Steps | Why Critical | User Impact | Business Impact | Severity | Test Priority |\n\n---\n\nTop Critical Flows\n\n1.\n2.\n3.\n4.\n5.\n\n---\n\nSmoke Test Candidates\n\n| Flow | Reason |\n\n---\n\nRecommended Execution Order\n\n1.\n2.\n3.\n4.\n\n====================\n\nSpecification:\n{SPEC}",
    "description": "Xác định Critical User Flow — những luồng quan trọng nhất.",
    "when_to_use": "Sau Risk Analysis, trước viết testcase, trước release, smoke testing design.",
    "how_to_use": "Điền {SPEC} với specification.",
    "disabled": false,
    "created_at": "2026-04-02T10:00:00Z",
    "updated_at": "2026-04-02T10:00:00Z"
  }
    ];

    // ==================== HELPER FUNCTIONS ====================
    let filteredPrompts = [...PROMPTS];
    let selectedCategories = [];
    let currentModalPrompt = null;
    let searchTimeout;

    const grid = document.getElementById('promptGrid');
    const emptyState = document.getElementById('emptyState');
    const searchInput = document.getElementById('searchInput');
    const totalBadge = document.getElementById('totalBadge');
    const activeBadge = document.getElementById('activeBadge');
    const resultsBadge = document.getElementById('resultsBadge');
    const modal = document.getElementById('modal');
    const modalClose = document.getElementById('modalClose');
    const toast = document.getElementById('toast');
    const categoryFilter = document.getElementById('categoryFilter');

    // Format date
    const formatDate = (iso) => {
      if (!iso) return '';
      const d = new Date(iso);
      return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    // Escape HTML
    const escapeHtml = (str) => {
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    };

    // Simple fuzzy search function
    const fuzzyMatch = (query, text) => {
      const q = query.toLowerCase();
      const t = text.toLowerCase();
      let qIdx = 0;
      for (let i = 0; i < t.length && qIdx < q.length; i++) {
        if (t[i] === q[qIdx]) qIdx++;
      }
      return qIdx === q.length;
    };

    // Highlight search term in text
    const highlightText = (text, query) => {
      if (!query) return escapeHtml(text);
      const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      const highlighted = escapeHtml(text).replace(regex, '<span class="search-highlight">$1</span>');
      return highlighted;
    };

    // Copy to clipboard
    const copyToClipboard = async (text, btn) => {
      try {
        await navigator.clipboard.writeText(text);
        showToast('✓ Copied to clipboard!');
        if (btn) {
          btn.classList.add('copied');
          btn.textContent = '✓ Copied!';
          setTimeout(() => {
            btn.classList.remove('copied');
            btn.innerHTML = '📋 Copy Prompt';
          }, 2000);
        }
      } catch (err) {
        showToast('✗ Copy failed');
        console.error(err);
      }
    };

    // Show toast
    const showToast = (msg) => {
      toast.textContent = msg;
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 2500);
    };

    // Get unique categories
    const getCategories = () => {
      const cats = [...new Set(PROMPTS.map(p => p.label))];
      return cats.sort();
    };

    // Count prompts by category
    const countByCategory = (category) => {
      return PROMPTS.filter(p => !p.disabled && p.label === category).length;
    };

    // Initialize category filter
    const initCategoryFilter = () => {
      const categories = getCategories();
      categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = 'category-btn';
        btn.innerHTML = `${escapeHtml(cat)} <span class="category-count">(${countByCategory(cat)})</span>`;
        btn.addEventListener('click', () => {
          btn.classList.toggle('active');
          if (btn.classList.contains('active')) {
            selectedCategories.push(cat);
          } else {
            selectedCategories = selectedCategories.filter(c => c !== cat);
          }
          filterPrompts(searchInput.value);
        });
        categoryFilter.appendChild(btn);
      });
    };

    // Render card
    const renderCard = (p, query = '') => {
      const card = document.createElement('div');
      card.className = `prompt-card ${p.disabled ? 'disabled' : ''}`;
      
      const preview = p.prompt.length > 200 
        ? p.prompt.substring(0, 200) + '...' 
        : p.prompt;

      const highlightedDesc = highlightText(p.description || 'No description', query);
      const highlightedPreview = highlightText(preview, query);

      card.innerHTML = `
        <div class="card-header">
          <div class="card-title">
            <span class="card-number">#${p.number}</span>
            ${escapeHtml(p.name)}
          </div>
          <span class="card-label">${escapeHtml(p.label || 'General')}</span>
        </div>
        
        <div class="card-meta">
          <span>🕐 ${formatDate(p.updated_at)}</span>
          ${p.disabled ? '<span style="color:var(--warning)">⚠️ Disabled</span>' : '<span>✅ Active</span>'}
        </div>

        <div class="card-section">
          <div class="card-section-title">📄 Description</div>
          <p class="card-desc">${highlightedDesc}</p>
        </div>

        <div class="card-section">
          <div class="card-section-title">💬 Prompt Preview</div>
          <pre class="prompt-content">${highlightedPreview}</pre>
        </div>

        <div class="card-footer">
          <button class="btn btn-copy" data-copy="${p.number}">📋 Copy</button>
          <button class="btn btn-view" data-view="${p.number}">👁️ View Full</button>
        </div>
      `;
      return card;
    };

    // Render grid
    const renderGrid = (query = '') => {
      grid.innerHTML = '';
      
      if (filteredPrompts.length === 0) {
        emptyState.style.display = 'block';
        return;
      }
      emptyState.style.display = 'none';

      filteredPrompts.forEach(p => {
        grid.appendChild(renderCard(p, query));
      });

      // Attach events
      grid.querySelectorAll('[data-copy]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const num = parseInt(e.currentTarget.dataset.copy);
          const prompt = PROMPTS.find(x => x.number === num);
          if (prompt && !prompt.disabled) {
            copyToClipboard(prompt.prompt, e.currentTarget);
          }
        });
      });

      grid.querySelectorAll('[data-view]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const num = parseInt(e.currentTarget.dataset.view);
          const prompt = PROMPTS.find(x => x.number === num);
          if (prompt) openModal(prompt);
        });
      });
    };

    // Search filter with debounce and fuzzy matching
    const filterPrompts = (query) => {
      const q = query.toLowerCase().trim();
      
      if (!q && selectedCategories.length === 0) {
        filteredPrompts = [...PROMPTS];
      } else {
        filteredPrompts = PROMPTS.filter(p => {
          if (p.disabled) return false;
          
          // Category filter
          if (selectedCategories.length > 0 && !selectedCategories.includes(p.label)) {
            return false;
          }
          
          // Search filter
          if (q) {
            const hay = [
              p.name, p.label, p.description, 
              p.prompt, p.when_to_use, p.how_to_use
            ].join(' ').toLowerCase();
            
            // Exact match or fuzzy match
            return hay.includes(q) || fuzzyMatch(q, hay);
          }
          
          return true;
        });
      }
      updateStats();
      renderGrid(q);
    };

    // Debounced search
    const handleSearch = (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        filterPrompts(e.target.value);
      }, 300);
    };

    // Update stats
    const updateStats = () => {
      const total = PROMPTS.length;
      const active = PROMPTS.filter(p => !p.disabled).length;
      totalBadge.querySelector('strong').textContent = total;
      activeBadge.querySelector('strong').textContent = active;
      resultsBadge.querySelector('strong').textContent = filteredPrompts.length;
    };

    // Modal functions
    const openModal = (p) => {
      currentModalPrompt = p;
      document.getElementById('modalTitle').textContent = `#${p.number} - ${p.name}`;
      document.getElementById('modalMeta').innerHTML = `
        <span>🏷️ ${escapeHtml(p.label)}</span>
        <span>🕐 Updated: ${formatDate(p.updated_at)}</span>
        ${p.disabled ? '<span style="color:var(--warning)">⚠️ Disabled</span>' : ''}
      `;
      document.getElementById('modalPrompt').textContent = p.prompt;
      document.getElementById('modalWhen').textContent = p.when_to_use || 'N/A';
      document.getElementById('modalHow').textContent = p.how_to_use || 'N/A';
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    };

    const closeModal = () => {
      modal.classList.remove('active');
      document.body.style.overflow = '';
      currentModalPrompt = null;
    };

    // Download prompt as .txt
    const downloadPrompt = (p) => {
      const content = `# ${p.name}
Label: ${p.label}
Description: ${p.description}

## When to use
${p.when_to_use}

## How to use
${p.how_to_use}

## Prompt
${p.prompt}

---
Created: ${p.created_at} | Updated: ${p.updated_at}`;
      
      const blob = new Blob([content], {type: 'text/plain'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `prompt-${p.number}-${p.name.toLowerCase().replace(/\s+/g, '-')}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('✓ Downloaded!');
    };

    // Event Listeners
    searchInput.addEventListener('input', handleSearch);
    
    modalClose.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
    
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('active')) {
        closeModal();
      }
    });

    document.getElementById('modalCopy').addEventListener('click', () => {
      if (currentModalPrompt && !currentModalPrompt.disabled) {
        copyToClipboard(currentModalPrompt.prompt, document.getElementById('modalCopy'));
      }
    });

    document.getElementById('modalDownload').addEventListener('click', () => {
      if (currentModalPrompt) {
        downloadPrompt(currentModalPrompt);
      }
    });

    // Init
    initCategoryFilter();
    updateStats();
    renderGrid();

    // Focus search on load
    window.addEventListener('load', () => {
      searchInput.focus();
    });
