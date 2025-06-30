import crypto from 'crypto';

export class AuthUtils {
  static generateCodeVerifier(): string {
    return crypto.randomBytes(64)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  static async generateCodeChallenge(verifier: string): Promise<string> {
    const hash = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(verifier)
    );
    return btoa(String.fromCharCode(...new Uint8Array(hash)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  static generateState(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}