import { useState } from 'react';

export default function SectionAccordion({ sections = {}, sectionOrder = [] }) {
  const [openSection, setOpenSection] = useState(null);

  const sectionLabels = {
    contact: 'Contact Information',
    summary: 'Summary / Objective',
    experience: 'Work Experience',
    education: 'Education',
    skills: 'Skills',
    certifications: 'Certifications',
    projects: 'Projects',
    awards: 'Awards & Recognition',
    publications: 'Publications',
    volunteer: 'Volunteer Experience',
    languages: 'Languages',
    references: 'References',
  };

  const order = sectionOrder.length > 0 ? sectionOrder : Object.keys(sections);

  if (order.length === 0) return null;

  return (
    <div className="w-full">
      <h3 className="text-sm font-semibold text-text-primary mb-3">Section-by-Section Detail</h3>
      <div className="space-y-1.5 rounded-xl border border-white/10 overflow-hidden">
        {order.map((key) => {
          const text = sections[key];
          if (!text) return null;
          const isOpen = openSection === key;
          const wordCount = text.split(/\s+/).filter(Boolean).length;

          return (
            <div key={key} className="border-b border-white/5 last:border-0">
              <button
                onClick={() => setOpenSection(isOpen ? null : key)}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/[0.02] transition-colors"
                aria-expanded={isOpen}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${text.length > 50 ? 'bg-green-400' : 'bg-amber-400'}`} />
                  <span className="text-sm font-medium text-text-primary">
                    {sectionLabels[key] || key.charAt(0).toUpperCase() + key.slice(1)}
                  </span>
                  <span className="text-xs text-text-muted">{wordCount} words</span>
                </div>
                <svg
                  className={`w-4 h-4 text-text-muted transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </button>

              {isOpen && (
                <div className="px-4 pb-4 pt-1">
                  <pre className="text-xs text-text-secondary whitespace-pre-wrap font-sans leading-relaxed bg-white/[0.02] rounded-lg p-3 max-h-64 overflow-y-auto">
                    {text}
                  </pre>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}