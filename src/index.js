import fs from 'fs';
import Telegraf from 'telegraf';

const readSecret = (name) => {
  const filePath = `conf/${name}`;
  return fs.readFileSync(filePath, 'utf8');
};

const main = () => {
  const token = readSecret('bot_token');
  const bot = new Telegraf(token);
  bot.start(ctx => ctx.reply('welcome!'));
  bot.startPolling();
};

main();
