import {
  __,
  always,
  compose,
  cond,
  curry,
  difference,
  equals,
  filter,
  last,
  length,
  map,
  merge,
  prop,
  T,
} from 'ramda';

import {
  choose,
} from 'helpers';
import {
  getUnitArticleReprByWord,
  getUnitWords,
} from 'entities/unit';

const getHistoryItemIsKnown = prop('isKnown');

const getHistoryItemWord = prop('word');

/**
 * Obtains the list of words which were studied during the rehearsal.
 */
const getRehearsalHistory = prop('history');

const getLastRehearsalHistoryItem = compose(
  last,
  getRehearsalHistory,
);

export const getRehearsalWord = compose(
  getHistoryItemWord,
  getLastRehearsalHistoryItem,
);

export const getRehearsalUnit = prop('unit');

/**
 * @returns - Markdown representation of the last rehearsal's article.
 */
export const getRehearsalArticleRepr = (rehearsal) => {
  const word = getRehearsalWord(rehearsal);
  return compose(
    getUnitArticleReprByWord(word),
    getRehearsalUnit,
  )(rehearsal);
};

export const getRehearsalId = prop('_id');

export const getRehearsalRepr = (rehearsal) => {
  const history = getRehearsalHistory(rehearsal);
  const knownHistoryItemsCount = compose(
    length,
    filter(getHistoryItemIsKnown),
  )(history);
  let knownRatio = knownHistoryItemsCount / length(history);

  if (!Number.isFinite(knownRatio)) {
    knownRatio = 0;
  }

  const perCentRatio = Math.round(knownRatio * 100);
  const isGreater = curry((b, a) => a > b);
  return cond([
    [
      equals(1),
      always('Wonderful! You haven\'t made a single mistake 🤠 Let\'s go to the next unit?'),
    ],
    [isGreater(0.9), always(`Great! You know ${perCentRatio}% of words in this unit 😏 Congratulations!`)],
    [
      isGreater(0.75),
      always(`You know ${perCentRatio}% of words here. Not bad 👌`),
    ],
    [
      isGreater(0),
      always(
        `You know only ${perCentRatio}% of words here.` +
        ' Maybe, study this unit one more time?',
      ),
    ],
    [
      T,
      always(
        'It seems like you don\'t know a single word from this unit 😶' +
        ' Perhaps, you should try something more simple?',
      ),
    ],
  ])(knownRatio);
};

/**
 * @returns - Rejected promise if can't choose the next word.
 */
export const getRehearsalWithNextWord = (rehearsal) => {
  const history = getRehearsalHistory(rehearsal) || [];
  const historyWords = map(getHistoryItemWord, history);
  const candidates = compose(
    difference(__, historyWords),
    getUnitWords,
    getRehearsalUnit,
  )(rehearsal);

  if (candidates.length === 0) {
    return Promise.reject();
  }

  const nextWord = choose(candidates);
  history.push({
    word: nextWord,
  });
  return Promise.resolve(
    merge({
      history,
    }, rehearsal),
  );
};

export const getStoppedRehearsal = merge(__, {
  status: 'stopped',
});

export const updateRehearsalWithIsArticleKnown = (isKnown, rehearsal) => {
  const historyItem = getLastRehearsalHistoryItem(rehearsal);
  historyItem.isKnown = isKnown;
};

export const updateRehearsalWithTelegramMessageId = (id, rehearsal) => {
  const historyItem = getLastRehearsalHistoryItem(rehearsal);
  historyItem.telegramMessageId = id;
};
