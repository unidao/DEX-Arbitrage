import AbstractParser from "../AbstractParser";
import Pair from "../Pair";
import Web3 from "web3";
import ABI from "./../../ABI/uniswapAbi.json";
import EXCHANGE_ABI from "./../../ABI/uniswapExchangeAbi.json";
import config from "./../../../app-config.json";
import RatesResult from "../RatesResult";
import Converter from "./../Converter"
const BN = require('bignumber.js');

const provider: string = config.ethereumProvider;

const web3 = new Web3(provider);
import { ETHEREUM } from '../Connector';
const chalk = require('chalk');

const UI256 = 100000000;


export default class UniswapParser extends AbstractParser {
    dexName = 'Uniswap';
    contractAddr = config.contractsAddrs.uniswap;
    dexContract: any;

    async getRates(): Promise<Pair[]> {
        let res: Pair[] = [];
        for (let pair of this.pairs) {
            res.push(await this.getRateForPair(pair))
        }

        return res;
    }

    constructor(pairs: Pair[]) {
        super(pairs)

        // @ts-ignore
        this.dexContract = new web3.eth.Contract(ABI, this.contractAddr);

    }

    private async getRateForPair(pair: Pair): Promise<Pair> {

        const pairClone: Pair = pair.getCopy();

        // Init
        const [firstToken, secondToken] = pair.tokens;
        const [firstTokenName, secondTokenName] = pair.getTokenNames();
        const hasEthereum = firstToken === ETHEREUM || secondToken === ETHEREUM;

        let firstTokenExchange: string;
        let secondTokenExchange: string;
        let firstTokenVolume: number;
        let secondTokenVolume: number;


        // Get volumes from dollars
        try {
            firstTokenVolume = await this.getVolumeForToken(firstTokenName, pair.volume)
            secondTokenVolume = await this.getVolumeForToken(secondTokenName, pair.volume)
        } catch (e) {

            console.log(e.message);
            return  pair;
        }


        // Get exchanges
        try {
            [firstTokenExchange, secondTokenExchange] = await this.getExchangesAddresses(firstToken, secondToken);
            // console.log("firstTokenExchange ", firstTokenExchange)
            // console.log("secondTokenExchange ", secondTokenExchange)
        } catch (e) {
            console.log(`Cant get uniswap exchange addresses for ${pair.name}`)
            console.log(e.message);
            return  pair;
        }

        let result;
        if (hasEthereum) {
            if(firstToken === ETHEREUM){
                result = await this.getEthToTokenRates(secondTokenExchange, firstTokenVolume);
            }else{
                result = await this.getTknToEthRates(firstTokenExchange, firstTokenVolume);
            }
        } else {
            result = await this.getTknToTknRates(firstTokenExchange, secondTokenExchange, firstTokenVolume, secondTokenVolume, pair);

        }

        pairClone.sellRate = result.sellRate;
        pairClone.buyRate = result.buyRate;


        return pairClone;
    }


    private async getTknToTknRates(firstTokenExchange: string,
                                   secondTokenExchange: string,
                                   firstTokenVolume: number,
                                   secondTokenVolume: number,
                                   pair: Pair
    ): Promise<{sellRate: number, buyRate: number}> {


        // @ts-ignore
        const firstTokenExchangeContract = new web3.eth.Contract(EXCHANGE_ABI, firstTokenExchange);
        // @ts-ignore
        const secondTokenExchangeContract = new web3.eth.Contract(EXCHANGE_ABI, secondTokenExchange);




        // const ftvwei = (new BN(firstTokenVolume)).times(BN(Math.pow(10, pair.firstTokenDecimals)));
        // const pow = web3.utils.toBN(10).pow(web3.utils.toBN(pair.firstTokenDecimals))
        // const web3BN = web3.utils.toBN(BN(firstTokenVolume)).mul(pow)



        let firstTokenVolumeInteger = BN(firstTokenVolume.toString()).times(Math.pow(10, pair.firstTokenDecimals));
        let firstTokenVolumeIntegerWeb3 = web3.utils.toBN(firstTokenVolumeInteger);



        let secondTokenVolumeInteger = BN(secondTokenVolume.toString()).times(Math.pow(10, pair.secondTokenDecimals));
        let secondTokenVolumeIntegerWeb3 = web3.utils.toBN(secondTokenVolumeInteger);



        // const secondPow = Math.pow(10, pair.secondTokenDecimals);
        // const stvwei = (new BN(secondTokenVolume)).times(BN(secondPow)).toFixed(0) //parseInt((secondTokenVolume*(Math.pow(10, pair.secondTokenDecimals))).toString());

        console.log('111')
        console.log(firstTokenVolumeIntegerWeb3.toString())
        // купить токен можно по этой стоимость (эфир за токен)
        const outputPriceTkn1 = await firstTokenExchangeContract.methods.getEthToTokenOutputPrice(firstTokenVolumeIntegerWeb3.toString()).call();

        console.log('2222')

        // продать токен за эфир можно по этой стоимость (эфир за токен)
        const inputPriceTkn1 = await firstTokenExchangeContract.methods.getTokenToEthInputPrice(firstTokenVolumeIntegerWeb3.toString()).call();

        console.log('3333')
        console.log(secondTokenVolumeIntegerWeb3.toString())
        const outputPriceTkn2 = await secondTokenExchangeContract.methods.getEthToTokenOutputPrice(secondTokenVolumeIntegerWeb3.toString()).call();
        console.log('4444')
        const inputPriceTkn2 = await secondTokenExchangeContract.methods.getTokenToEthInputPrice(secondTokenVolumeIntegerWeb3.toString()).call();




        const buyPriceInEthToken1 = outputPriceTkn1 / firstTokenVolume;
        const buyPriceInEthToken2 = outputPriceTkn2 / secondTokenVolume;
        const buyPrice = buyPriceInEthToken1 / buyPriceInEthToken2;

        const sellPriceInEthToken1 = inputPriceTkn1 / firstTokenVolume;
        const sellPriceInEthToken2 = inputPriceTkn2 / secondTokenVolume;
        const sellPrice = sellPriceInEthToken1 / sellPriceInEthToken2;

        console.log(chalk.yellowBright(`Подробная инфформация по: ${pair.name} | ${this.dexName}`));
        console.log(firstTokenVolume.toString())
        // console.log(web3BN.toString())
        console.log(chalk.magentaBright(`Адрес обменника токена ${pair.getTokenNames()[0]} ${firstTokenExchange}`))
        console.log(chalk.greenBright(`   Цена в эфире на вывод  токена ${pair.getTokenNames()[0]} для объема ${firstTokenVolume}:  ${outputPriceTkn1} (${outputPriceTkn1/Math.pow(10, 18)})`));
        console.log(chalk.greenBright(`   Цена в эфире на ввод  токена ${pair.getTokenNames()[0]} для объема ${firstTokenVolume}:  ${inputPriceTkn1} (${inputPriceTkn1/Math.pow(10, 18)})`));
        console.log(chalk.greenBright(`   Цена в эфире на вывод  токена ${pair.getTokenNames()[1]} для объема ${secondTokenVolume}:  ${outputPriceTkn2} (${outputPriceTkn2/Math.pow(10, 18)})`));
        console.log(chalk.greenBright(`   Цена в эфире на ввод  токена ${pair.getTokenNames()[1]} для объема ${secondTokenVolume}:  ${inputPriceTkn2} (${inputPriceTkn2/Math.pow(10, 18)})`));
        console.log(chalk.yellow('  --------------->>>'));
        console.log(chalk.greenBright(`   Курс в эфире на вывод токена  ${pair.getTokenNames()[0]}: ${buyPriceInEthToken1/Math.pow(10, 18)}`));
        console.log(chalk.greenBright(`   Курс в эфире на вывод токена  ${pair.getTokenNames()[1]}: ${buyPriceInEthToken2/Math.pow(10, 18)}`));
        console.log(chalk.greenBright(`   Курс в эфире на ввод токена  ${pair.getTokenNames()[0]}: ${sellPriceInEthToken1/Math.pow(10, 18)}`));
        console.log(chalk.greenBright(`   Курс в эфире на ввод токена  ${pair.getTokenNames()[1]}: ${sellPriceInEthToken2/Math.pow(10, 18)}`));



        return {
            sellRate: sellPrice, buyRate: buyPrice
        }
    }





    private async getEthToTokenRates(tokenExchange: string,
                                   ethVolume: number,
    ): Promise<{sellRate: number, buyRate: number}> {



        // @ts-ignore
        const tokenExchangeContract = new web3.eth.Contract(EXCHANGE_ABI, tokenExchange);



        const tvwei = parseInt((ethVolume*UI256).toString());

        // купить токен можно по этой стоимость (эфир за токен)
        const outputPriceTkn = await tokenExchangeContract.methods.getTokenToEthOutputPrice(tvwei).call();

        // продать токен за эфир можно по этой стоимость (эфир за токен)
        const inputPriceTkn = await tokenExchangeContract.methods.getEthToTokenInputPrice(tvwei).call();

        const buyPrice = outputPriceTkn / tvwei;
        const sellPrice = inputPriceTkn / tvwei;

        return {
            sellRate: sellPrice, buyRate: buyPrice
        }
    }




    private async getTknToEthRates(tokenExchange: string,
                                   tokenVolume: number,
    ): Promise<{sellRate: number, buyRate: number}> {


        // @ts-ignore
        const tokenExchangeContract = new web3.eth.Contract(EXCHANGE_ABI, tokenExchange);



        const tvwei = parseInt((tokenVolume*UI256).toString());

        // купить токен можно по этой стоимость (эфир за токен)
        const outputPriceTkn = await tokenExchangeContract.methods.getEthToTokenOutputPrice(tvwei).call();

        // продать токен за эфир можно по этой стоимость (эфир за токен)
        const inputPriceTkn = await tokenExchangeContract.methods.getTokenToEthInputPrice(tvwei).call();

        const buyPrice = outputPriceTkn / tvwei;
        const sellPrice = inputPriceTkn / tvwei;

        return {
            sellRate: sellPrice, buyRate: buyPrice
        }
    }





    private async getExchangesAddresses(firstToken: string, secondToken: string): Promise<string[]> {
        const firstTokenExchange = firstToken === ETHEREUM ? ETHEREUM : await this.dexContract.methods.getExchange(firstToken).call();
        const secondTokenExchange = secondToken === ETHEREUM ? ETHEREUM : await this.dexContract.methods.getExchange(secondToken).call();
        return [firstTokenExchange, secondTokenExchange];
    }


}


