
import AbiItem from "web3-utils";
import Connector from './connector/Connector';
import Analyzer from './analyzer/Analyzer';
import Logger from './logger/Logger'

import { period, pairs } from './../app-config.json';

const main = async function (): Promise<number> {

    const connector = new Connector(pairs);
    const result = await connector.getAllRates();

    if(result.Oasis){
        for(let pairResult of result.Oasis){
            if(pairResult.success){
                console.log(pairResult.pair)
            }
        }
    }

    // const analyzer = new Analyzer();
    // const abilities = analyzer.analyzePaires(pares);

    // const logger = new Logger();
    // logger.log(abilities);






    return 1;//blockNumber;
};



let result = main();


