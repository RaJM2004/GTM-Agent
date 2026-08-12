const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    // If we are running on the production Azure URL
    if (window.location.hostname.includes('azurestaticapps.net') || window.location.hostname.includes('green-dune')) {
      return 'https://gtm-backend1-hmgygeahadebdyc7.canadacentral-01.azurewebsites.net';
    }
  }
  return import.meta.env.VITE_API_URL || 'http://localhost:8000';
};

const BASE_URL = getBaseUrl();

interface RequestOptions extends RequestInit {
  bodyData?: any;
}

export async function apiFetch(path: string, options: RequestOptions = {}): Promise<any> {
  const url = path.startsWith('http') ? path : `${BASE_URL}${path}`;
  
  // Ensure cookies are sent
  options.credentials = options.credentials || 'include';
  
  // Prepare headers
  const headers = { ...options.headers } as Record<string, string>;
  
  // Retrieve token from localStorage and set as Authorization header
  const token = typeof window !== 'undefined' ? localStorage.getItem('gtm_access_token') : null;
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  if (options.bodyData) {
    options.body = JSON.stringify(options.bodyData);
    headers['Content-Type'] = 'application/json';
  }
  
  options.headers = headers;

  let response = await fetch(url, options);

  // If unauthorized (401), try to refresh token
  if (
    response.status === 401 &&
    !path.includes('/auth/refresh') &&
    !path.includes('/auth/login') &&
    !path.includes('/auth/register') &&
    !path.includes('/auth/google')
  ) {
    try {
      const refreshHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('gtm_refresh_token') : null;
      if (refreshToken) {
        refreshHeaders['Authorization'] = `Bearer ${refreshToken}`;
      }
      
      const refreshRes = await fetch(`${BASE_URL}/api/v1/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: refreshHeaders
      });

      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        if (refreshData.access_token && typeof window !== 'undefined') {
          localStorage.setItem('gtm_access_token', refreshData.access_token);
        }
        
        // Retry original request with new token
        const newHeaders = { ...options.headers } as Record<string, string>;
        newHeaders['Authorization'] = `Bearer ${refreshData.access_token}`;
        options.headers = newHeaders;
        
        response = await fetch(url, options);
      } else {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('gtm_access_token');
          localStorage.removeItem('gtm_refresh_token');
        }
        window.dispatchEvent(new CustomEvent('auth-failed'));
      }
    } catch (err) {
      window.dispatchEvent(new CustomEvent('auth-failed'));
    }
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Request failed with status ${response.status}`);
  }

  // Handle empty or text responses
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    const data = await response.json();
    
    // Automatically capture tokens returned from auth endpoints
    if (data && typeof window !== 'undefined') {
      if (data.access_token) {
        localStorage.setItem('gtm_access_token', data.access_token);
      }
      if (data.refresh_token) {
        localStorage.setItem('gtm_refresh_token', data.refresh_token);
      }
    }
    
    return data;
  }
  return response.text();
}
