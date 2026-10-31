import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { buildApp } from '../src/app';
import { prisma } from '../src/plugins/prisma';
import { createReserva } from '../src/services/reservas/reservas.crud';
import type { FastifyInstance } from 'fastify';

describe('pilot reservation access', () => {
  let app: FastifyInstance;
  let pilotToken: string;
  let adminToken: string;
  let unlinkedToken: string;
  let unexpectedRoleToken: string;
  let ownId: number;
  let otherId: number;
  let otherPassengerId: number;
  let ownPassengerId: number;
  let flightIds: number[] = [];
  let otherFlightId: number;

  beforeAll(async () => {
    const url = new URL(process.env.DATABASE_URL ?? '');
    if (!['localhost', '127.0.0.1'].includes(url.hostname) || url.port !== '5679' || !/(dev|test|audit)/i.test(url.pathname)) {
      throw new Error('This test requires a local development or test database on port 5679');
    }
    const marker = randomUUID();
    const pilot = await prisma.piloto.create({ data: { nombre: `audit-pilot-${marker}` } });
    const otherPilot = await prisma.piloto.create({ data: { nombre: `audit-other-${marker}` } });
    const pilotUser = await prisma.user.create({ data: { email: `pilot-${marker}@example.invalid`, nombre: 'Pilot', role: 'PILOTO', pilotoId: pilot.id } });
    const admin = await prisma.user.create({ data: { email: `admin-${marker}@example.invalid`, nombre: 'Admin', role: 'ADMIN' } });
    const unlinked = await prisma.user.create({ data: { email: `unlinked-${marker}@example.invalid`, nombre: 'Unlinked', role: 'PILOTO' } });
    const own = await createReserva({ nombreTitular: `own-${marker}`, valorTotal: 0, abono: 0 });
    const other = await createReserva({ nombreTitular: `other-${marker}`, valorTotal: 0, abono: 0 });
    ownId = own.id;
    otherId = other.id;
    for (let i = 0; i < 5; i++) {
      const reservation = i < 4 ? own : other;
      const token = randomUUID();
      const passenger = await prisma.pasajero.create({ data: { reservaId: reservation.id, numeroPasajero: `audit-${token}`, nombre: `Passenger ${i}`, tokenPublico: token, shortId: token.slice(0, 8) } });
      const flight = await prisma.vuelo.create({ data: { reservaId: reservation.id, pasajeroId: passenger.id, pilotoId: i === 0 ? pilot.id : otherPilot.id, fechaHora: new Date(), valorPactado: 0 } });
      if (i < 4) flightIds.push(flight.id);
      else { otherFlightId = flight.id; otherPassengerId = passenger.id; }
      if (i === 1) ownPassengerId = passenger.id;
    }
    app = await buildApp();
    await app.ready();
    const sign = (user: typeof pilotUser) => app.jwt.sign({ id: user.id, email: user.email, nombre: user.nombre, role: user.role, pilotoId: user.pilotoId, sv: user.sessionVersion });
    pilotToken = sign(pilotUser);
    adminToken = sign(admin);
    unlinkedToken = sign(unlinked);
    unexpectedRoleToken = app.jwt.sign({ id: admin.id, email: admin.email, nombre: admin.nombre, role: 'UNEXPECTED', sv: admin.sessionVersion } as never);
  });

  afterAll(async () => { if (app) await app.close(); });
  const get = (url: string, token = pilotToken) => app.inject({ method: 'GET', url, headers: { authorization: `Bearer ${token}` } });

  it('lists and reads only assigned reservations and retains every flight', async () => {
    const list = await get('/api/reservas?pageSize=500');
    expect(list.statusCode).toBe(200);
    expect(list.json().data.map((r: any) => r.id)).toContain(ownId);
    expect(list.json().data.map((r: any) => r.id)).not.toContain(otherId);
    const own = await get(`/api/reservas/${ownId}`);
    expect(own.statusCode).toBe(200);
    expect(own.json().pasajeros.flatMap((p: any) => p.vuelos.map((v: any) => v.id))).toEqual(expect.arrayContaining(flightIds));
    expect((await get(`/api/reservas/${otherId}`)).statusCode).toBe(404);
    const admin = await get(`/api/reservas/${otherId}`, adminToken);
    expect(admin.statusCode).toBe(200);
  });

  it('denies unexpected roles access to reservation list and details', async () => {
    expect((await get('/api/reservas', unexpectedRoleToken)).statusCode).toBe(403);
    expect((await get(`/api/reservas/${ownId}`, unexpectedRoleToken)).statusCode).toBe(403);
  });

  it('lists all flights of assigned reservations but no unrelated flight', async () => {
    const res = await get('/api/vuelos?pageSize=500');
    expect(res.statusCode).toBe(200);
    const ids = res.json().data.map((v: any) => v.id);
    expect(ids).toEqual(expect.arrayContaining(flightIds));
    expect(ids).not.toContain(otherFlightId);
    expect((await get('/api/vuelos?pageSize=500', adminToken)).json().data.map((v: any) => v.id)).toContain(otherFlightId);
  });

  it('scopes passenger lists and details to assigned reservations', async () => {
    const list = await get('/api/pasajeros?pageSize=500');
    expect(list.statusCode).toBe(200);
    const ids = list.json().data.map((p: any) => p.id);
    expect(ids).toContain(ownPassengerId);
    expect(ids).not.toContain(otherPassengerId);
    expect((await get(`/api/pasajeros/${ownPassengerId}`)).statusCode).toBe(200);
    expect((await get(`/api/pasajeros/${otherPassengerId}`)).statusCode).toBe(404);
    expect((await get(`/api/pasajeros/${otherPassengerId}`, adminToken)).statusCode).toBe(200);
  });

  it('denies pilots registering signatures without changing the passenger', async () => {
    const before = await prisma.pasajero.findUnique({ where: { id: ownPassengerId }, include: { deslindeFirma: true } });
    const res = await app.inject({ method: 'POST', url: `/api/pasajeros/${ownPassengerId}/firma`, headers: { authorization: `Bearer ${pilotToken}` }, payload: { firmaBase64: 'synthetic-signature' } });
    expect(res.statusCode).toBe(403);
    const after = await prisma.pasajero.findUnique({ where: { id: ownPassengerId }, include: { deslindeFirma: true } });
    expect(after?.firmaDeslinde).toBe(before?.firmaDeslinde);
    expect(after?.deslindeFirma).toEqual(before?.deslindeFirma);
  });

  it('does not leak unrelated reservations through the dashboard', async () => {
    const res = await get('/api/dashboard/stats');
    expect(res.statusCode).toBe(200);
    expect(res.json().reservasRecientes.map((r: any) => r.id)).not.toContain(otherId);
    const admin = await get('/api/dashboard/stats', adminToken);
    expect(admin.statusCode).toBe(200);
    expect(admin.json().reservasRecientes.map((r: any) => r.id)).toContain(otherId);
  });

  it('fails closed when a pilot has no linked pilot record', async () => {
    for (const url of ['/api/reservas?pageSize=500', '/api/vuelos?pageSize=500', '/api/pasajeros?pageSize=500']) {
      const res = await get(url, unlinkedToken);
      expect(res.statusCode).toBe(200);
      expect(res.json().data).toEqual([]);
    }
    const dashboard = await get('/api/dashboard/stats', unlinkedToken);
    expect(dashboard.statusCode).toBe(200);
    expect(dashboard.json().reservasRecientes).toEqual([]);
  });
});
