import type { FastifyRequest } from 'fastify';

/** Undefined means unrestricted staff; an unlinked pilot must match no reservation. */
export function pilotScope(request: FastifyRequest): number | undefined {
  return request.user?.role === 'PILOTO' ? (request.user.pilotoId ?? -1) : undefined;
}

export function assignedReservation(pilotoId: number) {
  return { deletedAt: null, vuelos: { some: { pilotoId, deletedAt: null } } };
}
