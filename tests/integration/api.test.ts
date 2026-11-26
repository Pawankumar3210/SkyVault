import { afterAll, describe, expect, it } from 'vitest';
import supertest from 'supertest';
import app from '../../api/index';

const api = supertest(app);

describe('REST API in Demo Mode', () => {
  it('reports the active backend mode without login', async () => {
    const response = await api.get('/api/health').expect(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.mode).toBe('demo');
  });

  it('validates and creates a subject', async () => {
    const response = await api.post('/api/subjects').send({ name: 'Integration subject', code: 'INT', color: '#123456' }).expect(200);
    expect(response.body.data.name).toBe('Integration subject');
    const list = await api.get('/api/subjects').expect(200);
    expect(list.body.data.some((subject: { code: string }) => subject.code === 'INT')).toBe(true);
  });

  it('rejects invalid subject payloads', async () => {
    const response = await api.post('/api/subjects').send({ name: '', code: 'TOO-LONG-FOR-THIS-CODE', color: 'red' }).expect(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});

afterAll(() => { /* Express is exported as a function and does not open a listening socket in tests. */ });
