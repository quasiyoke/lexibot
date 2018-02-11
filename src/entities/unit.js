import {
  compose,
  join,
  map,
  prop,
  take,
} from 'ramda';

const getArticleTranslation = prop('translation');

const getArticleWord = prop('word');

const getArticleRepr = (article) => {
  const word = getArticleWord(article);
  const translation = getArticleTranslation(article);
  return `${word} = ${translation}`;
};

const getUnitArticles = prop('articles');

export const getUnitName = prop('name');

export const getUnitCommand = compose(
  name => `/unit\\_${name}`,
  getUnitName,
);

export const getUnitGlimpse = (unit) => {
  const UNIT_GLIMPSE_WORDS_COUNT_MAX = 3;
  const articles = getUnitArticles(unit);
  let glimpse = compose(
    join(', '),
    map(getArticleWord),
    take(UNIT_GLIMPSE_WORDS_COUNT_MAX),
  )(articles);

  if (articles.length > UNIT_GLIMPSE_WORDS_COUNT_MAX) {
    glimpse += '...';
  }

  return glimpse;
};

export const getUnitId = prop('_id');

export const getUnitRepr = compose(
  join('\n'),
  map(getArticleRepr),
  getUnitArticles,
);
