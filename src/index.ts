import Connector from './connector/Connector';
import Analyzer from './analyzer/Analyzer';

const chalk = require('chalk');

import {sleepFor, pairs} from '../config/app-config.json';
import Pair from "./connector/Pair";
import Logger from './logger/Logger'
import BigNumber from "bignumber.js";
import Timeout = NodeJS.Timeout;


const main = async function (): Promise<Timeout> {


    console.log(chalk.greenBright('---=== Start execution ===---'))
    const pairsObjects = pairs.map(item => (new Pair(
        [item.tokens[0], item.tokens[1]],
        [item.decimals[0], item.decimals[1]],
        item.name, item.volume)))
    const connector = new Connector(pairsObjects);
    const result = await connector.getAllRates();

    // console.log(result);
    // fs.writeFileSync('./data.json', JSON.stringify(result, null, 2) , 'utf-8');

    for (let exchange of Object.keys(result)) {
        console.log(chalk.greenBright(exchange));
        for (let pair of result[exchange]) {
            console.log("    " + chalk.yellow(pair.name));
            console.log("        Buy rate: " + chalk.greenBright((pair.buyRate !== undefined ? pair.buyRate.toFixed(8) : pair.buyRate)));
            console.log("        Sell rate: " + chalk.greenBright(pair.sellRate ? pair.sellRate.toFixed(8) : pair.sellRate))
            console.log(chalk.redBright("        Volume: ") + chalk.yellow(`${pair.volume}$`))
        }
    }

    // for(let pair of result.Oasis){
    //     if(pair.name === '0x/dai'){
    //         pair.buyRate = new BigNumber(0.1)
    //     }
    // }

    const analyzer = new Analyzer(result);
    const abilities = analyzer.analyzePairs();

    console.log(abilities);

    const logger = new Logger();
    logger.log(abilities);

    console.log(chalk.yellowBright('Sleep for '+sleepFor+'ms befor execution'))
    return setTimeout(main, sleepFor)
};


let result = main();


