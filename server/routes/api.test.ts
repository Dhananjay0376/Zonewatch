import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import apiRouter from './api';
import { runWithModelRetry } from '../services/gemini';

vi.mock('../services/gemini', async (importOriginal) => {
  const original = await importOriginal<typeof import('../services/gemini')>();
  return {
    ...original,
    runWithModelRetry: vi.fn(),
  };
});

describe('API Route - /api/translate', () => {
  let app: express.Express;

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api', apiRouter);
  });

  const runUrgencyTest = async (urgency: string) => {
    const mockedResponse = {
      originalLanguage: 'Spanish',
      translatedText: 'Translated phrase',
      urgencyTag: urgency,
      classificationReason: `Reason for ${urgency}`,
      suggestedResponse: 'Response',
      suggestedResponseEnglish: 'Response English',
      detectedTone: 'Calm'
    };

    vi.mocked(runWithModelRetry).mockResolvedValue(JSON.stringify(mockedResponse));

    const res = await request(app)
      .post('/api/translate')
      .send({ phrase: 'some phrase' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual(mockedResponse);
  };

  it('should return Casual classification correctly', async () => {
    await runUrgencyTest('Casual');
  });

  it('should return Urgent classification correctly', async () => {
    await runUrgencyTest('Urgent');
  });

  it('should return Medical classification correctly', async () => {
    await runUrgencyTest('Medical');
  });

  it('should return Accessibility classification correctly', async () => {
    await runUrgencyTest('Accessibility');
  });

  it('should fallback to rule-based fallback when Gemini fails/throws', async () => {
    vi.mocked(runWithModelRetry).mockRejectedValue(new Error('API Error'));

    // Send phrase that contains "silla" to trigger accessibility fallback
    const res = await request(app)
      .post('/api/translate')
      .send({ phrase: 'silla' });

    expect(res.status).toBe(200);
    expect(res.body.urgencyTag).toBe('Accessibility');
    expect(res.body.isLocalFallback).toBe(true);
    expect(res.body.translatedText).toBe('Where is the wheelchair ramp / elevator?');
  });

  it('should return 400 when phrase is missing', async () => {
    const res = await request(app)
      .post('/api/translate')
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });
});
