import Pair from "../connector/Pair";
import OasisParser from "../connector/parsers/OasisParser";
import UniswapParser from "../connector/parsers/UniswapParser";
import BigNumber from "bignumber.js";
const chalk = require('chalk');


type Optional = BigNumber | undefined;

export interface PairsData {
    [key: string]: Pair[]
}

export default class Analyzer {

    private exchanges: string[]

    constructor(private pairsData: PairsData) {
        this.exchanges = Object.keys(this.pairsData);
    }

    public analyzePairs() {

        for (let exchange of this.exchanges) {
            const pairs = this.pairsData[exchange];

            for (let pair of pairs) {
                const sellRate = pair.sellRate;
                if (sellRate) {
                    this.searchLowerBuyRate(sellRate, pair.name, exchange);
                    // if not empty arr, write result to file
                }
            }
        }
    }

    private searchLowerBuyRate(price: BigNumber, pairName: string, srcExchange: string) {
        const exchanges = this.exchanges.filter(e => e != srcExchange);
        console.log(`SrcExchange: ${srcExchange}`)
        console.log(`pairName: ${pairName}`)
        console.log('exhcages to search: ', exchanges)

        let result: any[] = [];
        for (let exchange of exchanges) {
            const pairs = this.pairsData[exchange];
            for (let pair of pairs) {
                if (pair.name === pairName) {
                    const buyRate = pair.buyRate;
                    if (buyRate && price.isGreaterThan(buyRate)) {
                        console.log(chalk.red(`Pair: ${pair.name} has ability, source exchange: ${srcExchange}, dstExchange: ${exchange}`))
                        console.log(chalk.redBright(`We can buy ${buyRate.toFixed(8)} and sell by ${price.toFixed(8)}`))
                        // if not empty arr, write result to file
                    }
                }
            }
        }
    }
}
