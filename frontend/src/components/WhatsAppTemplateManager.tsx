import React, { useState, useEffect } from 'react';
import {
  FileText,
  HelpCircle,
  ExternalLink,
  Plus,
  Trash2,
  Copy,
  Check,
  Sparkles,
  Smartphone,
  Phone,
  ArrowUpRight,
  MessageSquare,
  Image as ImageIcon,
  Video,
  FileSpreadsheet,
  AlertCircle,
  Save,
  CheckCircle2,
  RefreshCw,
  Info,
  X
} from 'lucide-react';
import { apiFetch } from '../utils/api';

export interface TemplateButton {
  type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER';
  text: string;
  url?: string;
  phone_number?: string;
}

export interface TemplateHeader {
  type: 'NONE' | 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  text?: string;
  media_url?: string;
}

export interface WhatsAppTemplate {
  id?: string;
  _id?: string;
  name: string;
  language: string;
  language_code: string;
  category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
  header: TemplateHeader;
  body: string;
  variables: Record<string, string>;
  footer?: string;
  buttons: TemplateButton[];
  trigger_keywords?: string[];
  is_active?: boolean;
  follow_up_yes?: string;
  follow_up_no?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

interface WhatsAppTemplateManagerProps {
  initialTemplate?: WhatsAppTemplate | null;
  onSaved?: (tmpl: WhatsAppTemplate) => void;
  onCancel?: () => void;
  onApplyToBot?: (content: { text: string; image_url?: string }) => void;
}

const LANGUAGES = [
  { label: 'English', code: 'en_US' },
  { label: 'English (UK)', code: 'en_GB' },
  { label: 'Hindi (हिंदी)', code: 'hi' },
  { label: 'Spanish (Español)', code: 'es' },
  { label: 'Portuguese (Português)', code: 'pt_BR' },
  { label: 'Arabic (العربية)', code: 'ar' },
  { label: 'French (Français)', code: 'fr' },
  { label: 'German (Deutsch)', code: 'de' },
  { label: 'Indonesian (Bahasa)', code: 'id' },
  { label: 'Bengali (বাংলা)', code: 'bn' },
  { label: 'Telugu (తెలుగు)', code: 'te' },
  { label: 'Marathi (मराठी)', code: 'mr' },
  { label: 'Tamil (தமிழ்)', code: 'ta' },
  { label: 'Gujarati (ગુજરાતી)', code: 'gu' }
];

const STARTER_TEMPLATES: WhatsAppTemplate[] = [
  {
    name: 'product_overview_demo',
    language: 'English',
    language_code: 'en_US',
    category: 'MARKETING',
    header: {
      type: 'IMAGE',
      media_url: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=1000&q=80'
    },
    body: 'Hello {{1}}! 👋\n\nThanks for your interest in {{2}}.\n\nWe empower B2B growth teams with AI outbound engines, instant WhatsApp lead qualification, and voice automation.\n\nWould you like a personalized 2-minute walkthrough demo?',
    variables: {
      '1': 'Alex',
      '2': 'Genquantaa GTM OS'
    },
    footer: 'Reply STOP to opt out anytime.',
    buttons: [
      { type: 'QUICK_REPLY', text: 'Yes, Show Me' },
      { type: 'QUICK_REPLY', text: 'Not Now' },
      { type: 'URL', text: 'Visit Website', url: 'https://genquantaa.com' }
    ]
  },
  {
    name: 'exclusive_discount_offer',
    language: 'English',
    language_code: 'en_US',
    category: 'MARKETING',
    header: {
      type: 'TEXT',
      text: 'Special Growth Offer ✨'
    },
    body: 'Hi {{1}}, upgrade your sales pipeline today!\n\nUse code *{{2}}* to claim an instant 20% discount on any annual subscription of {{3}}.',
    variables: {
      '1': 'Sarah',
      '2': 'GROWTH20',
      '3': 'GTM Platform'
    },
    footer: 'Offer valid until end of the month.',
    buttons: [
      { type: 'URL', text: 'Claim Discount', url: 'https://genquantaa.com/pricing' },
      { type: 'PHONE_NUMBER', text: 'Talk to Sales', phone_number: '+919980113561' }
    ]
  }
];

export default function WhatsAppTemplateManager({
  initialTemplate,
  onSaved,
  onCancel,
  onApplyToBot
}: WhatsAppTemplateManagerProps) {
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(initialTemplate?.id || null);

  // Form State
  const [name, setName] = useState(initialTemplate?.name || 'welcome_growth_outreach');
  const [language, setLanguage] = useState(initialTemplate?.language || 'English');
  const [languageCode, setLanguageCode] = useState(initialTemplate?.language_code || 'en_US');
  const [category, setCategory] = useState<'MARKETING' | 'UTILITY' | 'AUTHENTICATION'>(initialTemplate?.category || 'MARKETING');
  const [headerType, setHeaderType] = useState<'NONE' | 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT'>(initialTemplate?.header?.type || 'NONE');
  const [headerText, setHeaderText] = useState(initialTemplate?.header?.text || '');
  const [headerMediaUrl, setHeaderMediaUrl] = useState(initialTemplate?.header?.media_url || '');
  const [body, setBody] = useState(
    initialTemplate?.body ||
    '👋 Hello {{1}}! Thanks for connecting with {{2}}.\n\nWe help fast-growing teams discover verified B2B leads and automate multi-channel campaigns.\n\nWould you like to see a quick 2-minute walkthrough? Reply *YES* or *NO*.'
  );
  const [variables, setVariables] = useState<Record<string, string>>(
    initialTemplate?.variables || {
      '1': 'John',
      '2': 'our team'
    }
  );
  const [footer, setFooter] = useState(initialTemplate?.footer || 'Genquantaa Autonomous Lead Intelligence');
  const [buttonType, setButtonType] = useState<'NONE' | 'QUICK_REPLY' | 'CALL_TO_ACTION'>('QUICK_REPLY');
  const [buttons, setButtons] = useState<TemplateButton[]>(
    initialTemplate?.buttons || [
      { type: 'QUICK_REPLY', text: 'YES, show demo' },
      { type: 'QUICK_REPLY', text: 'NO, thank you' }
    ]
  );
  const [triggerKeywords, setTriggerKeywords] = useState<string[]>(
    initialTemplate?.trigger_keywords || ['demo', 'promo']
  );
  const [newKeyword, setNewKeyword] = useState('');
  const [isActive, setIsActive] = useState<boolean>(initialTemplate?.is_active ?? true);
  const [followUpYes, setFollowUpYes] = useState(initialTemplate?.follow_up_yes || '');
  const [followUpNo, setFollowUpNo] = useState(initialTemplate?.follow_up_no || '');

  // Reload when initialTemplate changes
  useEffect(() => {
    if (initialTemplate) {
      handleLoadTemplate(initialTemplate);
    }
  }, [initialTemplate]);

  // Fetch templates from API
  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/api/whatsapp-bot/templates');
      if (data.status === 'success' && data.templates) {
        setTemplates(data.templates);
      }
    } catch (err) {
      console.error('Failed to fetch templates:', err);
    } finally {
      setLoading(false);
    }
  };

  // Sync extracted variables when body changes
  useEffect(() => {
    const matches = body.match(/\{\{(\d+)\}\}/g) || [];
    const detectedKeys = Array.from(new Set(matches.map(m => m.replace(/[\{\}]/g, ''))));
    setVariables(prev => {
      const updated: Record<string, string> = {};
      detectedKeys.forEach(k => {
        updated[k] = prev[k] || `[Value for {{${k}}}]`;
      });
      return updated;
    });
  }, [body]);

  // Handle Language Change
  const handleLanguageChange = (langLabel: string) => {
    setLanguage(langLabel);
    const found = LANGUAGES.find(l => l.label === langLabel);
    if (found) setLanguageCode(found.code);
  };

  // Add a variable into body textarea
  const handleAddVariable = () => {
    const matches = body.match(/\{\{(\d+)\}\}/g) || [];
    const nextIdx = matches.length + 1;
    setBody(prev => `${prev} {{${nextIdx}}}`);
  };

  // Quick formatting helpers
  const handleFormat = (prefix: string, suffix: string) => {
    setBody(prev => `${prev} ${prefix}text${suffix}`);
  };

  // Button management
  const handleAddQuickReply = () => {
    if (buttons.length < 3) {
      setButtons(prev => [...prev, { type: 'QUICK_REPLY', text: `Option ${prev.length + 1}` }]);
    }
  };

  const handleAddCtaButton = (type: 'URL' | 'PHONE_NUMBER') => {
    if (buttons.length < 2) {
      if (type === 'URL') {
        setButtons(prev => [...prev, { type: 'URL', text: 'Visit Website', url: 'https://example.com' }]);
      } else {
        setButtons(prev => [...prev, { type: 'PHONE_NUMBER', text: 'Call Us', phone_number: '+1234567890' }]);
      }
    }
  };

  const handleRemoveButton = (idx: number) => {
    setButtons(prev => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateButton = (idx: number, patch: Partial<TemplateButton>) => {
    setButtons(prev => prev.map((btn, i) => (i === idx ? { ...btn, ...patch } : btn)));
  };

  // Save template
  const handleSave = async () => {
    if (!name.trim()) {
      alert('Please provide a Template Name');
      return;
    }
    if (!body.trim()) {
      alert('Please provide Message Body Text');
      return;
    }

    setSaving(true);
    setSaveSuccess(false);

    const payload: WhatsAppTemplate = {
      name: name.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''),
      language,
      language_code: languageCode,
      category,
      header: {
        type: headerType,
        text: headerType === 'TEXT' ? headerText : '',
        media_url: headerType !== 'NONE' && headerType !== 'TEXT' ? headerMediaUrl : ''
      },
      body,
      variables,
      footer,
      buttons,
      trigger_keywords: triggerKeywords,
      is_active: isActive,
      follow_up_yes: followUpYes,
      follow_up_no: followUpNo,
      status: 'APPROVED'
    };

    try {
      const res = await apiFetch('/api/whatsapp-bot/templates', {
        method: 'POST',
        bodyData: payload
      });
      if (res.status === 'success') {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2500);
        fetchTemplates();
        if (onSaved) {
          setTimeout(() => onSaved(res.template || payload), 1000);
        }
      }
    } catch (err) {
      console.error('Failed to save template:', err);
      alert('Failed to save template. Please check inputs and try again.');
    } finally {
      setSaving(false);
    }
  };

  // Load an existing or starter template
  const handleLoadTemplate = (tmpl: WhatsAppTemplate) => {
    setSelectedTemplateId(tmpl.id || tmpl._id || null);
    setName(tmpl.name);
    setLanguage(tmpl.language || 'English');
    setLanguageCode(tmpl.language_code || 'en_US');
    setCategory(tmpl.category || 'MARKETING');
    setHeaderType(tmpl.header?.type || 'NONE');
    setHeaderText(tmpl.header?.text || '');
    setHeaderMediaUrl(tmpl.header?.media_url || '');
    setBody(tmpl.body || '');
    setVariables(tmpl.variables || {});
    setFooter(tmpl.footer || '');
    setButtons(tmpl.buttons || []);
    setTriggerKeywords(tmpl.trigger_keywords || ['demo', 'promo']);
    setIsActive(tmpl.is_active ?? true);
    setFollowUpYes(tmpl.follow_up_yes || '');
    setFollowUpNo(tmpl.follow_up_no || '');
    if (tmpl.buttons && tmpl.buttons.length > 0) {
      const hasCta = tmpl.buttons.some(b => b.type === 'URL' || b.type === 'PHONE_NUMBER');
      setButtonType(hasCta ? 'CALL_TO_ACTION' : 'QUICK_REPLY');
    } else {
      setButtonType('NONE');
    }
  };

  // Delete a template
  const handleDeleteTemplate = async (templateId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this template?')) return;
    try {
      await apiFetch(`/api/whatsapp-bot/templates/${templateId}`, { method: 'DELETE' });
      fetchTemplates();
    } catch (err) {
      console.error('Delete template error:', err);
    }
  };

  // Generate preview text with variables replaced
  const previewBody = () => {
    let result = body;
    Object.keys(variables).forEach(k => {
      const placeholder = `{{${k}}}`;
      const sampleVal = variables[k] || `[${k}]`;
      result = result.split(placeholder).join(sampleVal);
    });
    return result;
  };

  return (
    <div className="space-y-6">
      {/* ── Subheader / Actions Bar ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-[#F2DED6] shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-600" />
            WhatsApp Message Templates
          </h2>
          <p className="text-xs text-gray-500">
            Create, test, and manage Meta-compliant WhatsApp marketing, utility, and interactive message templates.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Starter presets */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-gray-500">Presets:</span>
            {STARTER_TEMPLATES.map((tmpl, idx) => (
              <button
                key={idx}
                onClick={() => handleLoadTemplate(tmpl)}
                className="text-xs px-2.5 py-1 rounded-lg bg-[#FAF9F6] border border-[#F2DED6] text-gray-700 hover:border-emerald-500 hover:text-emerald-700 font-medium transition-colors"
              >
                {tmpl.name.replace(/_/g, ' ')}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              setSelectedTemplateId(null);
              setName('new_template_' + Math.floor(Math.random() * 1000));
              setBody('Hello {{1}}, this is a message from {{2}}.');
              setVariables({ '1': 'Customer', '2': 'Genquantaa' });
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-all shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" /> New Blank Template
          </button>
        </div>
      </div>

      {/* ── Saved Templates Pill Bar (if any) ──────────────────────────────── */}
      {templates.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider pl-1">Your Templates:</span>
          {templates.map(t => (
            <div
              key={t.id || t.name}
              onClick={() => handleLoadTemplate(t)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-all ${
                selectedTemplateId === t.id || name === t.name
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-sm'
                  : 'bg-white border-[#F2DED6] text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span>{t.name}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100/60 text-emerald-700 font-bold uppercase">
                {t.category}
              </span>
              <button
                onClick={e => handleDeleteTemplate(t.id || t.name, e)}
                className="text-gray-400 hover:text-red-500 p-0.5 rounded"
                title="Delete template"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── MAIN CONFIGURATION GRID (Form on Left, Live Preview on Right) ────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Template Form (7 Cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-[#E5E7EB] shadow-sm overflow-hidden">
          
          {/* Header Banner - Emerald Green matched to screenshot */}
          <div className="bg-[#107C41] text-white px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <FileText className="w-5 h-5 text-white" />
              <h3 className="font-bold text-base tracking-wide text-white">Template Configuration</h3>
            </div>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-white/20 text-white">
              Official WhatsApp Schema
            </span>
          </div>

          <div className="p-6 space-y-6">
            {/* 1. Template Name */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                  Template Name
                  <div className="group relative cursor-pointer">
                    <HelpCircle className="w-4 h-4 text-emerald-600" />
                    <div className="absolute left-6 top-0 hidden group-hover:block w-64 p-2 bg-gray-900 text-white text-[11px] rounded-lg shadow-lg z-50">
                      Only lowercase letters, numbers, and underscores are allowed by Meta (e.g. <code>welcome_message_v1</code>).
                    </div>
                  </div>
                </label>
              </div>

              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                placeholder="e.g. welcome_offer_campaign"
                className="w-full px-3.5 py-2.5 rounded-xl border border-emerald-500/60 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-sm font-mono text-gray-900 outline-none transition-all"
              />

              <div className="flex items-center justify-start pt-0.5">
                <button
                  type="button"
                  onClick={() => setShowHelpModal(true)}
                  className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 hover:underline"
                >
                  💡 Template Formatting Help
                </button>
              </div>
            </div>

            {/* 2. Template Language Code */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-800">Template Language Code</label>
              <select
                value={language}
                onChange={e => handleLanguageChange(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-sm text-gray-900 outline-none bg-white transition-all"
              >
                {LANGUAGES.map(l => (
                  <option key={l.code} value={l.label}>
                    {l.label} ({l.code})
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Meta Guidelines Notice Banner (Exact match to screenshot) */}
            <div className="bg-[#107C41] text-white p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-sm">
              <p className="text-xs leading-relaxed text-white font-medium">
                While Authentication and Flow templates are supported for sending however you need to create/edit those templates on Meta.
              </p>
              <a
                href="https://business.facebook.com/wa/manage/message-templates/"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-1.5 rounded-lg bg-black/30 hover:bg-black/40 text-white text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Manage on Meta
              </a>
            </div>

            {/* 4. Category */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-800">Category</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-sm text-gray-900 outline-none bg-white transition-all font-medium"
              >
                <option value="MARKETING">MARKETING — Sales promotions, product intros, automated announcements</option>
                <option value="UTILITY">UTILITY — Order confirmations, account alerts, appointment reminders</option>
                <option value="AUTHENTICATION">AUTHENTICATION — OTPs, security login verification codes</option>
              </select>
            </div>

            {/* 4b. Multi-Bot Trigger Keywords (Run multiple bots simultaneously on the same WhatsApp number!) */}
            <div className="space-y-2 p-4 bg-emerald-50/70 rounded-xl border border-emerald-200">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-bold text-emerald-950 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    Simultaneous Multi-Bot Trigger Keywords
                  </label>
                  <p className="text-xs text-emerald-800/80">
                    When a lead sends any of these keywords to your WhatsApp number, this specific bot/promotion will trigger!
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {triggerKeywords.map(kw => (
                  <span
                    key={kw}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-semibold border border-emerald-300"
                  >
                    #{kw}
                    <button
                      type="button"
                      onClick={() => setTriggerKeywords(prev => prev.filter(k => k !== kw))}
                      className="hover:text-red-600 ml-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>

              <div className="flex gap-2 pt-1">
                <input
                  type="text"
                  value={newKeyword}
                  onChange={e => setNewKeyword(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const val = newKeyword.trim().toLowerCase();
                      if (val && !triggerKeywords.includes(val)) {
                        setTriggerKeywords(prev => [...prev, val]);
                        setNewKeyword('');
                      }
                    }
                  }}
                  placeholder="e.g. promo1, gtm, software, demo"
                  className="flex-1 px-3 py-1.5 rounded-lg border border-emerald-300 text-xs text-gray-900 bg-white outline-none focus:border-emerald-600"
                />
                <button
                  type="button"
                  onClick={() => {
                    const val = newKeyword.trim().toLowerCase();
                    if (val && !triggerKeywords.includes(val)) {
                      setTriggerKeywords(prev => [...prev, val]);
                      setNewKeyword('');
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Keyword
                </button>
              </div>
            </div>

            {/* 5. Header (Optional) */}
            <div className="space-y-3 pt-2 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-gray-800">Header <span className="text-gray-400 font-normal">(Optional)</span></h4>
                  <p className="text-xs text-gray-500">Add a title or rich visual media to capture attention</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-600">Header Type</label>
                <select
                  value={headerType}
                  onChange={e => setHeaderType(e.target.value as any)}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-sm text-gray-900 outline-none bg-white"
                >
                  <option value="NONE">None</option>
                  <option value="TEXT">Text Title</option>
                  <option value="IMAGE">Media: Image</option>
                  <option value="VIDEO">Media: Video</option>
                  <option value="DOCUMENT">Media: PDF Document</option>
                </select>
              </div>

              {headerType === 'TEXT' && (
                <div className="space-y-1.5 pt-1">
                  <label className="text-xs font-medium text-gray-600">Header Text</label>
                  <input
                    type="text"
                    value={headerText}
                    onChange={e => setHeaderText(e.target.value)}
                    placeholder="e.g. Exclusive Spring Announcement 🌸"
                    maxLength={60}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-sm text-gray-900 outline-none focus:border-emerald-500"
                  />
                  <span className="text-[11px] text-gray-400 block text-right">{headerText.length} / 60</span>
                </div>
              )}

              {headerType !== 'NONE' && headerType !== 'TEXT' && (
                <div className="space-y-1.5 pt-1">
                  <label className="text-xs font-medium text-gray-600">Media Public URL ({headerType})</label>
                  <input
                    type="text"
                    value={headerMediaUrl}
                    onChange={e => setHeaderMediaUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/... or public media link"
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-sm text-gray-900 outline-none focus:border-emerald-500"
                  />
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() =>
                        setHeaderMediaUrl(
                          'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=1000&q=80'
                        )
                      }
                      className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200"
                    >
                      Sample Image
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setHeaderMediaUrl(
                          'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1000&q=80'
                        )
                      }
                      className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200"
                    >
                      Analytics Chart
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 6. Body */}
            <div className="space-y-2 pt-2 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-gray-800">Body</h4>
                  <p className="text-xs text-gray-500">Enter the text for your message in the language you've selected.</p>
                </div>
                {/* Variable insertion buttons */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleAddVariable}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Variable
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFormat('*', '*')}
                    className="w-7 h-7 flex items-center justify-center font-bold text-xs bg-gray-100 hover:bg-gray-200 rounded text-gray-700"
                    title="Bold (*text*)"
                  >
                    B
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFormat('_', '_')}
                    className="w-7 h-7 flex items-center justify-center italic font-serif text-xs bg-gray-100 hover:bg-gray-200 rounded text-gray-700"
                    title="Italic (_text_)"
                  >
                    I
                  </button>
                </div>
              </div>

              <textarea
                rows={5}
                value={body}
                onChange={e => setBody(e.target.value)}
                placeholder="Enter your message template body here. Use {{1}}, {{2}} for dynamic names or company details..."
                className="w-full px-3.5 py-3 rounded-xl border border-gray-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-sm text-gray-900 outline-none leading-relaxed"
              />
              <span className="text-[11px] text-gray-400 block text-right">{body.length} / 1024</span>

              {/* Variable Warning & Value Inputs (Exact requirement from screenshot) */}
              {Object.keys(variables).length > 0 && (
                <div className="bg-amber-50/80 border border-amber-200/90 rounded-xl p-3.5 space-y-3">
                  <div className="flex items-start gap-2 text-amber-900 text-xs leading-relaxed font-medium">
                    <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <span>
                      <strong>Important:</strong> When you add variables (1, 2, etc.), you must provide example values below. These are required by WhatsApp for template approval.
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    {Object.keys(variables).map(k => (
                      <div key={k} className="space-y-1">
                        <label className="text-[11px] font-semibold text-gray-700">
                          Sample value for Variable <code>&#123;&#123;{k}&#125;&#125;</code>:
                        </label>
                        <input
                          type="text"
                          value={variables[k]}
                          onChange={e =>
                            setVariables(prev => ({ ...prev, [k]: e.target.value }))
                          }
                          placeholder={`e.g. Value for ${k}`}
                          className="w-full px-3 py-1.5 rounded-lg border border-amber-300 text-xs text-gray-900 bg-white outline-none focus:border-emerald-500"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 7. Footer (Optional) */}
            <div className="space-y-1.5 pt-2 border-t border-gray-200">
              <div>
                <h4 className="text-sm font-semibold text-gray-800">Footer <span className="text-gray-400 font-normal">(Optional)</span></h4>
                <p className="text-xs text-gray-500">Add a short line of text to the bottom of your message template.</p>
              </div>
              <input
                type="text"
                value={footer}
                onChange={e => setFooter(e.target.value)}
                placeholder="e.g. Reply STOP to unsubscribe • Sent via Genquantaa"
                maxLength={60}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm text-gray-900 outline-none focus:border-emerald-500"
              />
              <span className="text-[11px] text-gray-400 block text-right">{footer.length} / 60</span>
            </div>

            {/* 8. Buttons (Optional) */}
            <div className="space-y-3 pt-2 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-gray-800">Buttons <span className="text-gray-400 font-normal">(Optional)</span></h4>
                  <p className="text-xs text-gray-500">Create buttons that let customers respond to your message or take action.</p>
                </div>

                <div className="flex bg-gray-100 p-1 rounded-lg text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => {
                      setButtonType('NONE');
                      setButtons([]);
                    }}
                    className={`px-2.5 py-1 rounded-md transition-colors ${
                      buttonType === 'NONE' ? 'bg-white shadow text-gray-900' : 'text-gray-500'
                    }`}
                  >
                    None
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setButtonType('QUICK_REPLY');
                      if (buttons.length === 0 || buttons.some(b => b.type !== 'QUICK_REPLY')) {
                        setButtons([{ type: 'QUICK_REPLY', text: 'Yes, Interested' }]);
                      }
                    }}
                    className={`px-2.5 py-1 rounded-md transition-colors ${
                      buttonType === 'QUICK_REPLY' ? 'bg-white shadow text-gray-900' : 'text-gray-500'
                    }`}
                  >
                    Quick Reply
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setButtonType('CALL_TO_ACTION');
                      if (buttons.length === 0 || buttons.every(b => b.type === 'QUICK_REPLY')) {
                        setButtons([{ type: 'URL', text: 'Visit Website', url: 'https://genquantaa.com' }]);
                      }
                    }}
                    className={`px-2.5 py-1 rounded-md transition-colors ${
                      buttonType === 'CALL_TO_ACTION' ? 'bg-white shadow text-gray-900' : 'text-gray-500'
                    }`}
                  >
                    Call To Action
                  </button>
                </div>
              </div>

              {buttonType === 'QUICK_REPLY' && (
                <div className="space-y-2.5 bg-gray-50 p-3.5 rounded-xl border border-gray-200">
                  <div className="flex items-center justify-between text-xs text-gray-600 font-medium">
                    <span>Quick Reply Buttons ({buttons.length} / 3)</span>
                    {buttons.length < 3 && (
                      <button
                        type="button"
                        onClick={handleAddQuickReply}
                        className="text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Button
                      </button>
                    )}
                  </div>
                  {buttons.map((btn, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 font-mono w-4">{idx + 1}.</span>
                      <input
                        type="text"
                        value={btn.text}
                        maxLength={25}
                        onChange={e => handleUpdateButton(idx, { text: e.target.value })}
                        placeholder={`Button text (e.g. Yes / No)`}
                        className="flex-1 px-3 py-1.5 rounded-lg border border-gray-300 text-xs text-gray-900 bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveButton(idx)}
                        className="text-gray-400 hover:text-red-500 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {buttonType === 'CALL_TO_ACTION' && (
                <div className="space-y-3 bg-gray-50 p-3.5 rounded-xl border border-gray-200">
                  <div className="flex items-center justify-between text-xs text-gray-600 font-medium">
                    <span>Call To Action Buttons ({buttons.length} / 2)</span>
                    {buttons.length < 2 && (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleAddCtaButton('URL')}
                          className="text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" /> + URL
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddCtaButton('PHONE_NUMBER')}
                          className="text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" /> + Phone
                        </button>
                      </div>
                    )}
                  </div>

                  {buttons.map((btn, idx) => (
                    <div key={idx} className="p-2.5 bg-white rounded-lg border border-gray-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                          {btn.type === 'URL' ? <ArrowUpRight className="w-3.5 h-3.5 text-blue-500" /> : <Phone className="w-3.5 h-3.5 text-emerald-500" />}
                          {btn.type === 'URL' ? 'Visit Website Button' : 'Call Phone Number Button'}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveButton(idx)}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={btn.text}
                          maxLength={25}
                          onChange={e => handleUpdateButton(idx, { text: e.target.value })}
                          placeholder="Button Label (e.g. Visit Website)"
                          className="px-3 py-1.5 rounded-lg border border-gray-300 text-xs text-gray-900"
                        />
                        {btn.type === 'URL' ? (
                          <input
                            type="text"
                            value={btn.url || ''}
                            onChange={e => handleUpdateButton(idx, { url: e.target.value })}
                            placeholder="https://example.com"
                            className="px-3 py-1.5 rounded-lg border border-gray-300 text-xs text-gray-900"
                          />
                        ) : (
                          <input
                            type="text"
                            value={btn.phone_number || ''}
                            onChange={e => handleUpdateButton(idx, { phone_number: e.target.value })}
                            placeholder="+1234567890"
                            className="px-3 py-1.5 rounded-lg border border-gray-300 text-xs text-gray-900"
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-gray-200">
              {onApplyToBot && (
                <button
                  type="button"
                  onClick={() =>
                    onApplyToBot({
                      text: previewBody(),
                      image_url: headerType === 'IMAGE' ? headerMediaUrl : undefined
                    })
                  }
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-emerald-600 text-emerald-700 hover:bg-emerald-50 font-semibold text-sm transition-all flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" /> Use in Bot Flow
                </button>
              )}

              {onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-100 font-semibold text-sm transition-all"
                >
                  Cancel
                </button>
              )}

              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className={`w-full sm:w-auto ml-auto px-6 py-2.5 rounded-xl font-bold text-sm text-white shadow-md transition-all flex items-center justify-center gap-2 ${
                  saveSuccess
                    ? 'bg-emerald-600'
                    : 'bg-[#107C41] hover:bg-[#0E6C38] active:scale-[0.98]'
                }`}
              >
                {saving ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : saveSuccess ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {saving ? 'Saving...' : saveSuccess ? 'Template Saved!' : 'Save Template'}
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: New Template Preview (5 Cols) */}
        <div className="lg:col-span-5 sticky top-6 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-emerald-600" />
              New Template Preview
            </h3>
            <span className="text-xs text-gray-500 font-medium">WhatsApp Customer View</span>
          </div>

          {/* Authentic WhatsApp Container with Background Doodle Pattern */}
          <div
            className="w-full rounded-2xl p-4 sm:p-5 border border-[#D1D5DB] shadow-md relative min-h-[460px] flex flex-col justify-start"
            style={{
              backgroundColor: '#EFEAE2',
              backgroundImage: `radial-gradient(#d5cdc2 1px, transparent 1px), radial-gradient(#d5cdc2 1px, #EFEAE2 1px)`,
              backgroundSize: '24px 24px',
              backgroundPosition: '0 0, 12px 12px'
            }}
          >
            {/* WhatsApp Chat Date Badge */}
            <div className="flex justify-center mb-3">
              <span className="text-[10px] font-semibold uppercase tracking-wider px-3 py-1 rounded-full bg-white/80 backdrop-blur-sm text-gray-600 shadow-sm border border-gray-200">
                Today
              </span>
            </div>

            {/* The WhatsApp Speech Bubble */}
            <div className="max-w-[94%] bg-white rounded-2xl rounded-tl-sm p-3.5 shadow-md border border-gray-200/80 space-y-2 relative">
              {/* Header preview */}
              {headerType === 'TEXT' && headerText && (
                <div className="font-bold text-sm text-gray-900 pb-1 border-b border-gray-100">
                  {headerText}
                </div>
              )}

              {headerType === 'IMAGE' && (
                <div className="rounded-xl overflow-hidden bg-gray-100 border border-gray-200 max-h-48 flex items-center justify-center">
                  {headerMediaUrl ? (
                    <img
                      src={headerMediaUrl}
                      alt="Header Preview"
                      className="w-full h-40 object-cover"
                      onError={e => {
                        (e.currentTarget as any).src =
                          'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=600&q=80';
                      }}
                    />
                  ) : (
                    <div className="py-8 flex flex-col items-center text-gray-400 gap-1 text-xs">
                      <ImageIcon className="w-8 h-8" />
                      <span>Header Image Placeholder</span>
                    </div>
                  )}
                </div>
              )}

              {headerType === 'VIDEO' && (
                <div className="rounded-xl bg-gray-900 text-white p-6 flex flex-col items-center justify-center gap-1.5">
                  <Video className="w-8 h-8 text-emerald-400" />
                  <span className="text-xs font-medium">Video Header Attachment</span>
                </div>
              )}

              {headerType === 'DOCUMENT' && (
                <div className="rounded-xl bg-red-50 border border-red-200 p-3 flex items-center gap-2.5">
                  <FileSpreadsheet className="w-6 h-6 text-red-600" />
                  <div>
                    <div className="text-xs font-bold text-gray-900">Document.pdf</div>
                    <div className="text-[10px] text-gray-500">PDF Document Attachment</div>
                  </div>
                </div>
              )}

              {/* Body Text with Live Variables & Formatting */}
              <div className="text-sm text-gray-900 whitespace-pre-wrap leading-relaxed">
                {previewBody() || 'Your message body will appear here...'}
              </div>

              {/* Footer + Timestamp */}
              <div className="pt-1 flex justify-between items-baseline gap-2">
                <div className="text-[11px] text-gray-500 font-medium">{footer}</div>
                <div className="flex items-center gap-1 text-[10px] text-gray-400 font-medium ml-auto flex-shrink-0">
                  <span>10:42 AM</span>
                  <span className="text-blue-500 font-bold">✓✓</span>
                </div>
              </div>

              {/* Native WhatsApp Buttons (Pill design matching WhatsApp UI) */}
              {buttons.length > 0 && (
                <div className="pt-2 border-t border-gray-100 space-y-1.5 -mx-1">
                  {buttons.map((b, idx) => (
                    <div
                      key={idx}
                      className="w-full py-2 px-3 rounded-xl bg-white border border-gray-200 text-center font-semibold text-xs text-[#0C8CE9] hover:bg-gray-50 transition-colors shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {b.type === 'PHONE_NUMBER' && <Phone className="w-3.5 h-3.5 text-[#0C8CE9]" />}
                      {b.type === 'URL' && <ArrowUpRight className="w-3.5 h-3.5 text-[#0C8CE9]" />}
                      {b.type === 'QUICK_REPLY' && <MessageSquare className="w-3.5 h-3.5 text-[#0C8CE9]" />}
                      <span>{b.text || `Button ${idx + 1}`}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Template Formatting Help Modal ───────────────────────────────────── */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                💡 WhatsApp Template Formatting Guidelines
              </h3>
              <button
                onClick={() => setShowHelpModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-gray-700 leading-relaxed">
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 space-y-1">
                <span className="font-bold text-emerald-900">Variables (Placeholders):</span>
                <p>
                  Use double braces like <code>&#123;&#123;1&#125;&#125;</code>, <code>&#123;&#123;2&#125;&#125;</code> for dynamic customer data. You must provide a sample value for each variable.
                </p>
              </div>

              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-1.5">
                <span className="font-bold text-gray-900">Text Formatting:</span>
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                  <div>*bold* → <strong>bold</strong></div>
                  <div>_italic_ → <em>italic</em></div>
                  <div>~strike~ → <del>strike</del></div>
                  <div>```code``` → <code>code</code></div>
                </div>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 space-y-1">
                <span className="font-bold text-amber-900">Meta Approval Rules:</span>
                <ul className="list-disc pl-4 space-y-0.5">
                  <li>Template names must be lowercase letters, numbers, and underscores only.</li>
                  <li>No emojis or punctuation in template names.</li>
                  <li>Body text cannot exceed 1024 characters.</li>
                  <li>Footer text cannot exceed 60 characters.</li>
                  <li>Quick reply buttons are capped at 3 buttons per message.</li>
                </ul>
              </div>
            </div>

            <button
              onClick={() => setShowHelpModal(false)}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition-colors"
            >
              Got it, close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
