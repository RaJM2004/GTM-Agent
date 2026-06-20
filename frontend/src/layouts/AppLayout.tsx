import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Search, 
  Users, 
  Megaphone, 
  FileText, 
  Phone, 
  BarChart3, 
  CreditCard, 
  Plug,
  Inbox,
  Settings,
  LogOut,
  Menu,
  Hourglass,
  User as UserIcon
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/app', icon: LayoutDashboard },
  { name: 'Inbox', href: '/app/inbox', icon: Inbox },
  { name: 'Lead Discovery', href: '/app/discovery', icon: Search },
  { name: 'Lead Management', href: '/app/leads', icon: Users },
  { name: 'Campaigns', href: '/app/campaigns', icon: Megaphone },
  { name: 'Templates', href: '/app/templates', icon: FileText },
  { name: 'Calls', href: '/app/calls', icon: Phone },
  { name: 'Analytics', href: '/app/analytics', icon: BarChart3 },
  { name: 'Billing', href: '/app/billing', icon: CreditCard },
  { name: 'Integrations', href: '/app/integrations', icon: Plug },
];

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const [time, setTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('en-US', { hour12: true, hour: 'numeric', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden font-sans">
      {/* Top Header */}
      <header className="h-16 flex items-center justify-between px-4 lg:px-6 border-b border-[#EBD3C9] theme-header z-50 fixed w-full shadow-sm">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 bg-white rounded-md shadow-sm hover:bg-gray-50 text-gray-700 transition-colors lg:hidden"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm">
              <Hourglass className="w-5 h-5 text-primary" />
            </div>
            <span className="text-xl font-bold text-gray-900 tracking-tight hidden sm:block">
              Genquantaa <span className="text-primary font-medium">GTM OS</span>
            </span>
          </div>
        </div>
        <div className="flex items-center gap-6 text-xs sm:text-sm font-medium text-gray-700">
          <div className="hidden md:flex items-center gap-2 text-primary font-semibold">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            PLATFORM STATUS: OPTIMAL
          </div>
          <div className="hidden md:block w-px h-4 bg-[#EBD3C9]"></div>
          <div className="hidden md:flex items-center gap-2 text-gray-600 font-mono">
            {time}
          </div>
          <div className="flex items-center gap-2 bg-primary/10 px-3 py-1.5 rounded-full text-primary font-semibold cursor-pointer hover:bg-primary/20 transition-colors">
            <UserIcon className="w-4 h-4" />
            Sales Leader
          </div>
        </div>
      </header>

      <div className="flex flex-1 pt-16 overflow-hidden">
        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <div className={`fixed inset-y-0 left-0 pt-16 lg:pt-0 z-40 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0 lg:flex lg:flex-col w-64 shrink-0 theme-sidebar border-r border-[#EBD3C9] overflow-y-auto transition-transform duration-200 ease-in-out`}>
          <nav className="flex-1 py-6 flex flex-col justify-between h-full">
            <div className="space-y-1">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href || location.pathname === item.href + '/';
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center px-6 py-3 text-sm font-medium transition-colors ${
                      isActive 
                        ? 'theme-active-item border-r-4 border-primary' 
                        : 'theme-inactive-item hover:bg-[#F2DED6]'
                    }`}
                  >
                    <item.icon className={`w-5 h-5 mr-3 ${isActive ? 'text-primary' : 'text-gray-500'}`} />
                    {item.name}
                  </Link>
                );
              })}
            </div>
            
            <div className="space-y-1 pb-4">
              <Link
                to="/app/settings"
                className={`flex items-center px-6 py-3 text-sm font-medium transition-colors ${
                  location.pathname.includes('/settings')
                    ? 'theme-active-item border-r-4 border-primary'
                    : 'theme-inactive-item hover:bg-[#F2DED6]'
                }`}
              >
                <Settings className={`w-5 h-5 mr-3 ${location.pathname.includes('/settings') ? 'text-primary' : 'text-gray-500'}`} />
                Settings
              </Link>
              <Link
                to="/"
                className="flex items-center px-6 py-3 text-sm font-medium theme-inactive-item hover:bg-[#F2DED6] transition-colors"
              >
                <LogOut className="w-5 h-5 mr-3 text-gray-500" />
                Logout
              </Link>
            </div>
          </nav>
        </div>

        {/* Main Content */}
        <main className="flex-1 min-w-0 overflow-y-auto bg-[#FAF9F6] p-4 sm:p-6 lg:p-8 w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
