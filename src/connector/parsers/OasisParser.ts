import AbstractParser from "../AbstractParser";
import Pair from "../Pair";
import Web3 from "web3";
import {ABI} from "./../../ABI/oasisAbi.json";
// import config from "app-config.json"
import config from "./../../../app-config.json";
import RatesResult from "../RatesResult";


const provider: string = config.ethereumProvider;

const web3 = new Web3(provider);
const WETH_ADDR = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';

const OasisAddr = config.contractsAddrs.oasis;
export default class OasisParser extends AbstractParser {
    dexName = 'Oasis';
    contractAddr = OasisAddr;

    async getRates(): Promise<Pair[]> {

        let res: Pair[] = [];
        for (let pair of this.pairs) {
            try{
                const rate = await this.getRateForPair(pair);
                res.push(rate)
            }catch (e) {
                console.log(`Error parsing ${pair} on ${this.dexName}`)
                console.log(e.message)
            }

        }


        return res;
    }

    private async getRateForPair(pair: Pair): Promise<Pair> {


        try {
            // @ts-ignore
            const oasisContract = new web3.eth.Contract(ABI, this.contractAddr);


            let res1: RatesResult = await this.getRate(oasisContract, pair);
            console.log(res1)
            let res2: RatesResult = await this.getRate(oasisContract, pair, true);
            console.log(res1)

            if (res1) {
                pair.buyRate = res1.rate;
            }

            if (res2) {
                pair.sellRate = res2.rate;
            }
        }catch (e) {
            console.log(`Error parsing ${pair} on ${this.dexName}`)
            console.log(e.message)
        }


        return pair;
    }


    private async getRate(oasisContract: any, pair: Pair, reverse: boolean = false): Promise<RatesResult>{

        const pairClone: Pair = pair.getCopy();
        pairClone.ethereumReplacement = WETH_ADDR;

        // params
        let firstToken = pairClone.firstToken;
        let secondToken = pairClone.secondToken;
        if(reverse){
            firstToken = pairClone.secondToken;
            secondToken = pairClone.firstToken;
        }
        const requiredVolume = await this.getVolumeForToken(pairClone.getTokenNames()[0], pairClone.volume);

        // console.log('------')
        // console.log(firstToken)
        // console.log(secondToken)
        // const requiredVolume = pair.volume;

        let currentVolume = 0;
        let secondVolume = 0;

        let lastOrderId: number = 0;
        try {
            while (requiredVolume >= currentVolume) {
                console.log("currentVolume: ", currentVolume)
                const lastOrderMemory: number = lastOrderId
                if (currentVolume === 0) {
                    lastOrderId = await oasisContract.methods.getBestOffer(firstToken, secondToken).call();
                    if(lastOrderId==0){
                        let msg = `нет офферов для DEX: ${this.dexName}. PAIR: ${pairClone.name}`;
                        console.log(msg)

                        return {
                            success: false,
                            message: msg
                        }
                    }
                } else {
                    console.log('get worse order')
                    lastOrderId = await oasisContract.methods.getWorseOffer(lastOrderMemory).call();

                    if (lastOrderId == 0) {
                        let msg = `недостаточно офферов для объема, DEX: ${this.dexName}. PAIR: ${pairClone.name}`;
                        console.log(msg)

                        return {
                            success: false,
                            message: msg
                        }
                    }
                }


                const order: any = await oasisContract.methods.getOffer(lastOrderId).call();
                const amount = Web3.utils.fromWei(order['0']);
                currentVolume += parseFloat(amount);
                secondVolume +=  parseFloat(Web3.utils.fromWei(order['2']));
            }


            /*
            console.log("Orders: ", orders.map(order=>{

                return {
                    REP: order[1],
                    REP_VOLUME: Web3.utils.fromWei(order['0']),
                    DAI: order[3],
                    DAI_VOLUME:Web3.utils.fromWei(order['2'])
                }
            }));
            */

        } catch (e) {
            let msg = `Error while downloading offers for DEX: ${this.dexName}. PAIR: ${pairClone.name}`;
            console.log(msg)
            console.log(e.message);
            return {
                success: false,
                message: msg
            }
        }


        return {
            success: true,
            rate: reverse ? currentVolume / secondVolume : secondVolume / currentVolume
        }
    }

}


