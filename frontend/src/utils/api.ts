const BASE_URL = 'http://localhost:8000';

interface RequestOptions extends RequestInit {
  bodyData?: any;
}

export async function apiFetch(path: string, options: RequestOptions = {}): Promise<any> {
  const url = path.startsWith('http') ? path : `${BASE_URL}${path}`;
  
  // Ensure cookies are sent (for HttpOnly JWT tokens)
  options.credentials = options.credentials || 'include';
  
  if (options.bodyData) {
    options.body = JSON.stringify(options.bodyData);
    options.headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
  }

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
      const refreshRes = await fetch(`${BASE_URL}/api/v1/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });

      if (refreshRes.ok) {
        // Retry original request
        response = await fetch(url, options);
      } else {
        // Dispath logout event so AuthContext can clean up state and redirect
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
    return response.json();
  }
  return response.text();
}
