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
            // secondTokenVolume = await this.getVolumeForToken(secondTokenName, pair.volume)
            firstTokenVolume = await this.getVolumeForToken(firstTokenName, pair.volume)
        } catch (e) {

            console.log(e.message);
            return  pair;
        }


        // Get exchanges
        try {
            [firstTokenExchange, secondTokenExchange] = await this.getExchangesAddresses(firstToken, secondToken);
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
        const result = await this.getTknToTknRates(firstTokenExchange, secondTokenExchange, firstTokenVolume);

        pairClone.sellRate = result.sellRate;
        pairClone.buyRate = result.buyRate;


        return pairClone;
    }


    private async getTknToTknRates(firstTokenExchange: string,
                                   secondTokenExchange: string,
                                   firstTokenVolume: number
    ): Promise<{sellRate: number, buyRate: number}> {


        // @ts-ignore
        const firstTokenExchangeContract = new web3.eth.Contract(EXCHANGE_ABI, firstTokenExchange);
        // @ts-ignore
        const secondTokenExchangeContract = new web3.eth.Contract(EXCHANGE_ABI, secondTokenExchange);



        const ftvwei = parseInt((firstTokenVolume*UI256).toString());
        const outputPriceTkn1 = await firstTokenExchangeContract.methods.getEthToTokenOutputPrice(ftvwei).call();
        const inputPriceTkn1 = await firstTokenExchangeContract.methods.getTokenToEthInputPrice(ftvwei).call();


        const outputPriceTkn2 = await secondTokenExchangeContract.methods.getEthToTokenOutputPrice(outputPriceTkn1).call();
        const inputPriceTkn2 = await secondTokenExchangeContract.methods.getTokenToEthInputPrice(inputPriceTkn1).call();


        const buyPrice = outputPriceTkn2 / firstTokenVolume / UI256;
        const sellPrice = inputPriceTkn2 / firstTokenVolume / UI256;




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


