import AbstractParser from "../AbstractParser";
import Pair from "../Pair";
import Web3 from "web3";
import ABI from "./../../ABI/uniswapAbi.json";
import EXCHANGE_ABI from "./../../ABI/uniswapExchangeAbi.json";
import config from "./../../../app-config.json";
import RatesResult from "../RatesResult";

const provider: string = config.ethereumProvider;

const web3 = new Web3(provider);

const ETHEREUM = 'eth';


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


        const firstToken = pair.tokens[0];
        const secondToken = pair.tokens[1];
        const hasEthereum = firstToken === ETHEREUM || secondToken === ETHEREUM;

        let firstTokenExchange: string;
        let secondTokenExchange: string;

        try {
            [firstTokenExchange, secondTokenExchange] = await this.getExchangesAddresses(firstToken, secondToken);
        } catch (e) {
            console.log(`Cant get uniswap exchange addresses for ${pair.name}`)
            console.log(e.message);
            return pair;
        }

        if(hasEthereum){

        }else{
            this.getTknToTknRates(firstTokenExchange, secondTokenExchange, pair.volume);
        }




        console.log("firstTokenExchange ", firstTokenExchange)
        console.log("secondTokenExchange ", secondTokenExchange)


        return pair;
    }


    private async getTknToTknRates(firstTokenExchange: string, secondTokenExchange: string,
                                   volume: number){
        // @ts-ignore
        const firstTokenExchangeContract = new web3.eth.Contract(EXCHANGE_ABI, firstTokenExchange);
        // @ts-ignore
        const secondTokenExchangeContract = new web3.eth.Contract(EXCHANGE_ABI, secondTokenExchange);


        const outputPriceTkn1 = await firstTokenExchangeContract.methods.getEthToTokenOutputPrice(volume).call();
        const inputPriceTkn1 = await firstTokenExchangeContract.methods.getTokenToEthInputPrice(volume).call();

        const outputPriceTkn2 = await secondTokenExchangeContract.methods.getEthToTokenOutputPrice(volume).call();
        const inputPriceTkn2 = await secondTokenExchangeContract.methods.getTokenToEthInputPrice(volume).call();

        console.log("outputPriceTkn1 ", outputPriceTkn1)
        console.log("inputPriceTkn1 ", inputPriceTkn1)
        console.log("outputPriceTkn2 ", outputPriceTkn2)
        console.log("inputPriceTkn2 ", inputPriceTkn2)
    }

    private async getExchangesAddresses(firstToken: string, secondToken: string): Promise<string[]> {
        const firstTokenExchange = firstToken === ETHEREUM ? ETHEREUM : await this.dexContract.methods.getExchange(firstToken).call();
        const secondTokenExchange = secondToken === ETHEREUM ? ETHEREUM : await this.dexContract.methods.getExchange(secondToken).call();
        return [firstTokenExchange, secondTokenExchange];
    }


}


