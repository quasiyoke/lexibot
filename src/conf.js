import fs from 'fs';
import path from 'path';
import {
  curry,
  has,
} from 'ramda';

import {
  logger,
} from './helpers';

const getSecretFromObject = curry((conf, name) => {
  if (!has(name, conf)) {
    throw Error(`Conf object ${JSON.stringify(conf)} doesn't have secret "${name}"`);
  }

  return conf[name];
});

/**
 * Reads Docker secret.
 * @see https://docs.docker.com/engine/reference/commandline/secret/
 */
const readSecret = (name) => {
  const secretPath = path.join('/run', 'secrets', name);

  try {
    return fs.readFileSync(secretPath, 'utf8');
  } catch (err) {
    throw Error(`Can't read secret "${name}" from file "${secretPath}". ${err}`);
  }
};

const getConf = () => {
  const CONF_PATH_INDEX = 2;
  const confPathPart = process.argv[CONF_PATH_INDEX];

  if (confPathPart === undefined) {
    logger.debug('Conf path is undefined. Will use Docker secrets for conf.');
    return readSecret;
  }

  const confPath = path.resolve(confPathPart);
  let conf;

  try {
    const confJson = fs.readFileSync(confPath, 'utf8');
    conf = JSON.parse(confJson);
  } catch (err) {
    throw Error(`Can't read JSON conf from file "${confPath}". ${err}`);
  }

  return getSecretFromObject(conf);
};

const getSecret = getConf();

export default getSecret;
