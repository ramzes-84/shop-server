import { Injectable } from '@nestjs/common';
import fetch from 'node-fetch';
import type { Response } from 'node-fetch';
import { ServicesUrl } from 'src/types/services-url';
import type {
  GetOrderStatusRequestItem,
  GetOrderStatusResponseItem,
} from './dto/get-order-status.dto';

@Injectable()
export class FiveService {
  private readonly apiKey = process.env.FIVE_POST_API_KEY;
  private readonly endpoint = ServicesUrl.FIVE_POST;

  private jwtToken: string | null = null;
  private expiresAt: number | null = null;
  private lastTokenFetchAt = 0;
  private tokenFetchInProgress: Promise<void> | null = null;

  private readonly TOKEN_MIN_INTERVAL_MS = 50 * 60 * 1000;
  private readonly REFRESH_BEFORE_MS = 5 * 60 * 1000;

  /**
   * Returns a valid JWT Bearer token. Will refresh if token is missing or close to expiry.
   * Respects the rule: do not request a new token more often than once every 50 minutes.
   */
  public async getToken(forceRefresh = false): Promise<string> {
    const now = Date.now();

    if (
      this.jwtToken &&
      this.expiresAt &&
      now < this.expiresAt - this.REFRESH_BEFORE_MS
    ) {
      return this.jwtToken;
    }

    if (this.tokenFetchInProgress) {
      await this.tokenFetchInProgress;
      if (this.jwtToken) return this.jwtToken;
    }

    if (
      !forceRefresh &&
      now - this.lastTokenFetchAt < this.TOKEN_MIN_INTERVAL_MS
    ) {
      if (this.jwtToken && this.expiresAt && now < this.expiresAt) {
        return this.jwtToken;
      }
      throw new Error(
        'Token refresh attempted too frequently; wait before requesting a new token',
      );
    }

    this.tokenFetchInProgress = this.fetchNewToken();
    try {
      await this.tokenFetchInProgress;
      if (!this.jwtToken) throw new Error('Failed to obtain JWT');
      return this.jwtToken;
    } finally {
      this.tokenFetchInProgress = null;
    }
  }

  /**
   * Fetches a new token from Five Post and updates local cache.
   */
  private async fetchNewToken(): Promise<void> {
    if (!this.apiKey) throw new Error('FIVE_POST_API_KEY is not configured');

    const url = `${this.endpoint}/jwt-generate-claims/rs256/1?apikey=${this.apiKey}`;
    const body = 'subject=OpenAPI&audience=A122019!';

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body,
    });

    this.lastTokenFetchAt = Date.now();

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to fetch token: ${res.status} ${text}`);
    }

    const json = await res.json();
    if (!json || !json.jwt)
      throw new Error('Invalid token response: missing jwt');

    this.jwtToken = json.jwt;

    // Try to parse exp from JWT payload. If parsing fails, default to 1 hour from now.
    try {
      const parts = this.jwtToken.split('.');
      if (parts.length >= 2) {
        const payload = JSON.parse(
          Buffer.from(
            parts[1].replace(/-/g, '+').replace(/_/g, '/'),
            'base64',
          ).toString('utf8'),
        );
        if (payload && payload.exp) {
          this.expiresAt = payload.exp * 1000;
        } else {
          this.expiresAt = Date.now() + 60 * 60 * 1000;
        }
      } else {
        this.expiresAt = Date.now() + 60 * 60 * 1000;
      }
    } catch {
      this.expiresAt = Date.now() + 60 * 60 * 1000;
    }
  }

  /**
   * Helper to perform authenticated requests to Five Post. On receiving a 401 with
   * text "Invalid or Expired token" will try to refresh the token (respecting
   * the 50-minute rule) and retry once.
   */
  public async requestWithAuth(
    path: string,
    options: any = {},
  ): Promise<Response> {
    const token = await this.getToken();
    const url = `${this.endpoint}${path}`;

    const headers = {
      ...(options.headers || {}),
      authorization: `Bearer ${token}`,
    };
    let res = await fetch(url, { ...options, headers });

    if (res.status === 401) {
      const text = await res.text();
      if (text.includes('Invalid or Expired token')) {
        this.jwtToken = null;
        try {
          await this.getToken(true);
        } catch (err) {
          throw new Error(`Token refresh failed after 401: ${err.message}`);
        }

        const retryToken = this.jwtToken!;
        const retryHeaders = {
          ...(options.headers || {}),
          authorization: `Bearer ${retryToken}`,
        };
        res = await fetch(url, { ...options, headers: retryHeaders });
      }
    }

    return res;
  }

  /**
   * Get statuses for multiple orders by senderOrderId.
   * - Uses local in-memory cache to avoid requesting the same senderOrderId more than once per hour
   * - Respects API responses (429) by throwing an explicit error
   */
  public async getOrderStatus(
    senderOrderIds: string[],
  ): Promise<GetOrderStatusResponseItem[]> {
    if (!Array.isArray(senderOrderIds))
      throw new Error('senderOrderIds must be an array');
    if (senderOrderIds.length === 0) return [];
    // Local cache: map senderOrderId -> { updatedAt: ms, data }
    if (!(this as any)._statusCache)
      (this as any)._statusCache = new Map<
        string,
        { updatedAt: number; data: any }
      >();
    const cache: Map<string, { updatedAt: number; data: any }> = (this as any)
      ._statusCache;

    const now = Date.now();
    const oneHourMs = 60 * 60 * 1000;

    // Split ids into those we can return from cache and those we need to fetch
    const toFetch: string[] = [];

    for (const id of senderOrderIds) {
      const entry = cache.get(id);
      if (entry && now - entry.updatedAt < oneHourMs) {
      } else {
        toFetch.push(id);
      }
    }

    let fetched: any[] = [];
    if (toFetch.length > 0) {
      const path = '/api/v1/getOrderStatus';
      const options = {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(
          toFetch.map(
            (senderOrderId) => ({ senderOrderId }) as GetOrderStatusRequestItem,
          ),
        ),
      };

      const res = await this.requestWithAuth(path, options);

      if (res.status === 429) {
        throw new Error(
          'Rate limit exceeded when requesting order status (429)',
        );
      }

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Failed to get order status: ${res.status} ${text}`);
      }

      fetched = (await res.json()) as GetOrderStatusResponseItem[];

      for (const item of fetched) {
        if (item && item.senderOrderId) {
          cache.set(item.senderOrderId, { updatedAt: Date.now(), data: item });
        }
      }
    }

    const combined = senderOrderIds
      .map((id) => {
        const c = cache.get(id);
        return c ? c.data : null;
      })
      .filter((x): x is GetOrderStatusResponseItem => x !== null);

    return combined;
  }
}
