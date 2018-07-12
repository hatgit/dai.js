import PrivateService from '../../core/PrivateService';
import { OasisBuyOrder, OasisSellOrder } from './OasisOrder';
import TransactionObject from '../../eth/TransactionObject';
import contracts from '../../../contracts/contracts';
import { UINT256_MAX } from '../../utils/constants';
import { getCurrency, DAI, WETH } from '../../eth/Currency';

export default class OasisExchangeService extends PrivateService {
  constructor(name = 'exchange') {
    super(name, [
      'cdp',
      'smartContract',
      'token',
      'web3',
      'log',
      'gasEstimator',
      'allowance',
      'transactionManager'
    ]);
  }

  /*
  daiAmount: amount of Dai to sell
  tokenSymbol: symbol of token to buy
  minFillAmount: minimum amount of token being bought required.  If this can't be met, the trade will fail
  */
  async sellDai(amount, tokenSymbol, minFillAmount = 0) {
    const oasisContract = this.get('smartContract').getContractByName(
      contracts.MAKER_OTC
    );
    const daiToken = this.get('token').getToken(DAI);
    const daiAddress = daiToken.address();
    const buyTokenAddress = this.get('token')
      .getToken(tokenSymbol)
      .address();
    const daiAmountEVM = daiValueForContract(amount);
    const minFillAmountEVM = daiValueForContract(minFillAmount);
    await this.get('allowance').requireAllowance(
      DAI,
      oasisContract.getAddress()
    );
    return OasisSellOrder.build(
      oasisContract,
      oasisContract.sellAllAmount(
        daiAddress,
        daiAmountEVM,
        buyTokenAddress,
        minFillAmountEVM,
        { gasLimit: 300000 }
      ),
      this.get('transactionManager')
    );
  }

  /*
  daiAmount: amount of Dai to buy
  tokenSymbol: symbol of token to sell
  maxFillAmount: If the trade can't be done without selling more than the maxFillAmount of selling token, it will fail
  */
  async buyDai(amount, tokenSymbol, maxFillAmount = UINT256_MAX) {
    const oasisContract = this.get('smartContract').getContractByName(
      contracts.MAKER_OTC
    );
    const daiToken = this.get('token').getToken(DAI);
    const daiAddress = daiToken.address();
    const daiAmountEVM = daiValueForContract(amount);
    const maxFillAmountEVM = daiValueForContract(maxFillAmount);
    const sellTokenAddress = this.get('token')
      .getToken(tokenSymbol)
      .address();
    await this.get('allowance').requireAllowance(
      WETH,
      oasisContract.getAddress()
    );
    return OasisBuyOrder.build(
      oasisContract,
      oasisContract.buyAllAmount(
        daiAddress,
        daiAmountEVM,
        sellTokenAddress,
        maxFillAmountEVM,
        { gasLimit: 300000 }
      ),
      this.get('transactionManager')
    );
  }

  //only used to set up a limit order on the local testnet
  async offer(
    payAmount,
    payTokenAddress,
    buyAmount,
    buyTokenAddress,
    pos,
    overrides
  ) {
    const oasisContract = this.get('smartContract').getContractByName(
      contracts.MAKER_OTC
    );
    return new TransactionObject(
      oasisContract.offer(
        payAmount,
        payTokenAddress,
        buyAmount,
        buyTokenAddress,
        pos,
        overrides
      ),
      this.get('web3')
    );
  }
}

function daiValueForContract(amount) {
  return getCurrency(amount, DAI).toEthersBigNumber('wei');
}
