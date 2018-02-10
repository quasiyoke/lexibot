import {
  compose,
  join,
  map,
  prop,
} from 'ramda';

const getArticleTranslation = prop('translation');

const getArticleWord = prop('word');

const getArticleRepr = (article) => {
  const word = getArticleWord(article);
  const translation = getArticleTranslation(article);
  return `${word} = ${translation}`;
};

const getUnitArticles = prop('articles');

export const getUnitId = prop('_id');

export const getUnitName = prop('name');

export const getUnitRepr = compose(
  join('\n'),
  map(getArticleRepr),
  getUnitArticles,
);
