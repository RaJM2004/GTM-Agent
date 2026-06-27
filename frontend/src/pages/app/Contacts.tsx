import { useState, useEffect, useRef } from 'react';
import { Search, Filter, Download, Plus, MoreHorizontal, UserCircle, Building2, Phone, Mail, FolderOpen, ChevronDown, ChevronRight, Loader2, Trash2, Users, Globe, ExternalLink, RefreshCw, Folder, Upload, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Contact {
  name: string;
  title: string;
  company: string;
  email: string;
  phone: string;
  linkedin_url: string;
  website: string;
  location: string;
  industry: string;
  confidence: number;
  source: string;
  list_name: string;
}

interface ContactGroup {
  list_name: string;
  contact_count: number;
  contacts: Contact[];
}

export default function Contacts() {
  const navigate = useNavigate();
  const [contactGroups, setContactGroups] = useState<ContactGroup[]>([]);
  const [totalContacts, setTotalContacts] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedLists, setExpandedLists] = useState<Set<string>>(new Set());
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState<string | null>(null);
  
  // Upload & Mapping State
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [columnMap, setColumnMap] = useState<Record<string, string>>({
    name: '', title: '', company: '', email: '', phone: '', linkedin_url: '', location: '', industry: ''
  });

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:8000/api/contacts');
      const data = await res.json();
      if (data.success) {
        setContactGroups(data.contact_groups || []);
        setTotalContacts(data.total_contacts || 0);
      }
    } catch (err) {
      console.error('Failed to fetch contacts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchContacts(); }, []);

  const handleExportCSV = async (listName?: string) => {
    try {
      const url = listName 
        ? `http://localhost:8000/api/contacts/export?list_name=${encodeURIComponent(listName)}`
        : 'http://localhost:8000/api/contacts/export';
      const res = await fetch(url);
      const blob = await res.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `contacts_${listName || 'all'}_${new Date().toISOString().slice(0,10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Failed to export contacts');
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      alert('Please upload a CSV file. Excel files should be saved as CSV first.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setPendingFile(file);
    setUploading(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('http://localhost:8000/api/contacts/analyze', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCsvHeaders(data.headers);
        
        // Auto-suggest mappings based on backend response or simple matching
        const initialMap: Record<string, string> = {
            name: '', title: '', company: '', email: '', phone: '', linkedin_url: '', location: '', industry: ''
        };
        const lowerHeaders = data.headers.map((h: string) => h.toLowerCase());
        
        const findMatch = (keywords: string[]) => {
            const idx = lowerHeaders.findIndex((h: string) => keywords.some(k => h.includes(k)));
            return idx >= 0 ? data.headers[idx] : '';
        };

        initialMap.name = findMatch(['name', 'first', 'last']);
        initialMap.title = findMatch(['title', 'role', 'position']);
        initialMap.company = findMatch(['company', 'organization']);
        initialMap.email = findMatch(['email']);
        initialMap.phone = findMatch(['phone', 'mobile']);
        initialMap.linkedin_url = findMatch(['linkedin', 'url']);
        initialMap.location = findMatch(['location', 'city', 'country']);
        initialMap.industry = findMatch(['industry', 'sector']);

        setColumnMap(initialMap);
        setShowMappingModal(true);
      } else {
        alert(data.detail || 'Failed to analyze file.');
      }
    } catch (err) {
      console.error('Analysis failed:', err);
      alert('An error occurred while analyzing the file.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const confirmUpload = async () => {
    if (!pendingFile) return;
    setUploading(true);
    
    const formData = new FormData();
    formData.append('file', pendingFile);
    formData.append('mapping', JSON.stringify(columnMap));

    try {
      const res = await fetch('http://localhost:8000/api/contacts/upload-mapped', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert(data.message);
        setShowMappingModal(false);
        setPendingFile(null);
        fetchContacts();
      } else {
        alert(data.detail || 'Failed to import contacts.');
      }
    } catch (err) {
      console.error('Upload failed:', err);
      alert('An error occurred while uploading.');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteList = async (listName: string) => {
    if (!confirm(`Delete all contacts in "${listName}"? This cannot be undone.`)) return;
    setDeleting(listName);
    try {
      const res = await fetch(`http://localhost:8000/api/contacts/list/${encodeURIComponent(listName)}`, { method: 'DELETE' });
      if (res.ok) {
        fetchContacts();
      }
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setDeleting(null);
    }
  };

  const filteredGroups = contactGroups.map(group => ({
    ...group,
    contacts: group.contacts.filter(contact => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        contact.name.toLowerCase().includes(q) ||
        contact.company.toLowerCase().includes(q) ||
        contact.email.toLowerCase().includes(q) ||
        contact.title.toLowerCase().includes(q) ||
        contact.location.toLowerCase().includes(q)
      );
    })
  })).filter(g => g.contacts.length > 0);

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            Imported Contacts
            <span className="text-sm font-medium px-2.5 py-1 bg-primary/10 text-primary rounded-full">
              {totalContacts} Total
            </span>
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Map and manage your uploaded contact sheets.
          </p>
        </div>
        <div className="flex gap-2">
          <input 
            type="file" 
            accept=".csv" 
            ref={fileInputRef} 
            onChange={handleFileSelect} 
            className="hidden" 
          />
          <button 
            onClick={() => fileInputRef.current?.click()} 
            disabled={uploading}
            className="flex items-center px-3 py-2 bg-primary hover:bg-primary/90 text-white text-sm rounded-lg transition-colors shadow-sm disabled:opacity-50 font-medium"
          >
            {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
            {uploading ? 'Processing...' : 'Upload Sheet (CSV)'}
          </button>
          <button 
            onClick={() => fetchContacts()} 
            className="flex items-center px-3 py-2 bg-white border border-[#F2DED6] text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
          >
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
          </button>
        </div>
      </div>

      <div className="relative w-full sm:w-72">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search contacts..."
          className="w-full bg-white border border-[#F2DED6] rounded-lg py-2 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:ring-1 focus:ring-primary focus:border-primary outline-none shadow-sm"
        />
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : totalContacts === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4 max-w-md">
            <h3 className="text-lg font-semibold text-gray-900">No Sheets Uploaded</h3>
            <p className="text-sm text-gray-500">
              Upload a CSV file to map your columns and securely manage your contacts here.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 space-y-4 overflow-y-auto pb-4">
          {filteredGroups.map((group) => {
            const isExpanded = expandedLists.has(group.list_name);
            const allKeys = group.contacts.map((_l, i) => `${group.list_name}-${i}`);
            const allSelected = allKeys.length > 0 && allKeys.every(k => selectedContacts.has(k));

            return (
              <div key={group.list_name} className="bg-white rounded-xl border border-[#F2DED6] overflow-hidden shadow-sm">
                <div 
                  className={`flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-[#FDF8F5] transition-colors border-b ${isExpanded ? 'border-[#F2DED6]' : 'border-transparent'}`}
                  onClick={() => {
                    const newExpanded = new Set(expandedLists);
                    if (newExpanded.has(group.list_name)) {
                      newExpanded.delete(group.list_name);
                    } else {
                      newExpanded.add(group.list_name);
                    }
                    setExpandedLists(newExpanded);
                  }}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      {isExpanded ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
                      <div className={`w-10 h-10 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center text-lg`}>
                        <Folder className="w-5 h-5 text-gray-500" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-gray-900">{group.list_name}</h3>
                      <p className="text-xs text-gray-500">{group.contact_count} mapped contacts</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleExportCSV(group.list_name)}
                      className="flex items-center px-3 py-1.5 bg-white border border-[#F2DED6] text-gray-600 text-xs rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
                    >
                      <Download className="w-3.5 h-3.5 mr-1.5" /> CSV
                    </button>
                    <button 
                      onClick={() => handleDeleteList(group.list_name)}
                      disabled={deleting === group.list_name}
                      className="flex items-center px-3 py-1.5 bg-red-50 text-red-600 border border-red-100 text-xs rounded-lg hover:bg-red-100 transition-colors shadow-sm disabled:opacity-50"
                    >
                      {deleting === group.list_name ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5 mr-1.5" />}
                      Delete Sheet
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="bg-[#FDF8F5]/30 overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-gray-50/50 text-gray-500 text-xs uppercase font-medium border-b border-[#F2DED6]">
                          <tr>
                            <th className="px-6 py-3 font-medium">Contact</th>
                            <th className="px-6 py-3 font-medium">Company</th>
                            <th className="px-6 py-3 font-medium">Contact Info</th>
                            <th className="px-6 py-3 font-medium">Location</th>
                            <th className="px-6 py-3 font-medium">Industry</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#F2DED6]">
                          {group.contacts.map((contact, idx) => (
                              <tr key={idx} className={`hover:bg-white transition-colors`}>
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-3">
                                    <div className={`w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0`}>
                                      {contact.name ? contact.name.charAt(0).toUpperCase() : '?'}
                                    </div>
                                    <div>
                                      <div className="font-semibold text-gray-900">{contact.name || '—'}</div>
                                      <div className="text-gray-500 text-xs mt-0.5">{contact.title || '—'}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-2">
                                    <Building2 className="w-4 h-4 text-gray-400" />
                                    <span className="text-gray-700">{contact.company || '—'}</span>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-gray-600 text-xs">
                                      <Mail className="w-3.5 h-3.5 text-gray-400" /> {contact.email || '—'}
                                    </div>
                                    <div className="flex items-center gap-2 text-gray-600 text-xs">
                                      <Phone className="w-3.5 h-3.5 text-gray-400" /> {contact.phone || '—'}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-2 text-gray-600">
                                    <Globe className="w-4 h-4 text-gray-400" />
                                    <span>{contact.location || '—'}</span>
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-gray-600">
                                  {contact.industry || '—'}
                                </td>
                              </tr>
                          ))}
                        </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Column Mapping Modal */}
      {showMappingModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full flex flex-col shadow-xl">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Map Columns</h2>
                <p className="text-sm text-gray-500 mt-1">Match your sheet's columns to our standard format.</p>
              </div>
              <button onClick={() => setShowMappingModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                {Object.keys(columnMap).map((key) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">
                      {key.replace('_', ' ')} {key === 'name' || key === 'email' ? '*' : ''}
                    </label>
                    <select 
                      className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white text-sm"
                      value={columnMap[key]}
                      onChange={(e) => setColumnMap({...columnMap, [key]: e.target.value})}
                    >
                      <option value="">-- Ignore --</option>
                      {csvHeaders.map(header => (
                        <option key={header} value={header}>{header}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 rounded-b-xl">
              <button 
                onClick={() => setShowMappingModal(false)}
                className="px-4 py-2 text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
              >
                Cancel
              </button>
              <button 
                onClick={confirmUpload}
                disabled={uploading}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50 flex items-center font-medium text-sm"
              >
                {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {uploading ? 'Importing...' : 'Confirm & Import'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
