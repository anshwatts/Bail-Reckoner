import { PrismaClient } from '@prisma/client';

let prismaInstance;
try {
  prismaInstance = new PrismaClient();
} catch {
  prismaInstance = new Proxy(
    {},
    {
      get(target, prop) {
        if (prop === '$transaction') {
          return async (cb) => (typeof cb === 'function' ? cb(prismaInstance) : cb);
        }
        return new Proxy(
          {},
          {
            get() {
              return async () => null;
            }
          }
        );
      }
    }
  );
}

export const prisma = prismaInstance;
export default prisma;
