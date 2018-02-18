import {
  __,
  compose,
  difference,
  last,
  merge,
  prop,
} from 'ramda';

import {
  choose,
} from 'helpers';
import {
  getUnitArticleReprByWord,
  getUnitWords,
} from 'entities/unit';

/**
 * Obtains the list of words which were studied during the rehearsal.
 */
const getRehearsalHistory = prop('history');

const getLastRehearsalHistoryItem = compose(
  last,
  getRehearsalHistory,
);

export const getRehearsalWord = compose(
  prop('word'),
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
  const { status } = rehearsal;
  return `Status: ${status}`;
};

/**
 * @returns - Rejected promise if can't choose the next word.
 */
export const getRehearsalWithNextWord = (rehearsal) => {
  const history = getRehearsalHistory(rehearsal) || [];
  const candidates = compose(
    difference(__, history),
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

export const updateRehearsalWithTelegramMessageId = (id, rehearsal) => {
  const historyItem = getLastRehearsalHistoryItem(rehearsal);
  historyItem.telegramMessageId = id;
};
