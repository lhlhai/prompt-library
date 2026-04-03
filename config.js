const APP_CONFIG = {
  // Toggle Multi-page Navigation & Collections feature
  enableMultiPage: true,
  
  // Define collections/pages
  collections: [
    {
      id: 'all',
      name: 'All Prompts',
      icon: '📚',
      description: 'Full library of all available prompts.'
    },
    {
      id: 'qa',
      name: 'QA & Testing',
      icon: '🧪',
      description: 'Specialized prompts for quality assurance and software testing.',
      filter: (p) => p.label && (p.label.includes('QA') || p.label.includes('Senior QA') || p.label.includes('Analysis'))
    },
    {
      id: 'ba',
      name: 'Business Analyst',
      icon: '📊',
      description: 'Prompts for business analysis, requirement elicitation, and process modeling.',
      filter: (p) => p.label && p.label.includes('Business Analyst')
    },
    {
      id: 'dev',
      name: 'Development',
      icon: '💻',
      description: 'Prompts for software development, architecture, and coding.',
      filter: (p) => p.label && (p.label.includes('Dev') || p.label.includes('Architect') || p.label.includes('Code'))
    },
    {
      id: 'creative',
      name: 'Creative',
      icon: '🎨',
      description: 'Creative writing, design, and brainstorming prompts.',
      filter: (p) => p.label && (p.label.includes('Creative') || p.label.includes('Design'))
    },
    {
      id: 'my-collection',
      name: 'My Collection',
      icon: '⭐',
      description: 'Your personally curated list of favorite prompts.',
      isPersonal: true
    }
  ]
};
