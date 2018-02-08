import winston from 'winston';

const logLevel = process.env.LOG_LEVEL || 'debug';

export const logger = new winston.Logger({
  transports: [
    new winston.transports.Console({
      level: logLevel,
      timestamp() {
        return (new Date()).toISOString();
      },
    }),
  ],
});
