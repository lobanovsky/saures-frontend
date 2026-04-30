const API_BASE = 'http://localhost:8080';

async function request(method, path, body) {
  const options = { method };
  if (body != null) {
    options.headers = { 'Content-Type': 'application/json' };
    options.body = JSON.stringify(body);
  }

  const res = await fetch(API_BASE + path, {
    ...options,
  });

  if (!res.ok) {
    let err;
    try { err = await res.json(); } catch { err = {}; }
    throw new Error(err.error || err.message || `HTTP ${res.status}`);
  }

  if (res.status === 204) return null;
  return res.json();
}

const api = {
  get:  (path)       => request('GET',  path),
  post: (path, body) => request('POST', path, body),
};
