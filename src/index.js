import run from './bot';
import { connect } from './db';

const main = () => connect(run);

main();
