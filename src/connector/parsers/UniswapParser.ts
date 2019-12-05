import AbstractParser from "../AbstractParser";
import Pair from "../Pair";
import Web3 from "web3";
import ABI from "./../../ABI/uniswapAbi.json";
import EXCHANGE_ABI from "./../../ABI/uniswapExchangeAbi.json";
import config from "./../../../app-config.json";
import RatesResult from "../RatesResult";
import Converter from "./../Converter"

const provider: string = config.ethereumProvider;

const web3 = new Web3(provider);

const ETHEREUM = 'eth';
const UI256 = 100000000;


export default class UniswapParser extends AbstractParser {
    dexName = 'Uniswap';
    contractAddr = config.contractsAddrs.uniswap;
    dexContract: any;

    async getRates(): Promise<Pair[]> {
        console.log("=================")
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

        const pairClone = {...pair}

        // Init
        const [firstToken, secondToken] = pair.tokens;
        const [firstTokenName, secondTokenName] = this.getTokenNames(pair);
        const hasEthereum = firstToken === ETHEREUM || secondToken === ETHEREUM;

        let firstTokenExchange: string;
        let secondTokenExchange: string;
        let firstTokenVolume: number;
        let secondTokenVolume: number;


        // Get volumes from dollars
        try {
            secondTokenVolume = await this.getVolumeForToken(secondTokenName, pair.volume)
            firstTokenVolume = await this.getVolumeForToken(firstTokenName, pair.volume)
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


        // if (hasEthereum) {
        //
        // } else {
        //
        // }
        const result = await this.getTknToTknRates(firstTokenExchange, secondTokenExchange, firstTokenVolume, secondTokenVolume);

        pairClone.sellRate = result.sellRate;
        pairClone.buyRate = result.buyRate;


        return pairClone;
    }


    private async getTknToTknRates(firstTokenExchange: string,
                                   secondTokenExchange: string,
                                   firstTokenVolume: number,
                                   secondTokenVolume: number
    ): Promise<{sellRate: number, buyRate: number}> {


        // @ts-ignore
        const firstTokenExchangeContract = new web3.eth.Contract(EXCHANGE_ABI, firstTokenExchange);
        // @ts-ignore
        const secondTokenExchangeContract = new web3.eth.Contract(EXCHANGE_ABI, secondTokenExchange);



        const ftvwei = parseInt((firstTokenVolume*UI256).toString());
        const stvwei = parseInt((secondTokenVolume*UI256).toString());

        // купить токен можно по этой стоимость (эфир за токен)
        const outputPriceTkn1 = await firstTokenExchangeContract.methods.getEthToTokenOutputPrice(ftvwei).call();

        // продать токен за эфир можно по этой стоимость (эфир за токен)
        const inputPriceTkn1 = await firstTokenExchangeContract.methods.getTokenToEthInputPrice(ftvwei).call();


        const outputPriceTkn2 = await secondTokenExchangeContract.methods.getEthToTokenOutputPrice(stvwei).call();
        const inputPriceTkn2 = await secondTokenExchangeContract.methods.getTokenToEthInputPrice(stvwei).call();

        // console.log("volumes")
        // console.log("firstTokenVolume: ", firstTokenVolume)
        // console.log("secondTokenVolume: ", secondTokenVolume)
        //
        // console.log('-------------')
        // console.log("outputPriceTkn1: ", outputPriceTkn1)
        // console.log("outputPriceTkn2: ", outputPriceTkn2)
        // console.log("inputPriceTkn1: ", inputPriceTkn1)
        // console.log("inputPriceTkn2: ", inputPriceTkn2)

        const buyPriceInEthToken1 = outputPriceTkn1 / ftvwei;
        const buyPriceInEthToken2 = outputPriceTkn2 / stvwei;
        const buyPrice = buyPriceInEthToken1 / buyPriceInEthToken2;

        const sellPriceInEthToken1 = inputPriceTkn1 / ftvwei;
        const sellPriceInEthToken2 = inputPriceTkn2 / stvwei;
        const sellPrice = sellPriceInEthToken1 / sellPriceInEthToken2;



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


