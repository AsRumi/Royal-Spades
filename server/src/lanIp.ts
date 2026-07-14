import os from 'node:os';

// Collect every non-internal IPv4 address on the machine, most-likely-LAN
// first, so the join URL works and the console can list alternatives.
export function lanIpCandidates(): string[] {
  const addresses: string[] = [];
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const info of interfaces[name] ?? []) {
      if (info.family === 'IPv4' && !info.internal) {
        addresses.push(info.address);
      }
    }
  }
  const score = (ip: string): number => {
    if (ip.startsWith('192.168.')) return 0;
    if (ip.startsWith('10.')) return 1;
    const second = Number(ip.split('.')[1]);
    if (ip.startsWith('172.') && second >= 16 && second <= 31) return 2;
    return 3;
  };
  return addresses.sort((a, b) => score(a) - score(b));
}

export function bestLanIp(): string {
  return lanIpCandidates()[0] ?? 'localhost';
}
