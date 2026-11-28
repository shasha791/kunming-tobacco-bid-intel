"use strict";
const fs = require("node:fs/promises");
const path = require("node:path");
const https = require("node:https");
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
        // 记录底层网络原因（ENOTFOUND/ECONNREFUSED/ETIMEDOUT/CERT...）用于定位云端零结果
        const cause = error.cause && (error.cause.code || error.cause.message) || "";
        this.requestLog.push({ url, tag, status: error.status || 0, error: error.message, cause: String(cause), at: new Date().toISOString() });
        // DNS 临时失败时启用公开 DoH 兜底（仅公开页面）
        if (/EAI_AGAIN|ENOTFOUND/.test(String(cause)) && method === "GET") {
          const fallback = await this.fetchViaIp(url, { tag, headers });
          if (fallback.ok) return fallback;
        }
        if (attempt <= this.maxRetries && (!error.status || error.status >= 500)) {
          await sleep(this.backoffMs * attempt);
        }
      } finally {
        clearTimeout(timer);
      }
    }
    return { ok: false, error: lastError?.message || "请求失败", status: lastError?.status || 0 };
  }

  /**
   * DNS 应急解析：GitHub Actions runner 对部分国内域名 EAI_AGAIN，
   * 用公开 DNS-over-HTTPS 取 A 记录，再用 https.request 显式指定 IP + SNI，
   * 只访问公开页面，不登录、不绕验证码。
   */
  async resolveViaDoh(hostname) {
    const endpoints = [
      `https://223.5.5.5/resolve?name=${encodeURIComponent(hostname)}&type=A`,
      `https://doh.pub/dns-query?name=${encodeURIComponent(hostname)}&type=A`
    ];
    for (const endpoint of endpoints) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 8000);
        const res = await fetch(endpoint, { headers: { accept: "application/dns-json" }, signal: controller.signal });
        clearTimeout(timer);
        if (!res.ok) continue;
        const json = await res.json();
        const ip = (json.Answer || []).find((a) => a.type === 1 && /^\d+\.\d+\.\d+\.\d+$/.test(a.data))?.data;
        if (ip) return ip;
      } catch {}
    }
    return null;
  }

  async fetchViaIp(url, options = {}) {
    const u = new URL(url);
    const ip = await this.resolveViaDoh(u.hostname);
    if (!ip) return { ok: false, status: 0, error: "DoH 解析失败" };
    return new Promise((resolve) => {
      const req = https.request({
        host: ip, port: 443, method: options.method || "GET",
        path: u.pathname + u.search,
        servername: u.hostname,
        headers: { host: u.hostname, "user-agent": this.userAgent, ...(options.headers || {}) },
        timeout: this.timeoutMs
      }, (res) => {
        let text = "";
        res.setEncoding("utf8");
        res.on("data", (c) => text += c);
        res.on("end", () => {
          this.requestLog.push({ url, tag: options.tag || "doh", status: res.statusCode, viaDoh: true, at: new Date().toISOString() });
          resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, text, status: res.statusCode, viaDoh: true });
        });
      });
      req.on("timeout", () => { req.destroy(new Error("timeout")); });
      req.on("error", (e) => {
        this.requestLog.push({ url, tag: options.tag || "doh", status: 0, error: e.message, at: new Date().toISOString() });
        resolve({ ok: false, status: 0, error: `DoH fallback: ${e.message}` });
      });
      if (options.body) req.write(JSON.stringify(options.body));
      req.end();
    });
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
