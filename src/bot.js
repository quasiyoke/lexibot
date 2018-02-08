import {
  curry,
} from 'ramda';
import Telegraf from 'telegraf';

import getSecret from './conf';
import {
  insertUpdate,
} from './db';
import {
  logger,
} from './helpers';

const onStart = (ctx) => {
  ctx.reply('welcome!');
};

const storeUpdate = curry(async (db, ctx, next) => {
  insertUpdate(ctx.update, db);
  logger.debug('An update was received', {
    update: ctx.update,
  });
  await next();
});

const run = (db) => {
  const token = getSecret('bot_token');
  const bot = new Telegraf(token);
  bot.use(storeUpdate(db));
  bot.start(onStart);
  bot.startPolling();
  logger.info('Ready for messages');
};

export default run;
