import Connector from './connector/Connector';
import Analyzer from './analyzer/Analyzer';
import Logger from './logger/Logger'
const chalk = require('chalk');

import { period, pairs } from './../app-config.json';
import Pair from "./connector/Pair";

const main = async function (): Promise<number> {

    const pairsObjects = pairs.map(item=>(new Pair(
        [item.tokens[0], item.tokens[1]],
        [item.decimals[0], item.decimals[1]],
        item.name, item.volume)))
    const connector = new Connector(pairsObjects);
    const result = await connector.getAllRates();

    // console.log(result);


    for(let exchange of Object.keys(result)){
        console.log(chalk.greenBright(exchange));
        for(let pair of result[exchange]){
            console.log("    "+chalk.yellow(pair.name))
            console.log("        Buy rate: "+chalk.greenBright(pair.buyRate))
            console.log("        Sell rate: "+chalk.greenBright(pair.sellRate))
            console.log(chalk.redBright("        Volume: ")+chalk.yellow(`${pair.volume}$`))
        }
    }
    // const analyzer = new Analyzer();
    // const abilities = analyzer.analyzePairs(pairs);

    // const logger = new Logger();
    // logger.log(abilities);






    return 1;//blockNumber;
};



let result = main();


