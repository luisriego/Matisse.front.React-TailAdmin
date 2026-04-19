import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/v1/resident-unit/actives', () => {
    return HttpResponse.json([]); 
  }),
  http.put('/api/v1/resident-unit/create', () => {
    return HttpResponse.json({ status: 'created' }, { status: 201 });
  }),
  http.put('/api/v1/accounts/create', () => {
    return HttpResponse.json({ status: 'created' }, { status: 201 });
  }),
  http.put('/api/v1/gas/price', () => {
    return HttpResponse.json({ status: 'created' }, { status: 201 });
  }),
  http.put('/api/v1/gas/price/direct', () => {
    return HttpResponse.json({ status: 'created' }, { status: 201 });
  }),
  http.post('/api/v1/login_check', () => {
    return HttpResponse.json({ token: 'mock-jwt-token' }, { status: 200 });
  }),
];
