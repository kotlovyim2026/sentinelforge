import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Auth System (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    prisma = app.get<PrismaService>(PrismaService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clean up database before each test
    await prisma.session.deleteMany();
    await prisma.orgMember.deleteMany();
    await prisma.user.deleteMany();
    await prisma.organization.deleteMany();
  });

  describe('POST /auth/register', () => {
    it('should register a new user and organization', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: 'Test@1234',
          organizationName: 'Test Org',
          displayName: 'Test User',
        })
        .expect(201);

      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('email', 'test@example.com');
      expect(response.body).toHaveProperty('org');
      expect(response.body.org).toHaveProperty('name', 'Test Org');

      // Check cookies
      const cookies = response.headers['set-cookie'] as unknown as string[];
      expect(cookies).toBeDefined();
      expect(cookies.some((c: string) => c.includes('access_token'))).toBe(
        true,
      );
      expect(cookies.some((c: string) => c.includes('refresh_token'))).toBe(
        true,
      );
    });

    it('should fail with duplicate email', async () => {
      // First registration
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: 'Test@1234',
          organizationName: 'Test Org',
        })
        .expect(201);

      // Second registration with same email
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: 'Test@1234',
          organizationName: 'Another Org',
        })
        .expect(409);
    });

    it('should fail with weak password', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: 'weak',
          organizationName: 'Test Org',
        })
        .expect(400);
    });
  });

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      // Create a user to test login
      await request(app.getHttpServer()).post('/auth/register').send({
        email: 'test@example.com',
        password: 'Test@1234',
        organizationName: 'Test Org',
      });
    });

    it('should login with correct credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Test@1234',
        })
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('org');
      expect(response.body).toHaveProperty('role');

      const cookies = response.headers['set-cookie'] as unknown as string[];
      expect(cookies).toBeDefined();
      expect(cookies.some((c: string) => c.includes('access_token'))).toBe(
        true,
      );
      expect(cookies.some((c: string) => c.includes('refresh_token'))).toBe(
        true,
      );
    });

    it('should fail with wrong password', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'WrongPassword@123',
        })
        .expect(401);
    });

    it('should fail with non-existent email', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'Test@1234',
        })
        .expect(401);
    });
  });

  describe('POST /auth/refresh', () => {
    beforeEach(async () => {
      await request(app.getHttpServer()).post('/auth/register').send({
        email: 'test@example.com',
        password: 'Test@1234',
        organizationName: 'Test Org',
      });
    });

    it('should refresh tokens with valid refresh token', async () => {
      // First, login to get tokens
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Test@1234',
        });

      const cookies = loginResponse.headers[
        'set-cookie'
      ] as unknown as string[];
      const refreshCookie = cookies.find((c: string) =>
        c.includes('refresh_token'),
      )!;

      // Use refresh token to get new tokens
      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', refreshCookie)
        .expect(200);

      const newCookies = response.headers['set-cookie'] as unknown as string[];
      expect(newCookies).toBeDefined();
      expect(newCookies.some((c: string) => c.includes('access_token'))).toBe(
        true,
      );
      expect(newCookies.some((c: string) => c.includes('refresh_token'))).toBe(
        true,
      );
    });

    it('should fail without refresh token', async () => {
      await request(app.getHttpServer()).post('/auth/refresh').expect(401);
    });

    it('should detect refresh token reuse and revoke all sessions', async () => {
      // Login to get initial tokens
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Test@1234',
        });

      const cookies = loginResponse.headers[
        'set-cookie'
      ] as unknown as string[];
      const oldRefreshCookie = cookies.find((c: string) =>
        c.includes('refresh_token'),
      )!;

      // First refresh (should succeed)
      const firstRefreshResponse = await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', oldRefreshCookie)
        .expect(200);

      // Try to reuse old refresh token (should fail and revoke all sessions)
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', oldRefreshCookie)
        .expect(401);

      // Verify all sessions are revoked by checking that the new token also doesn't work
      const newCookies = firstRefreshResponse.headers[
        'set-cookie'
      ] as unknown as string[];
      const newRefreshCookie = newCookies.find((c: string) =>
        c.includes('refresh_token'),
      )!;

      // This should also fail because all sessions were revoked
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', newRefreshCookie)
        .expect(401);
    });
  });

  describe('GET /auth/me', () => {
    beforeEach(async () => {
      await request(app.getHttpServer()).post('/auth/register').send({
        email: 'test@example.com',
        password: 'Test@1234',
        organizationName: 'Test Org',
      });
    });

    it('should return user info when authenticated', async () => {
      // Login first
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Test@1234',
        });

      const cookies = loginResponse.headers[
        'set-cookie'
      ] as unknown as string[];
      const accessCookie = cookies.find((c: string) =>
        c.includes('access_token'),
      )!;

      // Get user info
      const response = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Cookie', accessCookie)
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('email', 'test@example.com');
      expect(response.body).toHaveProperty('org');
      expect(response.body).toHaveProperty('role');
    });

    it('should fail without authentication', async () => {
      await request(app.getHttpServer()).get('/auth/me').expect(401);
    });
  });

  describe('POST /auth/logout', () => {
    beforeEach(async () => {
      await request(app.getHttpServer()).post('/auth/register').send({
        email: 'test@example.com',
        password: 'Test@1234',
        organizationName: 'Test Org',
      });
    });

    it('should logout and clear cookies', async () => {
      // Login first
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Test@1234',
        });

      const cookies = loginResponse.headers[
        'set-cookie'
      ] as unknown as string[];
      const accessCookie = cookies.find((c: string) =>
        c.includes('access_token'),
      )!;

      // Logout
      const response = await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Cookie', accessCookie)
        .expect(200);

      // Check that cookies are cleared
      const logoutCookies = response.headers[
        'set-cookie'
      ] as unknown as string[];
      expect(logoutCookies).toBeDefined();
    });
  });

  describe('Rate Limiting', () => {
    it('should rate limit login attempts', async () => {
      // Try to login 25 times rapidly (limit is 20 per minute)
      const promises = Array(25)
        .fill(null)
        .map(() =>
          request(app.getHttpServer()).post('/auth/login').send({
            email: 'test@example.com',
            password: 'Test@1234',
          }),
        );

      const responses = await Promise.all(promises);
      const rateLimited = responses.some((r) => r.status === 429);
      expect(rateLimited).toBe(true);
    }, 10000);
  });
});
