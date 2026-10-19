// n8n Code node "Config" — the only place to change settings.
return [{ json: {
  repo: 'subitesme-hue/tech-impact-docs',
  research_model: 'anthropic/claude-sonnet-5.5',   // with OpenRouter web search
  script_model: 'anthropic/claude-sonnet-5.5',
  post_enabled: false,          // switch to true after you approve the first test video
  post_hour_dubai: 23, post_minute: 30,
  accounts: { facebook: 7748, linkedin: 9116, youtube: 7751, x: 7747 },
  voices: ['am_michael', 'af_heart', 'bm_george', 'af_bella', 'am_fenrir', 'bf_emma', 'am_puck', 'af_nicole', 'bm_fable', 'bf_isabella'],
  regions: ['United States', 'Europe', 'Africa', 'Middle East', 'GCC', 'South Asia', 'East Asia', 'Asia Pacific'],
  sectors: ['Healthcare', 'Agriculture', 'Education', 'Energy', 'Water and sanitation', 'Financial inclusion', 'Manufacturing',
    'Logistics', 'Retail and e-commerce', 'Construction and housing', 'Transport and mobility', 'Tourism', 'Public services',
    'Climate and environment', 'Telecommunications', 'Food security', 'Insurance', 'Jobs and skills', 'Disaster response',
    'Accessibility', 'Mining and resources', 'Media and culture'],
} }];
