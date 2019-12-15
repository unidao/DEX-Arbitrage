import AbstractParser from "../AbstractParser";
import Pair from "../Pair";
import Web3 from "web3";
import {ABI} from "./../../ABI/oasisAbi.json";
// import config from "app-config.json"
import config from "./../../../app-config.json";
import RatesResult from "../RatesResult";
const BigNumber = require('bignumber.js');

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
        let requiredVolume = new BigNumber(await this.getVolumeForToken(pairClone.getTokenNames()[0], pairClone.volume));
        // requiredVolume = parseFloat(requiredVolume.toFixed(16));


        let currentVolume = new BigNumber(0);
        let secondVolume = new BigNumber(0);

        let lastOrderId: number = 0;
        try {
            while (requiredVolume.gte(currentVolume)) {

                const lastOrderMemory: number = lastOrderId
                if (currentVolume.eq(new BigNumber(0))) {
                    lastOrderId = await oasisContract.methods.getBestOffer(firstToken, secondToken).call();
                    console.log("lastOrderId :", lastOrderId)
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
                // console.log(order)

                // web3.utils.
                currentVolume = currentVolume.plus((BigNumber(order['0'].toString())))
                secondVolume = secondVolume.plus((new BigNumber(order['2'].toString())))

            }




        } catch (e) {
            let msg = `Error while downloading offers for DEX: ${this.dexName}. PAIR: ${pairClone.name}`;
            console.log(msg)
            console.log(e.message);
            return {
                success: false,
                message: msg
            }
        }

        let decCurrVol = reverse ? currentVolume.div(Math.pow(10, pair.secondTokenDecimals)) : currentVolume.div(Math.pow(10, pair.firstTokenDecimals))
        let secDecVol = reverse ? secondVolume.div(Math.pow(10, pair.firstTokenDecimals)) : secondVolume.div(Math.pow(10, pair.secondTokenDecimals));

        let finalRate = reverse ? decCurrVol.dividedBy(secDecVol) : secDecVol.dividedBy( decCurrVol);
        return {
            success: true,
            rate: BigNumber(finalRate.toString())
        }
    }

}


