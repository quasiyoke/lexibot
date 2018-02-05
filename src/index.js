import Telegraf from 'telegraf';

const main = () => {
  const [unusedNodePath, unusedAppPath, token] = process.argv;
  const bot = new Telegraf(token);
  bot.start(ctx => ctx.reply('welcome!'));
  bot.startPolling();
};

main();
