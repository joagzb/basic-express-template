import {PasswordService, RefreshTokenService, TokenService} from '../infrastructure/security/security.service';

describe('security service foundations', () => {
  test('hashes and compares passwords without exposing the original value', async () => {
    const service = new PasswordService(4);
    const hash = await service.hash('correct horse battery staple');
    expect(hash).not.toContain('correct horse battery staple');
    await expect(service.compare('correct horse battery staple', hash)).resolves.toBe(true);
    await expect(service.compare('wrong', hash)).resolves.toBe(false);
  });

  test('signs and verifies JWT subjects', () => {
    const service = new TokenService('test-secret-at-least-thirty-two-characters', 60);
    const token = service.sign('user-id', 'session-id');
    expect(service.verify(token)).toMatchObject({sub: 'user-id', sid: 'session-id', tokenUse: 'access'});
  });

  test('issues opaque random refresh tokens and stable digests without storing plaintext', () => {
    const service = new RefreshTokenService();
    const first = service.issue();
    const rotated = service.issue(first.sessionId);

    expect(first.value).not.toBe(rotated.value);
    expect(first.digest).toBe(service.digest(first.value));
    expect(first.digest).not.toContain(first.value);
    expect(service.sessionId(first.value)).toBe(first.sessionId);
  });
});
