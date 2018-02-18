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
  getUnitWords,
} from 'entities/unit';

export const getRehearsalId = prop('_id');

export const getRehearsalRepr = (rehearsal) => {
  const { status } = rehearsal;
  return `Status: ${status}`;
};

export const getRehearsalUnit = prop('unit');

/**
 * Obtains the list of words which were studied during the rehearsal.
 */
const getRehearsalHistory = prop('history');

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

export const getRehearsalWord = compose(
  prop('word'),
  last,
  getRehearsalHistory,
);

export const getStoppedRehearsal = merge(__, {
  status: 'stopped',
});
