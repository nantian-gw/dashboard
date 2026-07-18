import { registerOTel } from '@vercel/otel';

export function register() {
  registerOTel({
    serviceName: 'nantian-gw-dashboard',
  });
}
