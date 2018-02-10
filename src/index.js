import run from 'bot';
import { connect } from 'db';

const main = () => connect().then(run);

main();
