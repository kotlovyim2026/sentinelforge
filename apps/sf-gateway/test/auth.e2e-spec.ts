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
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: 'Test@1234',
          organizationName: 'Test Org',
        })
        .expect(201);

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

      const firstRefreshResponse = await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', oldRefreshCookie)
        .expect(200);

      await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', oldRefreshCookie)
        .expect(401);

      const newCookies = firstRefreshResponse.headers[
        'set-cookie'
      ] as unknown as string[];
      const newRefreshCookie = newCookies.find((c: string) =>
        c.includes('refresh_token'),
      )!;

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

      const response = await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Cookie', accessCookie)
        .expect(200);

      const logoutCookies = response.headers[
        'set-cookie'
      ] as unknown as string[];
      expect(logoutCookies).toBeDefined();
    });
  });

  describe('Rate Limiting', () => {
    it('should rate limit login attempts', async () => {
      await request(app.getHttpServer()).post('/auth/register').send({
        email: 'limit@example.com',
        password: 'Test@1234',
        organizationName: 'Rate Limit Org',
      });

      const promises = Array(25)
        .fill(null)
        .map(() =>
          request(app.getHttpServer()).post('/auth/login').send({
            email: 'limit@example.com',
            password: 'Test@1234',
          }),
        );

      const responses = await Promise.all(promises);
      const rateLimited = responses.some((r) => r.status === 429);
      expect(rateLimited).toBe(true);
    }, 10000);
  });
});
