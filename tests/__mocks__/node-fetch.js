// Mock node-fetch for Jest testing
const fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    statusText: 'OK',
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
    blob: () => Promise.resolve(new Blob()),
    arrayBuffer: () => Promise.resolve(new ArrayBuffer()),
    headers: new Map(),
    url: 'https://example.com'
  })
);

// Mock Response class
class Response {
  constructor(body, init = {}) {
    this.ok = init.status >= 200 && init.status < 300;
    this.status = init.status || 200;
    this.statusText = init.statusText || 'OK';
    this.headers = new Map(Object.entries(init.headers || {}));
    this.url = init.url || '';
    this._body = body;
  }

  async json() {
    return typeof this._body === 'string' ? JSON.parse(this._body) : this._body;
  }

  async text() {
    return typeof this._body === 'string' ? this._body : JSON.stringify(this._body);
  }

  async blob() {
    return new Blob([this._body]);
  }

  async arrayBuffer() {
    return new ArrayBuffer();
  }
}

// Mock Request class
class Request {
  constructor(input, init = {}) {
    this.url = typeof input === 'string' ? input : input.url;
    this.method = init.method || 'GET';
    this.headers = new Map(Object.entries(init.headers || {}));
    this.body = init.body;
  }
}

// Mock Headers class
class Headers {
  constructor(init = {}) {
    this._headers = new Map();
    if (init) {
      Object.entries(init).forEach(([key, value]) => {
        this._headers.set(key.toLowerCase(), value);
      });
    }
  }

  get(name) {
    return this._headers.get(name.toLowerCase());
  }

  set(name, value) {
    this._headers.set(name.toLowerCase(), value);
  }

  has(name) {
    return this._headers.has(name.toLowerCase());
  }

  delete(name) {
    this._headers.delete(name.toLowerCase());
  }

  *[Symbol.iterator]() {
    for (const [key, value] of this._headers) {
      yield [key, value];
    }
  }
}

fetch.Response = Response;
fetch.Request = Request;
fetch.Headers = Headers;

module.exports = fetch; 