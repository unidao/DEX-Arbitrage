import Connector from './connector/Connector';
import Analyzer from './analyzer/Analyzer';
import Logger from './logger/Logger'

import { period, pairs } from './../app-config.json';
import Pair from "./connector/Pair";

const main = async function (): Promise<number> {

    const pairsObjects = pairs.map(item=>(new Pair([item.tokens[0], item.tokens[1]], item.name, item.volume)))
    const connector = new Connector(pairsObjects);
    const result = await connector.getAllRates();

    console.log(result);
    if(result.Oasis){
        for(let pairResult of result.Oasis){
            if(pairResult.success){
                console.log(pairResult)
            }
        }
    }

    // const analyzer = new Analyzer();
    // const abilities = analyzer.analyzePairs(pairs);

    // const logger = new Logger();
    // logger.log(abilities);






    return 1;//blockNumber;
};



let result = main();


