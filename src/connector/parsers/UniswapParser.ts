import AbstractParser from "../AbstractParser";
import Pair from "../Pair";
import Web3 from "web3";
import ABI from "./../../ABI/uniswapAbi.json";
import EXCHANGE_ABI from "./../../ABI/uniswapExchangeAbi.json";
import config from "../../../config/app-config.json";
import RatesResult from "../RatesResult";
import Converter from "./../Converter"
const BN = require('bignumber.js');

const provider: string = config.ethereumProvider;

const web3 = new Web3(provider);
import { ETHEREUM } from '../Connector';
import BigNumber from "bignumber.js";
// import BN = require("bn.js");
const chalk = require('chalk');

const UI256 = 1000000000000000000;
const ETH_DECIMALS = 18;


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
                result = await this.getTknToEthRates(firstTokenExchange, firstTokenVolume, pair.firstTokenDecimals);
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
    ): Promise<{sellRate: BigNumber, buyRate: BigNumber}> {


        // @ts-ignore
        const firstTokenExchangeContract = new web3.eth.Contract(EXCHANGE_ABI, firstTokenExchange);
        // @ts-ignore
        const secondTokenExchangeContract = new web3.eth.Contract(EXCHANGE_ABI, secondTokenExchange);




        let firstTokenVolumeInteger = BN(firstTokenVolume.toFixed(pair.firstTokenDecimals)).times(Math.pow(10, pair.firstTokenDecimals));
        let firstTokenVolumeIntegerWeb3 = web3.utils.toBN(firstTokenVolumeInteger);


        // let secondTokenVolumeInteger = BN(secondTokenVolume.toFixed(pair.secondTokenDecimals)).times(Math.pow(10, pair.secondTokenDecimals));
        // let secondTokenVolumeIntegerWeb3 = web3.utils.toBN(secondTokenVolumeInteger);


            console.log(firstTokenExchange)
            console.log(secondTokenExchange)
            console.log("volume1 ", firstTokenVolumeIntegerWeb3.toString())

        // сколько в эфире стоит купить первый токен
        const outputPriceTkn1 = await firstTokenExchangeContract.methods.getEthToTokenOutputPrice(firstTokenVolumeIntegerWeb3.toString()).call();

        console.log(`Res1: ${outputPriceTkn1.toString()}`)

        // сза сколько в эфире можно продать первый токен
        const inputPriceTkn1 = await firstTokenExchangeContract.methods.getTokenToEthInputPrice(firstTokenVolumeIntegerWeb3.toString()).call();
        console.log(`Res2: ${inputPriceTkn1.toString()}`)

        // сколько можно купить
        const outputPriceTkn2 = await secondTokenExchangeContract.methods.getTokenToEthOutputPrice(web3.utils.toBN(BN(outputPriceTkn1)).toString()).call();
        console.log(`Res3: ${outputPriceTkn2.toString()}`)
        console.log(web3.utils.toBN(outputPriceTkn1).toString())

        const inputPriceTkn2 = await secondTokenExchangeContract.methods.getEthToTokenInputPrice(web3.utils.toBN(BN(inputPriceTkn1)).toString()).call();
        console.log(`Res4: ${inputPriceTkn2.toString()}`)


        let buyPrice = BN(outputPriceTkn2).dividedBy(firstTokenVolumeIntegerWeb3).dividedBy(Math.pow(10,  pair.secondTokenDecimals - pair.firstTokenDecimals));

        console.log(pair.firstTokenDecimals - pair.secondTokenDecimals)
        console.log(pair.secondTokenDecimals - pair.firstTokenDecimals)
        console.log(BN(outputPriceTkn2).dividedBy(firstTokenVolumeIntegerWeb3).toString());
        let sellPrice =BN(inputPriceTkn2).dividedBy(firstTokenVolumeIntegerWeb3).dividedBy(Math.pow(10, pair.secondTokenDecimals - pair.firstTokenDecimals));


        return {
            sellRate: sellPrice, buyRate: buyPrice
        }
    }





    private async getEthToTokenRates(tokenExchange: string,
                                   ethVolume: number,
    ): Promise<{sellRate: BigNumber, buyRate: BigNumber}> {



        // @ts-ignore
        const tokenExchangeContract = new web3.eth.Contract(EXCHANGE_ABI, tokenExchange);



        // const tvwei = (BN(ethVolume)*UI256).toString());

        let ethVolumeInteger = BN(ethVolume.toFixed(ETH_DECIMALS)).times(Math.pow(10, ETH_DECIMALS));
        let ethVolumeIntegerWeb3 = web3.utils.toBN(ethVolumeInteger);


        // купить токен можно по этой стоимость (эфир за токен)
        const outputPriceTkn = await tokenExchangeContract.methods.getTokenToEthOutputPrice(ethVolumeIntegerWeb3.toString()).call();

        // продать токен за эфир можно по этой стоимость (эфир за токен)
        const inputPriceTkn = await tokenExchangeContract.methods.getEthToTokenInputPrice(ethVolumeIntegerWeb3.toString()).call();

        const buyPrice = BN(outputPriceTkn).div(ethVolumeIntegerWeb3);
        const sellPrice = BN(inputPriceTkn).div(ethVolumeIntegerWeb3);

        return {
            sellRate: BN(sellPrice), buyRate: BN(buyPrice)
        }
    }




    private async getTknToEthRates(tokenExchange: string,
                                   tokenVolume: number, tokenDecimals: number
    ): Promise<{sellRate: BigNumber, buyRate: BigNumber}> {


        // @ts-ignore
        const tokenExchangeContract = new web3.eth.Contract(EXCHANGE_ABI, tokenExchange);



        const tvwei = parseInt((tokenVolume*UI256).toString());

        let tknVolumeInteger = BN(tokenVolume.toFixed(ETH_DECIMALS)).times(Math.pow(10, ETH_DECIMALS));
        let tknVolumeIntegerWeb3 = web3.utils.toBN(tknVolumeInteger);


        // купить токен можно по этой стоимость (эфир за токен)
        const outputPriceTkn = await tokenExchangeContract.methods.getEthToTokenOutputPrice(tknVolumeIntegerWeb3.toString()).call();

        // продать токен за эфир можно по этой стоимость (эфир за токен)
        const inputPriceTkn = await tokenExchangeContract.methods.getTokenToEthInputPrice(tknVolumeIntegerWeb3.toString()).call();

        const buyPrice = BN(outputPriceTkn).div(tknVolumeIntegerWeb3);
        const sellPrice = BN(inputPriceTkn).div(tknVolumeIntegerWeb3);

        return {
            sellRate: BN(sellPrice), buyRate: BN(buyPrice)
        }
    }





    private async getExchangesAddresses(firstToken: string, secondToken: string): Promise<string[]> {
        const firstTokenExchange = firstToken === ETHEREUM ? ETHEREUM : await this.dexContract.methods.getExchange(firstToken).call();
        const secondTokenExchange = secondToken === ETHEREUM ? ETHEREUM : await this.dexContract.methods.getExchange(secondToken).call();
        return [firstTokenExchange, secondTokenExchange];
    }


}


