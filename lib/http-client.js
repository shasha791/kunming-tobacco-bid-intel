"use strict";
const fs = require("node:fs/promises");
const path = require("node:path");
const { hashText, sleep } = require("./text-utils");
const config = require("../config/sources.json");

const policy = config.collectionPolicy || {};

class HttpClient {
  constructor(options = {}) {
    this.timeoutMs = options.timeoutMs || policy.timeoutMs || 20000;
    this.maxRetries = options.maxRetries ?? (policy.maxRetries ?? 1);
    this.intervalMs = options.requestIntervalMs || policy.requestIntervalMs || 1500;
    this.backoffMs = options.backoffMs || policy.backoffMs || 3000;
    this.userAgent = options.userAgent || policy.userAgent || "tobacco-bid-intel/1.0";
    this.cacheDir = options.cacheDir || null;
    this.lastRequestAt = 0;
    this.requestLog = [];
  }

  async wait() {
    const elapsed = Date.now() - this.lastRequestAt;
    if (elapsed < this.intervalMs) await sleep(this.intervalMs - elapsed);
    this.lastRequestAt = Date.now();
  }

  async cachePath(url) {
    if (!this.cacheDir) return null;
    return path.join(this.cacheDir, `${hashText(url)}.txt`);
  }

  async fetch(url, options = {}) {
    const { method = "GET", body = null, headers = {}, useCache = false, tag = "" } = options;
    if (useCache && this.cacheDir) {
      try {
        const cached = await fs.readFile(await this.cachePath(url), "utf8");
        return { ok: true, text: cached, fromCache: true, status: 200 };
      } catch { /* 无缓存则联网 */ }
    }
    let lastError = null;
    for (let attempt = 1; attempt <= this.maxRetries + 1; attempt += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        await this.wait();
        const response = await fetch(url, {
          method,
          headers: { "user-agent": this.userAgent, ...headers },
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal
        });
        if (!response.ok) {
          const error = new Error(`HTTP ${response.status} ${response.statusText}`);
          error.status = response.status;
          throw error;
        }
        const text = await response.text();
        this.requestLog.push({ url, tag, status: response.status, at: new Date().toISOString() });
        if (useCache && this.cacheDir) {
          await fs.mkdir(this.cacheDir, { recursive: true });
          await fs.writeFile(await this.cachePath(url), text, "utf8");
        }
        return { ok: true, text, fromCache: false, status: response.status };
      } catch (error) {
        lastError = error;
        this.requestLog.push({ url, tag, status: error.status || 0, error: error.message, at: new Date().toISOString() });
        if (attempt <= this.maxRetries && (!error.status || error.status >= 500)) {
          await sleep(this.backoffMs * attempt);
        }
      } finally {
        clearTimeout(timer);
      }
    }
    return { ok: false, error: lastError?.message || "请求失败", status: lastError?.status || 0 };
  }

  async fetchJson(url, options = {}) {
    const result = await this.fetch(url, { ...options, headers: { "content-type": "application/json", ...(options.headers || {}) } });
    if (!result.ok) return result;
    try {
      return { ...result, json: JSON.parse(result.text) };
    } catch (error) {
      return { ok: false, error: `JSON解析失败: ${error.message}`, status: result.status };
    }
  }
}

module.exports = { HttpClient };
