import { User, Bell, Lock, Globe, Palette } from 'lucide-react';

export default function Settings() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Settings</h1>
        <p className="text-sm text-gray-500">Manage your account preferences and system settings.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Settings Navigation */}
        <div className="w-full md:w-64 shrink-0">
          <nav className="flex flex-col gap-1">
            <button className="flex items-center px-4 py-2.5 bg-[#FDF8F5] text-primary font-medium rounded-lg transition-colors border border-[#F2DED6]">
              <User className="w-4 h-4 mr-3" /> Profile
            </button>
            <button className="flex items-center px-4 py-2.5 text-gray-600 hover:bg-gray-50 hover:text-gray-900 font-medium rounded-lg transition-colors border border-transparent">
              <Bell className="w-4 h-4 mr-3" /> Notifications
            </button>
            <button className="flex items-center px-4 py-2.5 text-gray-600 hover:bg-gray-50 hover:text-gray-900 font-medium rounded-lg transition-colors border border-transparent">
              <Lock className="w-4 h-4 mr-3" /> Security
            </button>
            <button className="flex items-center px-4 py-2.5 text-gray-600 hover:bg-gray-50 hover:text-gray-900 font-medium rounded-lg transition-colors border border-transparent">
              <Globe className="w-4 h-4 mr-3" /> Workspace
            </button>
            <button className="flex items-center px-4 py-2.5 text-gray-600 hover:bg-gray-50 hover:text-gray-900 font-medium rounded-lg transition-colors border border-transparent">
              <Palette className="w-4 h-4 mr-3" /> Appearance
            </button>
          </nav>
        </div>

        {/* Settings Content */}
        <div className="flex-1 bg-white rounded-xl border border-[#F2DED6] shadow-sm overflow-hidden">
          <div className="p-6 border-b border-[#F2DED6]">
            <h2 className="text-lg font-bold text-gray-900">Profile Information</h2>
            <p className="text-sm text-gray-500">Update your account details and public profile.</p>
          </div>
          
          <div className="p-6 space-y-6">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold border border-primary/20">
                SL
              </div>
              <div>
                <button className="bg-white border border-[#F2DED6] hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg font-medium text-sm transition-colors shadow-sm mb-2">
                  Change Avatar
                </button>
                <p className="text-xs text-gray-500">JPG, GIF or PNG. 1MB max.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900">First Name</label>
                <input type="text" defaultValue="Sales" className="w-full bg-white border border-[#F2DED6] rounded-lg py-2 px-3 text-sm text-gray-900 focus:ring-1 focus:ring-primary focus:border-primary outline-none shadow-sm" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900">Last Name</label>
                <input type="text" defaultValue="Leader" className="w-full bg-white border border-[#F2DED6] rounded-lg py-2 px-3 text-sm text-gray-900 focus:ring-1 focus:ring-primary focus:border-primary outline-none shadow-sm" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-gray-900">Email Address</label>
                <input type="email" defaultValue="sales@genquantaa.com" className="w-full bg-gray-50 border border-[#F2DED6] rounded-lg py-2 px-3 text-sm text-gray-500 outline-none shadow-sm cursor-not-allowed" disabled />
                <p className="text-xs text-gray-500">To change your email, contact support.</p>
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-gray-900">Role</label>
                <select className="w-full bg-white border border-[#F2DED6] rounded-lg py-2 px-3 text-sm text-gray-900 focus:ring-1 focus:ring-primary focus:border-primary outline-none shadow-sm">
                  <option>Admin</option>
                  <option>Manager</option>
                  <option>Agent</option>
                </select>
              </div>
            </div>
          </div>

          <div className="p-6 border-t border-[#F2DED6] bg-gray-50 flex justify-end gap-3">
            <button className="bg-white border border-[#F2DED6] hover:bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-medium text-sm transition-colors shadow-sm">
              Cancel
            </button>
            <button className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors shadow-sm">
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
